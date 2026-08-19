import * as THREE from 'three';
import { LIGHTING_PRESETS } from '../config.js';

/**
 * Adds the three-point studio rig (key / fill / rim) plus ambient fill.
 *
 * @param {THREE.Scene} scene
 * @returns {{ambient: THREE.AmbientLight, key: THREE.DirectionalLight,
 *            fill: THREE.DirectionalLight, rim: THREE.DirectionalLight}}
 */
export function createLighting(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.bias = -0.0001;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x94a3b8, 1.1);
  fill.position.set(-6, 4, -6);
  scene.add(fill);

  // Backlight rather than uplight: sits behind and slightly above, so it
  // separates the silhouette instead of washing the front with colour.
  const rim = new THREE.DirectionalLight(0x6366f1, 0.6);
  rim.position.set(0, 3, -7);
  scene.add(rim);

  return { ambient, key, fill, rim };
}

/**
 * Recolours the rig and scene background to match a named preset.
 * Unknown preset names are ignored.
 *
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof createLighting>} lights
 * @param {keyof typeof LIGHTING_PRESETS} presetName
 */
export function applyLightingPreset(scene, lights, presetName) {
  const preset = LIGHTING_PRESETS[presetName];
  if (!preset) return;

  lights.key.color.setHex(preset.key);
  lights.fill.color.setHex(preset.fill);
  lights.rim.color.setHex(preset.rim);
  lights.ambient.intensity = preset.ambientIntensity;
  scene.background.setHex(preset.background);
}
