import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Collapses meshes that share a material into one mesh each, so a model built
 * from 80 primitives issues a handful of draw calls instead of 80.
 *
 * Generated models never reuse material *instances* — every part gets its own
 * `new THREE.MeshStandardMaterial(...)` — so grouping by object identity would
 * merge nothing. Parts are grouped by a signature of the properties that
 * actually affect rendering instead.
 *
 * The trade-off is real and deliberate: merging discards the per-part node
 * hierarchy (`Wheel_Front_Left`, `Cockpit_Glass`), which is exactly what you
 * need for rigging and animation. It is opt-in for that reason.
 */

/** Rounded so float noise can't split otherwise-identical materials. */
const round = (value) => Number(value ?? 0).toFixed(4);

/**
 * Builds a key describing everything about a material that affects how it
 * renders. Two meshes with equal keys are safe to draw in one call.
 */
export function materialSignature(material) {
  if (!material) return 'none';

  return [
    material.type,
    material.color?.getHexString() ?? '-',
    round(material.metalness),
    round(material.roughness),
    material.emissive?.getHexString() ?? '-',
    round(material.emissiveIntensity),
    material.transparent ? 't' : 'o',
    round(material.opacity),
    material.side,
    material.flatShading ? 'flat' : 'smooth',
    material.vertexColors ? 'vc' : '-',
    material.wireframe ? 'wire' : '-',
    material.map?.uuid ?? '-',
  ].join('|');
}

/** Distinct material groups in a model — i.e. draw calls after merging. */
export function countMaterialGroups(model) {
  const keys = new Set();

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.userData.isCollisionProxy) return;

    if (Array.isArray(child.material)) {
      // Multi-material meshes are left alone, so each is its own draw call.
      child.material.forEach((m) => keys.add(`multi:${child.uuid}:${materialSignature(m)}`));
    } else {
      keys.add(materialSignature(child.material));
    }
  });

  return keys.size;
}

/** Longest shared prefix across names, e.g. Wheel_Front_Left/Wheel_Rear -> "Wheel_". */
function commonPrefix(names) {
  if (names.length === 0) return '';

  let prefix = names[0];
  for (const name of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < name.length && prefix[i] === name[i]) i += 1;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }

  return prefix;
}

/**
 * Names a merged group after the parts that went into it: a shared prefix when
 * the parts are clearly a family (all the wheels), otherwise the name of the
 * part contributing the most geometry.
 */
function mergedName(entries, index) {
  const names = entries.map((entry) => entry.name).filter(Boolean);

  // Trim a partial word so "Wheel_Front_" becomes "Wheel", not "Wheel_Front_".
  const shared = commonPrefix(names).replace(/[^A-Za-z0-9]+$/, '');
  if (shared.length >= 3) return `${shared}_Merged`;

  const dominant = entries.reduce(
    (best, entry) => (entry.triangles > best.triangles ? entry : best),
    entries[0],
  );

  const base = (dominant.name || `Material_${index + 1}`).replace(/_Merged$/, '');
  return `${base}_Merged`;
}

/** Triangle count of a geometry, indexed or not. */
function triangleCount(geometry) {
  if (geometry.index) return geometry.index.count / 3;
  return (geometry.attributes.position?.count ?? 0) / 3;
}

/**
 * Coerces a set of geometries into a shape `mergeGeometries` will accept:
 * an identical attribute set on each, and indexing that is consistently
 * present or consistently absent.
 *
 * @returns {THREE.BufferGeometry[]|null} null when they cannot be reconciled.
 */
