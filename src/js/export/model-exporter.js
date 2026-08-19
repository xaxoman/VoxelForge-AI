import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

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

/** Promise wrapper around GLTFExporter's callback API. */
function parseGltf(object, options) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(object, resolve, reject, options);
  });
}

/**
 * One entry per supported format. Each returns the blob to download.
 * @type {Record<string, {extension: string, toBlob: (object: object) => Promise<Blob>|Blob}>}
 */
const EXPORTERS = {
  glb: {
    extension: 'glb',
    async toBlob(object) {
      const buffer = await parseGltf(object, { binary: true, embedImages: true });
      return new Blob([buffer], { type: 'application/octet-stream' });
    },
  },
  gltf: {
    extension: 'gltf',
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
 */
export async function exportModel(object3D, format, baseName) {
  const exporter = EXPORTERS[format];
  if (!exporter) throw new Error(`Unsupported export format: ${format}`);

  const blob = await exporter.toBlob(object3D);
  downloadBlob(blob, `${sanitizeFilename(baseName)}.${exporter.extension}`);
}
