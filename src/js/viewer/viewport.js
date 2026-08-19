import * as THREE from 'three';
import { createScene } from './scene.js';
import { createLighting, applyLightingPreset, setEnvironmentActive } from './lighting.js';
import { EnvironmentManager } from './environment.js';
import { SelectionManager } from './selection.js';
import { countMaterialGroups } from '../export/merge.js';

const TURNTABLE_SPEED = 0.008;

/**
 * Owns everything about the 3D stage: the render loop, the currently displayed
 * model, and the viewport toggles (wireframe, turntable, lighting preset).
 *
 * The rest of the app never touches Three.js objects directly — it swaps models
 * in through `setModel()` and reads stats back out through `getStats()`.
 */
export class Viewport {
  /** @param {HTMLElement} container Element the canvas is mounted into. */
  constructor(container) {
    const { scene, camera, renderer, controls } = createScene(container);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.lights = createLighting(scene);
    this.environment = new EnvironmentManager(renderer, scene);

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.selection = new SelectionManager({
      scene,
      camera,
      renderer,
      orbitControls: controls,
      getModel: () => this.modelGroup,
    });

    this.isWireframe = false;
    this.isAutoRotating = false;

    // Replaced models are released, but an export borrows the live model's
    // materials — so disposal waits while one is in flight.
    this.disposalHeld = false;
    this.pendingDisposal = [];

    window.addEventListener('resize', () => this.handleResize());
  }

  /** Starts the requestAnimationFrame loop. Call once, after construction. */
  start() {
    const renderFrame = () => {
      requestAnimationFrame(renderFrame);

      if (this.isAutoRotating && this.modelGroup) {
        this.modelGroup.rotation.y += TURNTABLE_SPEED;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    renderFrame();
  }

  /** True once a generated model has been mounted. */
  hasModel() {
    return Boolean(this.modelGroup && this.modelGroup.children.length > 0);
  }

  /** The group handed to the exporters. */
  getModel() {
    return this.modelGroup;
  }

  /**
   * Replaces the displayed model, re-applying the current wireframe state and
   * re-framing the camera around the new geometry.
   *
   * @param {THREE.Object3D} model
   */
  setModel(model) {
    const previous = this.modelGroup;

    // The outgoing model is about to be disposed, so nothing may still point
    // into it — including the selection outline and transform gizmo.
    this.selection.clearForNewModel();

    this.scene.remove(previous);
    this.modelGroup = model;
    this.scene.add(this.modelGroup);

    if (this.isWireframe) this.applyWireframe();
    this.frameModel(this.modelGroup);

    this.release(previous);
  }

  /**
   * Frees GPU resources owned by a discarded model.
   *
   * Procedural textures make this matter: a handful of 512px canvases is
   * several megabytes per generation, which would otherwise accumulate for the
   * life of the tab.
   */
  release(object) {
    if (!object) return;

    if (this.disposalHeld) {
      this.pendingDisposal.push(object);
      return;
    }

    object.traverse((child) => {
      if (!child.isMesh) return;

      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.filter(Boolean).forEach((material) => {
        // Any map slot may hold a canvas texture; free them all.
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
  }

  /**
   * Defers disposal while an export borrows the live model's materials.
   * Releasing the hold flushes anything that piled up behind it.
   *
   * @param {boolean} held
   */
  holdDisposal(held) {
    this.disposalHeld = held;
    if (held) return;

    const queued = this.pendingDisposal;
    this.pendingDisposal = [];
    queued.forEach((object) => this.release(object));
  }

  /** Sits the object on the floor and pulls the camera back to fit it. */
  frameModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    object.position.y -= box.min.y;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;
    cameraDistance = Math.max(cameraDistance, 3.2);

    this.camera.position.set(cameraDistance * 0.8, cameraDistance * 0.6, cameraDistance);
    this.controls.target.set(0, size.y / 2, 0);
    this.controls.update();
  }

  /** @returns {boolean} the new wireframe state. */
  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.applyWireframe();
    return this.isWireframe;
  }

  /** Pushes `isWireframe` onto every material in the current model. */
  applyWireframe() {
    this.modelGroup.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => { material.wireframe = this.isWireframe; });
      } else {
        child.material.wireframe = this.isWireframe;
      }
    });
  }

  /** @returns {boolean} the new turntable state. */
  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  /** @param {keyof import('../config.js').LIGHTING_PRESETS} presetName */
  setLightingPreset(presetName) {
    applyLightingPreset(this.scene, this.lights, presetName);
  }

  /**
   * Swaps the reflection environment and rebalances the directional rig so the
   * two light sources don't stack into an overexposed scene.
   *
   * @param {string} id Key into ENVIRONMENTS.
   * @param {(status: string) => void} [onStatus]
   */
  async setEnvironment(id, onStatus) {
    const result = await this.environment.apply(id, onStatus);
    setEnvironmentActive(this.lights, result.id !== 'none');
    return result;
  }

  /**
   * @returns {{triangles: number, meshes: number, materialGroups: number}}
   * Live mesh diagnostics. `materialGroups` is how many draw calls the model
   * would cost after merging by material.
   */
  getStats() {
    let triangles = 0;
    let meshes = 0;

    this.modelGroup.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;

      meshes += 1;
      if (child.geometry.index) {
        triangles += child.geometry.index.count / 3;
      } else if (child.geometry.attributes.position) {
        triangles += child.geometry.attributes.position.count / 3;
      }
    });

    return {
      triangles: Math.round(triangles),
      meshes,
      materialGroups: countMaterialGroups(this.modelGroup),
    };
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
