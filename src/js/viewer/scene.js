import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWPORT_THEME } from '../config.js';

/**
 * Builds the static parts of the 3D stage: scene, camera, renderer, orbit
 * controls, ground grid and the shadow-catching floor.
 *
 * @param {HTMLElement} container Element the WebGL canvas is appended to.
 */
export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VIEWPORT_THEME.background);
  scene.fog = new THREE.FogExp2(VIEWPORT_THEME.background, VIEWPORT_THEME.fogDensity);

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

  const grid = new THREE.GridHelper(30, 30, VIEWPORT_THEME.gridCenterLine, VIEWPORT_THEME.gridLine);
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: VIEWPORT_THEME.floorShadowOpacity }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { scene, camera, renderer, controls, grid, floor };
}
