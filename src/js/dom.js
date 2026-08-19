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
  themeToggle: byId('theme-toggle'),
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
  environmentSelect: byId('environment-select'),
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

  // Inspector
  inspectorPanel: byId('inspector-panel'),
  inspectorEmpty: byId('inspector-empty'),
  inspectorBody: byId('inspector-body'),
  inspectorClose: byId('inspector-close'),
  selectedName: byId('selected-name'),
  partColor: byId('part-color'),
  partColorHex: byId('part-color-hex'),
  partMetalness: byId('part-metalness'),
  partMetalnessValue: byId('part-metalness-value'),
  partRoughness: byId('part-roughness'),
  partRoughnessValue: byId('part-roughness-value'),
  partEmissive: byId('part-emissive'),
  partEmissiveValue: byId('part-emissive-value'),
  partVisibility: byId('part-visibility'),
  partVisibilityLabel: byId('part-visibility-label'),
  partStats: byId('part-stats'),
  gizmoButtons: {
    'gizmo-none': byId('gizmo-none'),
    'gizmo-translate': byId('gizmo-translate'),
    'gizmo-rotate': byId('gizmo-rotate'),
    'gizmo-scale': byId('gizmo-scale'),
  },

  // Collections
  promptChips: () => document.querySelectorAll('.chip'),
  exportOptions: () => document.querySelectorAll('.export-option'),
};
