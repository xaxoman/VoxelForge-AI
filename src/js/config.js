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

/** Sampling temperature used for every generation request. */
export const GENERATION_TEMPERATURE = 0.6;

/**
 * Models the auto-failover circuit cascades through when the selected model
 * answers with "high demand" or "rate limited". Ordered best-first.
 */
export const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/** HTTP statuses that should trigger a fallback rather than an error. */
export const RETRYABLE_STATUSES = [429, 503];

/** Reference images are downscaled to this longest edge before upload. */
export const MAX_IMAGE_DIMENSION = 800;

/** JPEG/PNG quality used when re-encoding a downscaled reference image. */
export const IMAGE_ENCODE_QUALITY = 0.85;

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
    background: 0x0a0a0b,
  },
  cyberpunk: {
    key: 0xff007f,
    fill: 0x00f0ff,
    rim: 0x7928ca,
    ambientIntensity: 0.5,
    background: 0x08080f,
  },
  sunlight: {
    key: 0xfff5ea,
    fill: 0x87ceeb,
    rim: 0xffd700,
    ambientIntensity: 1.0,
    background: 0x0f0d0a,
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

/** Button labels that change depending on whether a reference image is set. */
export const GENERATE_LABELS = {
  text: 'Generate model',
  image: 'Recreate in 3D',
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

/**
 * Viewport colours. Kept deliberately desaturated so the generated model is the
 * only saturated thing on screen.
 */
export const VIEWPORT_THEME = {
  background: 0x0a0a0b,
  fogDensity: 0.025,
  gridCenterLine: 0x2e2e35,
  gridLine: 0x1a1a1e,
  floorShadowOpacity: 0.4,
};
