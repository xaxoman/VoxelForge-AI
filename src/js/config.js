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
