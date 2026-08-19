import * as THREE from 'three';
import {
  createTextureLibrary,
  TEXTURE_FACTORIES,
  TEXTURE_RESOLUTION,
} from '../textures/procedural.js';
import { createCsgHelper, CSG_METHODS } from '../geometry/csg.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * Strips comments and string literals so code analysis can't be fooled by an
 * API name that only appears inside a comment or a message string.
 */
function stripNonCode(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

/**
 * Finds `new THREE.Something(...)` calls naming a class that does not exist.
 *
 * Language models occasionally invent plausible-sounding Three.js classes —
 * `PrismGeometry`, `RoundedBoxGeometry`, `TextGeometry` — which only fail once
 * the generated code runs. Catching them up front turns a bare
 * "X is not a constructor" into a precise, complete list that can be handed
 * back to the model for a single corrective pass.
 *
 * Only constructor calls are inspected: that is the failure mode in practice,
 * and it keeps the check from flagging valid property or constant access.
 *
 * @param {string} source Generated code.
 * @returns {string[]} Unique unknown class names, in order of first use.
 */
export function findUnknownThreeClasses(source) {
  const code = stripNonCode(source);
  const unknown = [];

  for (const match of code.matchAll(/\bnew\s+THREE\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    const name = match[1];
    if (THREE[name] === undefined && !unknown.includes(name)) unknown.push(name);
  }

  return unknown;
}

/**
 * Finds `TEX.something(...)` calls naming a texture factory that does not exist.
 *
 * Same failure mode as invented THREE classes, same treatment: caught before
 * execution so the repair pass gets a precise diagnostic.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function findUnknownTextureFactories(source) {
  const code = stripNonCode(source);
  const unknown = [];

  for (const match of code.matchAll(/\bTEX\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[1];
    if (!TEXTURE_FACTORIES.includes(name) && !unknown.includes(name)) unknown.push(name);
  }

  return unknown;
}

/**
 * Finds `CSG.something(...)` calls naming an operation that does not exist.
 * @param {string} source
 * @returns {string[]}
 */
export function findUnknownCsgMethods(source) {
  const code = stripNonCode(source);
  const unknown = [];

  for (const match of code.matchAll(/\bCSG\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[1];
    if (!CSG_METHODS.includes(name) && !unknown.includes(name)) unknown.push(name);
  }

  return unknown;
}

/** True when the code actually references CSG, gating the 360 KB import. */
export function usesCsg(source) {
  return /\bCSG\s*\./.test(stripNonCode(source));
}

/** Texture canvas edge length for a detail level, defaulting to high. */
function resolutionFor(detailLevel) {
  return TEXTURE_RESOLUTION[detailLevel] ?? TEXTURE_RESOLUTION.high;
}

/** Every geometry class the core THREE namespace actually exports. */
export function listAvailableGeometries() {
  return Object.keys(THREE)
    .filter((name) => /Geometry$/.test(name))
    .sort();
}

/**
 * Evaluates the `createModel(THREE)` source returned by Gemini and returns the
 * resulting object.
 *
 * The generated code is only ever executed against the shared THREE namespace —
 * it receives no other bindings.
 *
 * @param {string} codeString Source defining `async function createModel(THREE, TEX)`.
 * @param {{detailLevel?: string}} [options] Drives procedural texture resolution.
 * @returns {Promise<THREE.Object3D>}
 * @throws {Error} With `.isApiError` set when the code names a class or texture
 *   factory that does not exist, so callers can route it to a repair attempt.
 */
export async function buildModelFromCode(codeString, options = {}) {
  const unknownClasses = findUnknownThreeClasses(codeString);
  const unknownFactories = findUnknownTextureFactories(codeString);
  const unknownCsg = findUnknownCsgMethods(codeString);

  if (unknownClasses.length > 0 || unknownFactories.length > 0 || unknownCsg.length > 0) {
    const names = [
      ...unknownClasses.map((name) => `THREE.${name}`),
      ...unknownFactories.map((name) => `TEX.${name}`),
      ...unknownCsg.map((name) => `CSG.${name}`),
    ];
    const error = new Error(
      `The generated code uses ${names.join(', ')}, which ${names.length > 1 ? 'do' : 'does'} not exist.`,
    );
    error.isApiError = true;
    error.unknownClasses = unknownClasses;
    error.unknownFactories = unknownFactories;
    error.unknownCsgMethods = unknownCsg;
    throw error;
  }

  // TEX and CSG arrive as extra arguments, so a `createModel(THREE)` written
  // without them keeps working — JavaScript ignores surplus arguments.
  const textures = createTextureLibrary(resolutionFor(options.detailLevel));

  // Booleans are synchronous once running, so the library has to be resolved
  // before the generated code starts — but only if it actually asked for it.
  const csg = usesCsg(codeString) ? await createCsgHelper() : null;

  const executable = new AsyncFunction(
    'THREE',
    'TEX',
    'CSG',
    `${codeString}\nreturn createModel(THREE, TEX, CSG);`,
  );
  const model = await executable(THREE, textures, csg);

  if (!model || !model.isObject3D) {
    throw new Error('Generated code did not return a valid Three.js object.');
  }

  return model;
}
