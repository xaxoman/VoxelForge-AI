import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWPORT_THEMES, DEFAULT_THEME } from '../config.js';

/**
 * Builds the static parts of the 3D stage: scene, camera, renderer, orbit
 * controls, ground grid and the shadow-catching floor.
 *
 * @param {HTMLElement} container Element the WebGL canvas is appended to.
 * @param {string} [theme] Key into VIEWPORT_THEMES.
 */
export function createScene(container, theme = DEFAULT_THEME) {
  const palette = VIEWPORT_THEMES[theme] ?? VIEWPORT_THEMES[DEFAULT_THEME];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);
  scene.fog = new THREE.FogExp2(palette.background, palette.fogDensity);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(4, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);

  const grid = new THREE.GridHelper(30, 30, palette.gridCenterLine, palette.gridLine);
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: palette.floorShadowOpacity }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { scene, camera, renderer, controls, grid, floor };
}

/**
 * Re-colours the static scene furniture for a theme.
 *
 * GridHelper bakes its colours into vertex data, so it is rebuilt rather than
 * recoloured. The caller owns the returned grid from then on.
 *
 * @param {object} parts Result of createScene, with the current grid.
 * @param {string} theme
 * @returns {THREE.GridHelper} The replacement grid.
 */
export function applySceneTheme({ scene, grid, floor }, theme) {
  const palette = VIEWPORT_THEMES[theme] ?? VIEWPORT_THEMES[DEFAULT_THEME];

  scene.background.setHex(palette.background);
  scene.fog.color.setHex(palette.background);
  scene.fog.density = palette.fogDensity;
  floor.material.opacity = palette.floorShadowOpacity;

  scene.remove(grid);
  grid.geometry.dispose();
  grid.material.dispose();

  const replacement = new THREE.GridHelper(30, 30, palette.gridCenterLine, palette.gridLine);
  scene.add(replacement);
  return replacement;
}
