import * as THREE from 'three';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * Evaluates the `createModel(THREE)` source returned by Gemini and returns the
 * resulting object.
 *
 * The generated code is only ever executed against the shared THREE namespace —
 * it receives no other bindings.
 *
 * @param {string} codeString Source defining `async function createModel(THREE)`.
 * @returns {Promise<THREE.Object3D>}
 */
export async function buildModelFromCode(codeString) {
  const executable = new AsyncFunction('THREE', `${codeString}\nreturn createModel(THREE);`);
  const model = await executable(THREE);

  if (!model || !model.isObject3D) {
    throw new Error('Generated code did not return a valid Three.js object.');
  }

  return model;
}
