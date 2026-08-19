import * as THREE from 'three';
import { MAX_CSG_TRIANGLES } from '../config.js';

/**
 * Constructive solid geometry for generated models.
 *
 * Some shapes are defined by what has been removed: a wheel well cut from a
 * chassis block, a hollow cockpit drilled into a fuselage, vent holes punched
 * through an exhaust. Approximating those by arranging primitives around the
 * hole is fiddly and usually wrong at the seams; a boolean states the intent
 * directly.
 *
 * Backed by three-bvh-csg. That library plus its three-mesh-bvh dependency is
 * ~360 KB, so it is imported on demand — only when the generated code actually
 * references CSG — rather than on every page load.
 */

/** Methods exposed to generated code, for prompt text and validation. */
export const CSG_METHODS = ['subtract', 'union', 'intersect', 'subtractAll'];

let libraryPromise = null;

/** Loads three-bvh-csg once and caches the promise. */
export function loadCsgLibrary() {
  if (!libraryPromise) {
    libraryPromise = import('three-bvh-csg').catch((err) => {
      // Let a later attempt retry rather than caching the failure forever.
      libraryPromise = null;
      throw new Error(`Could not load the CSG library: ${err.message}`);
    });
  }

  return libraryPromise;
}

/** Triangle count of a geometry, indexed or not. */
function triangleCount(geometry) {
  if (!geometry) return 0;
  if (geometry.index) return geometry.index.count / 3;
  return (geometry.attributes.position?.count ?? 0) / 3;
}

/**
 * Builds the CSG helper bound to a loaded library.
 *
 * Operands are read in their own local space and the result is returned with an
 * identity transform, so dropping the result into the parent that would have
 * held the base mesh puts it exactly where the base mesh was.
 */
export async function createCsgHelper() {
  const { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } = await loadCsgLibrary();

  const evaluator = new Evaluator();
  // One material on the result keeps it mergeable and simple to export;
  // grouped output would produce an array material instead.
  evaluator.useGroups = false;

  /** Wraps a mesh as a Brush carrying its own transform. */
  function toBrush(mesh, label) {
    if (!mesh || !mesh.isMesh || !mesh.geometry) {
      throw new Error(`CSG ${label} must be a THREE.Mesh with geometry.`);
    }

    // three-bvh-csg needs indexed geometry to build its BVH.
    let geometry = mesh.geometry;
    if (!geometry.index) {
      geometry = geometry.clone();
      const count = geometry.attributes.position.count;
      geometry.setIndex(Array.from({ length: count }, (_, i) => i));
    }

    const brush = new Brush(geometry, mesh.material);
    mesh.updateMatrix();
    brush.matrix.copy(mesh.matrix);
    brush.matrix.decompose(brush.position, brush.quaternion, brush.scale);
    brush.updateMatrixWorld(true);
    return brush;
  }

  /** Rejects operations big enough to lock the tab for seconds. */
  function assertBudget(a, b) {
    const total = triangleCount(a.geometry) + triangleCount(b.geometry);
    if (total > MAX_CSG_TRIANGLES) {
      throw new Error(
        `CSG inputs total ${Math.round(total).toLocaleString()} triangles, over the ` +
        `${MAX_CSG_TRIANGLES.toLocaleString()} limit. Use simpler shapes for boolean operands.`,
      );
    }
  }

  function operate(base, tool, operation, label) {
    assertBudget(base, tool);

    const result = evaluator.evaluate(toBrush(base, 'base'), toBrush(tool, 'tool'), operation);
    if (!result?.geometry || triangleCount(result.geometry) === 0) {
      throw new Error(
        `CSG ${label} produced empty geometry — check that the shapes actually overlap.`,
      );
    }

    // Hand back a plain Mesh at identity, positioned by its baked geometry.
    const mesh = new THREE.Mesh(result.geometry, base.material);
    mesh.name = base.name || 'CSG_Result';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  return {
    /** base minus tool — wheel wells, drilled cockpits, punched holes. */
    subtract: (base, tool) => operate(base, tool, SUBTRACTION, 'subtract'),

    /** Welds two solids into one watertight mesh. */
    union: (base, tool) => operate(base, tool, ADDITION, 'union'),

    /** Keeps only the overlapping volume. */
    intersect: (base, tool) => operate(base, tool, INTERSECTION, 'intersect'),

    /**
     * Subtracts several tools in sequence, e.g. four wheel wells from one
     * chassis. Each step feeds the next, so the tools may overlap.
     */
    subtractAll(base, tools) {
      if (!Array.isArray(tools)) throw new Error('CSG.subtractAll expects an array of tools.');

      return tools.reduce((current, tool) => operate(current, tool, SUBTRACTION, 'subtractAll'), base);
    },
  };
}