function normalizeForMerge(geometries, scratch) {
  let shared = new Set(Object.keys(geometries[0].attributes));
  for (const geometry of geometries) {
    const names = new Set(Object.keys(geometry.attributes));
    shared = new Set([...shared].filter((name) => names.has(name)));
  }

  if (!shared.has('position')) return null;

  const indexed = geometries.filter((geometry) => geometry.index !== null).length;
  const mixed = indexed !== 0 && indexed !== geometries.length;

  return geometries.map((geometry) => {
    // Only de-index when the group is mixed; three.js primitives are all
    // indexed, so the common case avoids the vertex inflation entirely.
    let out = geometry;
    if (mixed && geometry.index !== null) {
      out = geometry.toNonIndexed();
      scratch.push(geometry);
    }

    Object.keys(out.attributes)
      .filter((name) => !shared.has(name))
      .forEach((name) => out.deleteAttribute(name));

    out.morphAttributes = {};
    return out;
  });
}

/**
 * Builds a draw-call-optimised copy of a model.
 *
 * The original is never modified — the returned root owns fresh geometry and
 * shares the original materials, and carries the same local transform so it
 * exports identically to the unmerged model.
 *
 * @param {THREE.Object3D} model
 * @returns {{root: THREE.Group, before: number, after: number}}
 */
export function buildMergedModel(model) {
  model.updateMatrixWorld(true);
  const toModelLocal = model.matrixWorld.clone().invert();

  /** @type {Map<string, {material: THREE.Material, entries: object[]}>} */
  const groups = new Map();
  const unmergeable = [];
  let before = 0;

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.userData.isCollisionProxy) return;
    before += 1;

    // Baking the child's transform relative to the model lets separate parts
    // share one geometry buffer while staying where the artist put them.
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(toModelLocal.clone().multiply(child.matrixWorld));

    if (Array.isArray(child.material)) {
      unmergeable.push({ geometry, material: child.material, name: child.name });
      return;
    }

    const key = materialSignature(child.material);
    if (!groups.has(key)) groups.set(key, { material: child.material, entries: [] });

    groups.get(key).entries.push({
      geometry,
      name: child.name,
      triangles: triangleCount(geometry),
    });
  });

  const root = new THREE.Group();
  root.name = model.name || 'Root_Model';
  model.updateMatrix();
  model.matrix.decompose(root.position, root.quaternion, root.scale);

  const scratch = [];

  [...groups.values()].forEach((group, index) => {
    const { material, entries } = group;

    // A lone mesh is already one draw call; keep its original name.
    if (entries.length === 1) {
      const mesh = new THREE.Mesh(entries[0].geometry, material);
      mesh.name = entries[0].name || `Part_${index + 1}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      return;
    }

    const normalized = normalizeForMerge(entries.map((entry) => entry.geometry), scratch);
    const merged = normalized ? mergeGeometries(normalized, false) : null;

    if (!merged) {
      // Reconciling failed (mismatched attributes, or a merge three.js
      // rejected). Keep the parts separate rather than losing them.
      console.warn(
        `Could not merge ${entries.length} mesh(es) sharing a material; keeping them separate.`,
      );
      entries.forEach((entry, i) => {
        const mesh = new THREE.Mesh(entry.geometry, material);
        mesh.name = entry.name || `Part_${index + 1}_${i + 1}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      });
      return;
    }

    const mesh = new THREE.Mesh(merged, material);
    mesh.name = mergedName(entries, index);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    // The per-part geometries have been copied into the merged buffer.
    entries.forEach((entry) => scratch.push(entry.geometry));
    normalized.forEach((geometry) => scratch.push(geometry));
  });

  unmergeable.forEach((entry, index) => {
    const mesh = new THREE.Mesh(entry.geometry, entry.material);
    mesh.name = entry.name || `MultiMaterial_${index + 1}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });

  // Intermediates are dead once their data is inside a merged buffer. Anything
  // still referenced by a mesh in `root` is untouched.
  const live = new Set();
  root.traverse((child) => { if (child.isMesh) live.add(child.geometry); });
  scratch.forEach((geometry) => { if (!live.has(geometry)) geometry.dispose(); });

  return { root, before, after: root.children.length };
}

/**
 * Releases the geometry owned by a merged root. Materials are shared with the
 * live model and are deliberately left alone.
 */
export function disposeMergedModel(root) {
  root.traverse((child) => {
    if (child.isMesh) child.geometry?.dispose();
  });
}
