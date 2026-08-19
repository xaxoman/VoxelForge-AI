import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { MAX_HULL_POINTS } from '../config.js';

/**
 * Generates invisible collision proxy meshes named with the suffixes Godot's
 * glTF importer understands.
 *
 * Godot's naming rules matter here: `-col` / `-convcol` KEEP the visual mesh
 * and add a collision body beside it, which would leave a solid box rendered
 * over the model. The `-only` variants delete the visual and keep just the
 * shape, which is what a dedicated proxy wants.
 *
 *   -colonly      ConcavePolygonShape3D (trimesh), visual removed
 *   -convcolonly  ConvexPolygonShape3D, visual removed
 *
 * Unity ignores all of these; `integrations/unity/` ships an AssetPostprocessor
 * that reads the same suffixes so both engines behave the same way.
 */

/** Suffixes appended to proxy names, keyed by shape kind. */
export const COLLISION_SUFFIX = {
  convex: '-convcolonly',
  trimesh: '-colonly',
};

/**
 * Strips any existing collision suffix so re-tagging a name can't stack them
 * (`Chassis-convcolonly-convcolonly`).
 */
function stripCollisionSuffix(name) {
  return name.replace(/-(conv)?col(only)?$/i, '');
}

/** Names a proxy after its source part, falling back to a stable default. */
function proxyName(sourceName, kind, index) {
  const base = stripCollisionSuffix(sourceName || '').trim() || `Part_${index}`;
  return `${base}${COLLISION_SUFFIX[kind]}`;
}

/**
 * Collects every vertex under `object`, expressed in `root`'s local space.
 *
 * Working in root-local space means the proxy can be parented to the root and
 * line up regardless of how the root itself has been moved or rotated.
 *
 * @returns {THREE.Vector3[]}
 */
function collectVertices(object, root) {
  root.updateMatrixWorld(true);
  const toRootLocal = root.matrixWorld.clone().invert();
  const points = [];

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const position = child.geometry.attributes.position;
    if (!position) return;

    // World -> root-local for each vertex of this mesh.
    const toRoot = toRootLocal.clone().multiply(child.matrixWorld);
    for (let i = 0; i < position.count; i += 1) {
      points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toRoot));
    }
  });

  return points;
}

/**
 * Uniformly thins a point cloud so hull construction stays fast on dense
 * meshes. A convex hull only depends on extreme points, so a strided sample
 * changes the result very little.
 */
function limitPoints(points) {
  if (points.length <= MAX_HULL_POINTS) return points;

  const stride = Math.ceil(points.length / MAX_HULL_POINTS);
  return points.filter((_, index) => index % stride === 0);
}

/** Proxies are never rendered; they exist purely to be exported. */
function makeProxy(geometry, name) {
  const proxy = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.name = name;
  proxy.visible = false;
  proxy.userData.isCollisionProxy = true;
  return proxy;
}

/** Axis-aligned box enclosing the given points. */
function buildBoxProxy(points, name) {
  if (points.length === 0) return null;

  const box = new THREE.Box3().setFromPoints(points);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // A degenerate axis (a perfectly flat part) would produce an unusable shape.
  const proxy = makeProxy(
    new THREE.BoxGeometry(
      Math.max(size.x, 0.01),
      Math.max(size.y, 0.01),
      Math.max(size.z, 0.01),
    ),
    name,
  );
  proxy.position.copy(center);
  return proxy;
}

/** Convex hull wrapping the given points. */
function buildConvexProxy(points, name) {
  // ConvexHull needs 4 non-coplanar points to form a volume.
  if (points.length < 4) return null;

  try {
    return makeProxy(new ConvexGeometry(limitPoints(points)), name);
  } catch (err) {
    // Degenerate input (all points coplanar/collinear) — fall back to a box
    // rather than losing collision for that part entirely.
    console.warn(`Convex hull failed for "${name}", falling back to a box.`, err);
    return buildBoxProxy(points, name);
  }
}

/**
 * Builds collision proxies for a model.
 *
 * @param {THREE.Object3D} model  The generated model root.
 * @param {'none'|'box'|'convex'|'parts'} mode
 *   none   - no proxies
 *   box    - one axis-aligned box around the whole model
 *   convex - one convex hull around the whole model
 *   parts  - one convex hull per top-level child (wheels, limbs, turrets…)
 * @returns {THREE.Mesh[]} Proxies, ready to be parented to `model`.
 */
export function buildCollisionProxies(model, mode) {
  if (!model || mode === 'none' || !mode) return [];

  if (mode === 'parts') {
    const children = model.children.filter((child) => !child.userData.isCollisionProxy);

    return children
      .map((child, index) => {
        const points = collectVertices(child, model);
        return buildConvexProxy(points, proxyName(child.name, 'convex', index));
      })
      .filter(Boolean);
  }

  const points = collectVertices(model, model);
  const name = proxyName(model.name || 'Model', 'convex', 0);
  const proxy = mode === 'box'
    ? buildBoxProxy(points, name)
    : buildConvexProxy(points, name);

  return proxy ? [proxy] : [];
}

/** Releases geometry/material owned by proxies once an export is done. */
export function disposeProxies(proxies) {
  proxies.forEach((proxy) => {
    proxy.geometry?.dispose();
    proxy.material?.dispose();
  });
}
