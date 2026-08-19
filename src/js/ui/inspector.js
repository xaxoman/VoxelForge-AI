import { dom } from '../dom.js';

/** Gizmo buttons keyed by the TransformControls mode they select. */
const GIZMO_MODES = {
  'gizmo-none': null,
  'gizmo-translate': 'translate',
  'gizmo-rotate': 'rotate',
  'gizmo-scale': 'scale',
};

/** Keyboard shortcuts, matching the three.js editor's conventions. */
const SHORTCUTS = { q: 'gizmo-none', w: 'gizmo-translate', e: 'gizmo-rotate', r: 'gizmo-scale' };

/** A mesh may carry an array of materials; the inspector edits the first. */
function primaryMaterial(mesh) {
  if (!mesh?.material) return null;
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

/** Triangle count of a mesh, indexed or not. */
function triangleCount(mesh) {
  const geometry = mesh?.geometry;
  if (!geometry) return 0;
  if (geometry.index) return geometry.index.count / 3;
  return (geometry.attributes.position?.count ?? 0) / 3;
}

/**
 * Wires the selection inspector: reads the selected part's material into the
 * controls, and writes edits straight back onto the live material.
 *
 * Edits apply to the material instance, so parts that genuinely share one
 * change together — which is what you want when recolouring a car's panels.
 *
 * @param {object} options
 * @param {import('../viewer/selection.js').SelectionManager} options.selection
 * @param {() => void} [options.onChange] Called after an edit that affects stats.
 */
export function initInspector({ selection, onChange }) {
  let current = null;
  let gizmoMode = null;

  /** Pushes the selected part's current values into the controls. */
  function render(mesh) {
    current = mesh;

    dom.inspectorPanel.hidden = !mesh;
    if (!mesh) return;

    dom.inspectorEmpty.hidden = true;
    dom.inspectorBody.hidden = false;
    dom.selectedName.textContent = mesh.name || '(unnamed)';

    const material = primaryMaterial(mesh);

    // Not every material type carries every channel; disable what is absent
    // rather than writing properties the shader will ignore.
    const hasColor = Boolean(material?.color);
    dom.partColor.disabled = !hasColor;
    if (hasColor) {
      const hex = `#${material.color.getHexString()}`;
      dom.partColor.value = hex;
      dom.partColorHex.textContent = hex;
    } else {
      dom.partColorHex.textContent = 'n/a';
    }

    const hasPbr = material && 'metalness' in material;
    dom.partMetalness.disabled = !hasPbr;
    dom.partRoughness.disabled = !hasPbr;
    dom.partMetalness.value = hasPbr ? material.metalness : 0;
    dom.partRoughness.value = hasPbr ? material.roughness : 0;
    dom.partMetalnessValue.textContent = Number(dom.partMetalness.value).toFixed(2);
    dom.partRoughnessValue.textContent = Number(dom.partRoughness.value).toFixed(2);

    // emissiveIntensity defaults to 1 even when the emissive colour is black,
    // which emits nothing — report what the surface actually does.
    const hasEmissive = Boolean(material?.emissive);
    const emitting = hasEmissive && material.emissive.getHex() !== 0;
    dom.partEmissive.disabled = !hasEmissive;
    dom.partEmissive.value = emitting ? material.emissiveIntensity ?? 0 : 0;
    dom.partEmissiveValue.textContent = Number(dom.partEmissive.value).toFixed(2);

    renderVisibility(mesh);

    const triangles = Math.round(triangleCount(mesh)).toLocaleString();
    dom.partStats.textContent = `${triangles} triangles · ${material?.type ?? 'no material'}`;
  }

  function renderVisibility(mesh) {
    const visible = mesh.visible;
    dom.partVisibilityLabel.textContent = visible ? 'Visible' : 'Hidden';
    dom.partVisibility.classList.toggle('active-toggle', !visible);
    dom.partVisibility
      .querySelector('use')
      .setAttribute('href', visible ? '#i-eye' : '#i-eye-off');
  }

  /** Applies an edit to the selected material and refreshes derived UI. */
  function editMaterial(apply) {
    const material = primaryMaterial(current);
    if (!material) return;

    apply(material);
    material.needsUpdate = true;
    onChange?.();
  }

  function setGizmo(buttonId) {
    gizmoMode = GIZMO_MODES[buttonId];
    selection.setGizmoEnabled(Boolean(gizmoMode));
    if (gizmoMode) selection.setMode(gizmoMode);

    Object.keys(GIZMO_MODES).forEach((id) => {
      dom.gizmoButtons[id].classList.toggle('active-toggle', id === buttonId);
    });
  }

  // --- Wiring ---

  selection.onChange((mesh) => {
    render(mesh);
    // Re-assert the chosen gizmo mode for the newly selected part.
    if (mesh && gizmoMode) selection.setGizmoEnabled(true);
  });

  dom.inspectorClose.addEventListener('click', () => selection.deselect());

  dom.partColor.addEventListener('input', (event) => {
    const hex = event.target.value;
    dom.partColorHex.textContent = hex;
    editMaterial((material) => material.color.set(hex));
  });

  dom.partMetalness.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    dom.partMetalnessValue.textContent = value.toFixed(2);
    editMaterial((material) => { material.metalness = value; });
  });

  dom.partRoughness.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    dom.partRoughnessValue.textContent = value.toFixed(2);
    editMaterial((material) => { material.roughness = value; });
  });

  dom.partEmissive.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    dom.partEmissiveValue.textContent = value.toFixed(2);
    editMaterial((material) => {
      material.emissiveIntensity = value;
      // An emissive channel left black stays black whatever the intensity, so
      // seed it from the base colour the first time it is raised.
      if (material.emissive && material.emissive.getHex() === 0 && value > 0) {
        material.emissive.copy(material.color);
      }
    });
  });

  dom.partVisibility.addEventListener('click', () => {
    if (!current) return;
    current.visible = !current.visible;
    renderVisibility(current);
    selection.refresh();
    onChange?.();
  });

  Object.entries(dom.gizmoButtons).forEach(([id, button]) => {
    button.addEventListener('click', () => setGizmo(id));
  });

  document.addEventListener('keydown', (event) => {
    // Never steal keys from the prompt or the API key field.
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (event.key === 'Escape') {
      selection.deselect();
      return;
    }

    const shortcut = SHORTCUTS[event.key.toLowerCase()];
    if (shortcut && selection.getSelected()) setGizmo(shortcut);
  });

  setGizmo('gizmo-none');
  render(null);

  return { render };
}
