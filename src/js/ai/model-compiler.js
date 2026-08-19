import * as THREE from 'three';

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
 * @param {string} codeString Source defining `async function createModel(THREE)`.
 * @returns {Promise<THREE.Object3D>}
 * @throws {Error} With `.isApiError` set when the code names a class that
 *   does not exist, so callers can route it to a repair attempt.
 */
export async function buildModelFromCode(codeString) {
  const unknown = findUnknownThreeClasses(codeString);
  if (unknown.length > 0) {
    const list = unknown.map((name) => `THREE.${name}`).join(', ');
    const error = new Error(
      `The generated code uses ${list}, which ${unknown.length > 1 ? 'do' : 'does'} not exist in Three.js.`,
    );
    error.isApiError = true;
    error.unknownClasses = unknown;
    throw error;
  }

  const executable = new AsyncFunction('THREE', `${codeString}\nreturn createModel(THREE);`);
  const model = await executable(THREE);

  if (!model || !model.isObject3D) {
    throw new Error('Generated code did not return a valid Three.js object.');
  }

  return model;
}
