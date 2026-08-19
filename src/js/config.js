/**
 * Application-wide constants.
 *
 * Anything that is a tunable value rather than logic lives here so it can be
 * changed without reading through the modules that consume it.
 */

/** localStorage keys used by the app. */
export const STORAGE_KEYS = {
  apiKey: 'gemini_api_key',
};

/** Google Generative Language REST endpoint. */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * How many times a failed build is sent back to the model for correction.
 * Models occasionally invent Three.js APIs; one or two corrective passes
 * recover almost all of those without the user noticing.
 */
export const MAX_REPAIR_ATTEMPTS = 2;

/**
 * Combined triangle ceiling for one boolean operation. CSG runs on the main
 * thread, so an unbounded operation on a dense mesh locks the tab; refusing is
 * better than a multi-second freeze, and the repair pass can simplify instead.
 */
export const MAX_CSG_TRIANGLES = 50000;

/** Sampling temperature used for every generation request. */
export const GENERATION_TEMPERATURE = 0.6;

/** Reference images are downscaled to this longest edge before upload. */
export const MAX_IMAGE_DIMENSION = 800;

/** JPEG/PNG quality used when re-encoding a downscaled reference image. */
export const IMAGE_ENCODE_QUALITY = 0.85;

/**
 * How many reference views one request may carry.
 *
 * Two or three orthographic views pin down all three axes; past that the extra
 * images mostly repeat information already given while inflating the payload.
 */
export const MAX_REFERENCE_IMAGES = 3;

/**
 * Camera angles a reference image can be tagged with.
 *
 * `short` is the compact name used in the sidebar summary. `axes` maps the
 * image's own horizontal and vertical directions onto the Three.js axes it
 * therefore measures, which is what lets the prompt tell the model which
 * dimension to read from which picture — and which two views have to agree on
 * a shared dimension. A view with `axes: null` is not an orthographic
 * projection, so it carries appearance but no measurements.
 */
export const REFERENCE_VIEWS = {
  front: {
    label: 'Front view',
    short: 'front',
    axes: { horizontal: 'x', vertical: 'y' },
    reads: 'left/right symmetry, the frontal silhouette, and every feature on the leading face',
  },
  side: {
    label: 'Side view',
    short: 'side',
    axes: { horizontal: 'z', vertical: 'y' },
    reads: 'the profile silhouette and how mass is distributed from nose to tail',
  },
  top: {
    label: 'Top view',
    short: 'top',
    axes: { horizontal: 'x', vertical: 'z' },
    reads: 'the plan-view footprint and anything mounted on the upper surface',
  },
  back: {
    label: 'Back view',
    short: 'back',
    axes: { horizontal: 'x', vertical: 'y' },
    reads: 'the rear face — exhausts, tail lights, vents, cargo',
    note: 'This view is mirrored along X relative to the front view: a feature on the left of this image sits on the right of the model.',
  },
  bottom: {
    label: 'Bottom view',
    short: 'bottom',
    axes: { horizontal: 'x', vertical: 'z' },
    reads: 'the underside — chassis, thrusters, landing gear, panel breaks',
    note: 'This view is mirrored along Z relative to the top view.',
  },
  detail: {
    label: '3/4 or detail',
    short: '3/4',
    axes: null,
    reads: 'material finish, colour, and how surfaces meet at the corners',
  },
};

/** Human-readable axis names used when explaining a view to the model. */
export const AXIS_LABELS = {
  x: 'X (width, left to right)',
  y: 'Y (height, bottom to top)',
  z: 'Z (depth, back to front)',
};

/**
 * Views handed to images as they are added, in order. Front/side/top is the
 * classic orthographic triple and resolves all three axes with no redundancy.
 */
export const DEFAULT_VIEW_ORDER = ['front', 'side', 'top'];

/**
 * Poly Haven's CC0 HDRI file CDN. Assets are 1k so a load stays around 1-2 MB.
 * Swap the resolution segment for 2k/4k if you want sharper reflections at the
 * cost of download size.
 */
export const HDRI_BASE_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k';

/**
 * Environment maps offered in the UI, keyed by the value of #environment-select.
 *
 * `studio` is generated procedurally by three.js and needs no network, which is
 * why it is the default. Entries carrying a `file` are fetched from Poly Haven
 * on first use and cached for the session.
 */
