import * as THREE from 'three';
import { LIGHTING_PRESETS, ENV_LIGHT_SCALE, DEFAULT_THEME } from '../config.js';

/** Intensities the rig uses on its own, with no environment map. */
const BASE_INTENSITY = { ambient: 0.9, key: 1.8, fill: 1.1, rim: 0.6 };
const NO_SCALE = { ambient: 1, key: 1, fill: 1, rim: 1 };

/**
 * Adds the three-point studio rig (key / fill / rim) plus ambient fill.
 *
 * @param {THREE.Scene} scene
 * @returns {{ambient: THREE.AmbientLight, key: THREE.DirectionalLight,
 *            fill: THREE.DirectionalLight, rim: THREE.DirectionalLight}}
 */
export function createLighting(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, BASE_INTENSITY.ambient);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, BASE_INTENSITY.key);
  key.position.set(6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.bias = -0.0001;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x94a3b8, BASE_INTENSITY.fill);
  fill.position.set(-6, 4, -6);
  scene.add(fill);

  // Backlight rather than uplight: sits behind and slightly above, so it
  // separates the silhouette instead of washing the front with colour.
  const rim = new THREE.DirectionalLight(0x6366f1, BASE_INTENSITY.rim);
  rim.position.set(0, 3, -7);
  scene.add(rim);

  // Preset ambience and environment compensation both feed the same
  // intensities, so the rig tracks them here rather than letting whichever ran
  // last win.
  return {
    ambient,
    key,
    fill,
    rim,
    presetAmbient: BASE_INTENSITY.ambient,
    environmentActive: false,
  };
}

/** Recomputes every intensity from the current preset and environment state. */
function refreshIntensities(lights) {
  const scale = lights.environmentActive ? ENV_LIGHT_SCALE : NO_SCALE;

  lights.ambient.intensity = lights.presetAmbient * scale.ambient;
  lights.key.intensity = BASE_INTENSITY.key * scale.key;
  lights.fill.intensity = BASE_INTENSITY.fill * scale.fill;
  lights.rim.intensity = BASE_INTENSITY.rim * scale.rim;
}

/**
 * Tells the rig whether an environment map is supplying light, so it can step
 * back instead of double-lighting the scene.
 *
 * @param {ReturnType<typeof createLighting>} lights
 * @param {boolean} active
 */
export function setEnvironmentActive(lights, active) {
  lights.environmentActive = active;
  refreshIntensities(lights);
}

/**
 * Recolours the rig and scene background to match a named preset.
 * Unknown preset names are ignored.
 *
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof createLighting>} lights
 * @param {keyof typeof LIGHTING_PRESETS} presetName
 * @param {string} [theme] Chooses the preset's light or dark backdrop.
 */
export function applyLightingPreset(scene, lights, presetName, theme = DEFAULT_THEME) {
  const preset = LIGHTING_PRESETS[presetName];
  if (!preset) return;

  lights.key.color.setHex(preset.key);
  lights.fill.color.setHex(preset.fill);
  lights.rim.color.setHex(preset.rim);
  lights.presetAmbient = preset.ambientIntensity;
  refreshIntensities(lights);

  // Each preset carries a backdrop per theme, so "cyberpunk dusk" stays moody
  // in light mode instead of punching a black hole in a white interface.
  const backdrop = preset.background[theme] ?? preset.background[DEFAULT_THEME];
  scene.background.setHex(backdrop);
  scene.fog.color.setHex(backdrop);
}
