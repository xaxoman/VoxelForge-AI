import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { buildCollisionProxies, disposeProxies } from './collision.js';
import { UNITY_POSTPROCESSOR_PATH } from '../config.js';

/** Turns a prompt into a safe, short file stem. */
export function sanitizeFilename(name, fallback = 'model') {
  const sanitized = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  return sanitized || fallback;
}

/** Downloads a blob under the given filename. */
function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Promise wrapper around GLTFExporter's callback API.
 *
 * `onlyVisible: false` is required: collision proxies are deliberately hidden
 * so they never render in the viewport, and the default exporter setting would
 * silently drop them.
 */
function parseGltf(object, options) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(object, resolve, reject, { onlyVisible: false, ...options });
  });
}

/**
 * Runs `task` with collision proxies temporarily parented to the model, then
 * removes them again. The live scene is left exactly as it was found, even if
 * the export throws.
 *
 * @param {object} model
 * @param {string} collisionMode
 * @param {() => Promise<Blob>} task
 */
async function withCollisionProxies(model, collisionMode, task) {
  const proxies = buildCollisionProxies(model, collisionMode);
  proxies.forEach((proxy) => model.add(proxy));

  try {
    return await task();
  } finally {
    proxies.forEach((proxy) => model.remove(proxy));
    disposeProxies(proxies);
  }
}

/**
 * One entry per supported format. Each returns the blob to download.
 * @type {Record<string, {extension: string, toBlob: (object: object) => Promise<Blob>|Blob}>}
 */
const EXPORTERS = {
  glb: {
    extension: 'glb',
    collision: true,
    async toBlob(object) {
      const buffer = await parseGltf(object, { binary: true, embedImages: true });
      return new Blob([buffer], { type: 'application/octet-stream' });
    },
  },
  gltf: {
    extension: 'gltf',
    collision: true,
    async toBlob(object) {
      const json = await parseGltf(object, { binary: false, embedImages: true });
      return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    },
  },
  obj: {
    extension: 'obj',
    toBlob(object) {
      return new Blob([new OBJExporter().parse(object)], { type: 'text/plain' });
    },
  },
  stl: {
    extension: 'stl',
    toBlob(object) {
      return new Blob([new STLExporter().parse(object, { binary: true })], {
        type: 'application/octet-stream',
      });
    },
  },
};

/** Format ids this module can export. */
export const SUPPORTED_FORMATS = Object.keys(EXPORTERS);

/**
 * Exports an object and triggers the browser download.
 *
 * @param {object} object3D Three.js object to serialize.
 * @param {'glb'|'gltf'|'obj'|'stl'} format
 * @param {string} baseName Unsanitized name (usually the prompt).
 * @param {string} [collisionMode] Proxy mode; ignored by formats engines don't import.
 */
export async function exportModel(object3D, format, baseName, collisionMode = 'none') {
  const exporter = EXPORTERS[format];
  if (!exporter) throw new Error(`Unsupported export format: ${format}`);

  const filename = `${sanitizeFilename(baseName)}.${exporter.extension}`;

  // .obj and .stl go to modelling and slicing tools, where an extra hull would
  // just be stray geometry — collision is a game-engine concern.
  const blob = exporter.collision
    ? await withCollisionProxies(object3D, collisionMode, () => exporter.toBlob(object3D))
    : await exporter.toBlob(object3D);

  downloadBlob(blob, filename);
}

/**
 * Downloads the Unity editor script that reproduces Godot's collision-suffix
 * behaviour. Fetched from disk rather than embedded so the .cs file stays a
 * real, reviewable source file in the repository.
 */
export async function exportUnityPostprocessor() {
  const response = await fetch(UNITY_POSTPROCESSOR_PATH);
  if (!response.ok) throw new Error(`Could not load the Unity script (HTTP ${response.status})`);

  downloadBlob(await response.blob(), 'HyperMeshColliderPostprocessor.cs');
}