export const ENVIRONMENTS = {
  none: { label: 'No reflections' },
  studio: { label: 'Studio softbox' },
  photo: { label: 'Photo studio', file: 'brown_photostudio_02_1k.hdr' },
  warehouse: { label: 'Empty warehouse', file: 'empty_warehouse_01_1k.hdr' },
  sunset: { label: 'Venice sunset', file: 'venice_sunset_1k.hdr' },
  city: { label: 'City at night', file: 'potsdamer_platz_1k.hdr' },
};

/** Environment applied on first load. */
export const DEFAULT_ENVIRONMENT = 'studio';

/**
 * Intensity multipliers applied to the directional rig when an environment map
 * is active. Image-based lighting already supplies ambient fill and
 * reflections, so the lights step back to carving shadows and edges — without
 * this the scene blows out.
 */
export const ENV_LIGHT_SCALE = { ambient: 0.15, key: 0.55, fill: 0.3, rim: 0.6 };

/** Studio lighting presets keyed by the value of the #lighting-preset select. */
export const LIGHTING_PRESETS = {
  studio: {
    key: 0xffffff,
    fill: 0x94a3b8,
    rim: 0x6366f1,
    ambientIntensity: 0.8,
    background: { dark: 0x0a0a0b, light: 0xf1f1f3 },
  },
  cyberpunk: {
    key: 0xff007f,
    fill: 0x00f0ff,
    rim: 0x7928ca,
    ambientIntensity: 0.5,
    background: { dark: 0x08080f, light: 0xdedbec },
  },
  sunlight: {
    key: 0xfff5ea,
    fill: 0x87ceeb,
    rim: 0xffd700,
    ambientIntensity: 1.0,
    background: { dark: 0x0f0d0a, light: 0xf7f1e6 },
  },
};

/** Prompts cycled through by the shuffle button. */
export const SAMPLE_PROMPTS = [
  'Cyberpunk racing speeder bike with neon wheels and dual exhausts',
  'Ancient glowing magical staff with floating crystal shards',
  'Low poly medieval blacksmith anvil with hammer and sparks',
  'Stylized sci-fi orbital defense satellite with solar panels',
  'Retro arcade gaming machine with joystick and glowing CRT screen',
];

/** Button labels that change with how many reference images are attached. */
export const GENERATE_LABELS = {
  text: 'Generate model',
  image: 'Recreate in 3D',
  multiView: 'Fuse views into 3D',
};

/**
 * Collision proxy modes offered in the UI, keyed by the value of the
 * #collision-mode select. Proxies are only written into .glb/.gltf, the two
 * formats game engines actually import.
 */
export const COLLISION_MODES = ['none', 'box', 'convex', 'parts'];

/** Default collision mode — a single convex hull suits most props. */
export const DEFAULT_COLLISION_MODE = 'convex';

/**
 * Ceiling on the point count fed to the convex hull builder. Hulls depend only
 * on extreme points, so thinning a dense mesh barely changes the result while
 * keeping export snappy on 20k-triangle models.
 */
export const MAX_HULL_POINTS = 8000;

/** Editor script that teaches Unity the same suffixes Godot reads natively. */
export const UNITY_POSTPROCESSOR_PATH = './integrations/unity/HyperMeshColliderPostprocessor.cs';

/** UI themes available from the switcher. */
export const THEMES = ['dark', 'light'];

/** Theme used before the user picks one. */
export const DEFAULT_THEME = 'dark';

/** localStorage key holding the chosen theme. */
export const THEME_STORAGE_KEY = 'hypermesh_theme';

/**
 * Viewport colours per theme. Kept deliberately desaturated so the generated
 * model is the only saturated thing on screen.
 *
 * The light grid is darker than its background rather than lighter, and its
 * shadows are softened — a shadow tuned for near-black reads as a smudge on
 * white.
 */
export const VIEWPORT_THEMES = {
  dark: {
    background: 0x0a0a0b,
    fogDensity: 0.025,
    gridCenterLine: 0x2e2e35,
    gridLine: 0x1a1a1e,
    floorShadowOpacity: 0.4,
  },
  light: {
    background: 0xf1f1f3,
    fogDensity: 0.016,
    gridCenterLine: 0xb8b8c2,
    gridLine: 0xdcdce2,
    floorShadowOpacity: 0.18,
  },
};
