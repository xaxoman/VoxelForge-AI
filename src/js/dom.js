/**
 * Single lookup point for every element the app talks to.
 *
 * Module scripts are deferred, so the document is fully parsed by the time
 * this module is evaluated and the queries below always resolve.
 */

const byId = (id) => document.getElementById(id);

export const dom = {
  // Viewport
  canvasContainer: byId('canvas-container'),

  // API key
  apiKeyInput: byId('gemini-key'),
  keyDot: byId('key-dot'),
  keyStatusText: byId('key-status-text'),

  // Generation settings
  modelSelect: byId('model-select'),
  activeModelBadge: byId('active-model-badge'),
  detailLevelSelect: byId('detail-level'),
  materialStyleSelect: byId('material-style'),
  collisionModeSelect: byId('collision-mode'),
  mergeModeSelect: byId('merge-mode'),
  promptInput: byId('prompt-input'),

  // Reference image
  imageDropzone: byId('image-dropzone'),
  fileInput: byId('file-input'),
  previewWrapper: byId('preview-wrapper'),
  imagePreview: byId('image-preview'),
  removeImageBtn: byId('remove-image-btn'),

  // Actions
  generateBtn: byId('generate-btn'),
  generateBtnLabel: byId('generate-btn-label'),
  randomBtn: byId('random-btn'),
  loadingIndicator: byId('loading-indicator'),
  loadingText: byId('loading-text'),

  // Viewport controls
  lightingPresetSelect: byId('lighting-preset'),
  turntableToggle: byId('turntable-toggle'),
  wireframeToggle: byId('wireframe-toggle'),

  // Export
  exportDropdownTrigger: byId('export-dropdown-trigger'),
  exportMenu: byId('export-menu'),

  // Readouts
  polycountLabel: byId('mesh-polycount'),
  objectCountLabel: byId('mesh-objects'),
  drawCallLabel: byId('mesh-drawcalls'),
  drawCallStat: byId('drawcall-stat'),
  timerDisplay: byId('timer-display'),

  // Collections
  promptChips: () => document.querySelectorAll('.chip'),
  exportOptions: () => document.querySelectorAll('.export-option'),
};
