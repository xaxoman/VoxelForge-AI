import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

/** Movement in pixels above which a pointer gesture counts as an orbit, not a click. */
const CLICK_SLOP = 5;

/**
 * Click-to-select and manual transform for parts of the generated model.
 *
 * The selection outline and the transform gizmo both live on the scene rather
 * than inside the model group. That keeps them out of everything that walks the
 * model — exports, collision hulls, geometry merging and the triangle counter —
 * without any of those needing to know this exists.
 */
export class SelectionManager {
  /**
   * @param {object} options
   * @param {THREE.Scene} options.scene
   * @param {THREE.Camera} options.camera
   * @param {THREE.WebGLRenderer} options.renderer
   * @param {object} options.orbitControls Disabled while the gizmo is dragged.
   * @param {() => THREE.Object3D} options.getModel Current model root.
   */
  constructor({ scene, camera, renderer, orbitControls, getModel }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    this.getModel = getModel;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selected = null;
    this.listeners = new Set();

    this.outline = new THREE.BoxHelper(new THREE.Object3D(), 0x6366f1);
    this.outline.visible = false;
    scene.add(this.outline);

    this.transform = new TransformControls(camera, renderer.domElement);
    this.transform.setSize(0.75);
    this.transform.visible = false;
    this.transform.enabled = false;
    scene.add(this.transform);

    // Orbiting while dragging a gizmo axis would fight the drag.
    this.transform.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });

    this.transform.addEventListener('objectChange', () => {
      this.outline.update();
      this.emit();
    });

    this.bindPointer();
  }

  /** Distinguishes a select click from an orbit drag by distance travelled. */
  bindPointer() {
    const canvas = this.renderer.domElement;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      startY = event.clientY;
    });

    canvas.addEventListener('pointerup', (event) => {
      const travelled = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (travelled > CLICK_SLOP) return;

      // A gizmo drag ends with its own pointerup; that is not a selection.
      if (this.transform.dragging) return;

      this.selectAtPointer(event);
    });
  }

  /** Raycasts the model under the pointer and selects the nearest mesh. */
  selectAtPointer(event) {
    const model = this.getModel();
    if (!model || model.children.length === 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Only the model is pickable — never the gizmo, grid, floor or outline.
    const hits = this.raycaster
      .intersectObject(model, true)
      .filter((hit) => hit.object.isMesh && hit.object.visible);

    if (hits.length === 0) {
      this.deselect();
      return;
    }

    this.select(hits[0].object);
  }

  /** @param {THREE.Mesh} mesh */
  select(mesh) {
    if (!mesh || !mesh.isMesh) return;

    this.selected = mesh;
    this.outline.setFromObject(mesh);
    this.outline.visible = true;
    this.transform.attach(mesh);
    this.transform.visible = this.transform.enabled;
    this.emit();
  }

  deselect() {
    if (!this.selected) return;

    this.selected = null;
    this.outline.visible = false;
    this.transform.detach();
    this.transform.visible = false;
    this.emit();
  }

  getSelected() {
    return this.selected;
  }

  /** @param {'translate'|'rotate'|'scale'} mode */
  setMode(mode) {
    this.transform.setMode(mode);
  }

  /** Shows or hides the gizmo without dropping the selection. */
  setGizmoEnabled(enabled) {
    this.transform.enabled = enabled;
    this.transform.visible = enabled && Boolean(this.selected);
  }

  /** Re-syncs the outline after the selected object changed elsewhere. */
  refresh() {
    if (!this.selected) return;

    this.outline.setFromObject(this.selected);
    this.outline.update();
  }

  /**
   * Called before a model is replaced. The outgoing model's geometry is about
   * to be disposed, so anything pointing into it has to let go first.
   */
  clearForNewModel() {
    this.deselect();
  }

  /** @param {(selected: THREE.Mesh|null) => void} listener */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach((listener) => listener(this.selected));
  }
}
