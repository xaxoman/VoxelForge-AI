import * as THREE from 'three';
import { createScene } from './scene.js';
import { createLighting, applyLightingPreset } from './lighting.js';
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

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.isWireframe = false;
    this.isAutoRotating = false;

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
    this.scene.remove(this.modelGroup);
    this.modelGroup = model;
    this.scene.add(this.modelGroup);

    if (this.isWireframe) this.applyWireframe();
    this.frameModel(this.modelGroup);
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
