/**
 * Application entry point.
 *
 * Owns no logic of its own beyond the generate/export flows — it wires the DOM
 * (dom.js), the 3D stage (viewer/), the Gemini pipeline (ai/) and the exporters
 * (export/) together.
 */

import {
  GENERATE_LABELS,
  SAMPLE_PROMPTS,
  DEFAULT_ENVIRONMENT,
  MAX_REPAIR_ATTEMPTS,
} from './config.js';
import { dom } from './dom.js';
import { Viewport } from './viewer/viewport.js';
import { generateModelCode } from './ai/gemini-client.js';
import { buildModelFromCode } from './ai/model-compiler.js';
import { exportModel, exportUnityPostprocessor } from './export/model-exporter.js';
import { initApiKeyField } from './ui/api-key.js';
import { initImageInput } from './ui/image-input.js';
import { initExportMenu } from './ui/export-menu.js';
import { createTimer } from './ui/timer.js';
import { initInspector } from './ui/inspector.js';
import { initTheme, storedTheme } from './ui/theme.js';

const viewport = new Viewport(dom.canvasContainer, storedTheme());
const timer = createTimer(dom.timerDisplay);
const apiKey = initApiKeyField({
  input: dom.apiKeyInput,
  dot: dom.keyDot,
  statusText: dom.keyStatusText,
});
const imageInput = initImageInput({
  dropzone: dom.imageDropzone,
  fileInput: dom.fileInput,
  previewWrapper: dom.previewWrapper,
  preview: dom.imagePreview,
  removeBtn: dom.removeImageBtn,
  onChange: (hasImage) => {
    dom.generateBtnLabel.textContent = hasImage ? GENERATE_LABELS.image : GENERATE_LABELS.text;
  },
});

/**
 * Reflects the model that actually answered. The failover circuit can cascade
 * past the chosen model, so the select is moved to match rather than leaving it
 * claiming a model that never responded.
 */
function syncSelectedModel(model) {
  if (dom.modelSelect.value === model) return;

  const known = [...dom.modelSelect.options].some((option) => option.value === model);
  if (known) dom.modelSelect.value = model;
}

/** True when the user has asked for merged output. */
const isMergeEnabled = () => dom.mergeModeSelect.value === 'material';

/**
 * Refreshes the readouts from the live scene. The draw-call figure previews
 * what merging would achieve, so the trade-off is visible before exporting.
 */
function refreshStats() {
  const { triangles, meshes, materialGroups } = viewport.getStats();
  dom.polycountLabel.textContent = triangles.toLocaleString();
  dom.objectCountLabel.textContent = meshes;
  dom.drawCallLabel.textContent = isMergeEnabled() ? materialGroups : meshes;
  dom.drawCallStat.title = isMergeEnabled()
    ? `Merging by material: ${meshes} meshes collapse into ${materialGroups} draw calls`
    : `${meshes} draw calls — enable "Merge by material" to reduce to ${materialGroups}`;
}

/** Toggles the loading spinner and the generate button's disabled state. */
function setBusy(isBusy, status = '') {
  dom.loadingIndicator.style.display = isBusy ? 'flex' : 'none';
  dom.generateBtn.disabled = isBusy;
  if (status) dom.loadingText.textContent = status;
}

/**
 * Generates a model, and if the returned code fails to build, sends the error
 * back for correction rather than surfacing it.
 *
 * Models occasionally emit Three.js APIs that do not exist (`THREE.PrismGeometry`
 * and friends). Handing the exact diagnostic back recovers almost all of those,
 * so a hallucinated class costs a few extra seconds instead of a dead end.
 *
 * @returns {Promise<{object: object, model: string}>}
 */
async function generateWithRepair(request) {
  let previousAttempt = null;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    const { code, model } = await generateModelCode({
      ...request,
      previousAttempt,
      onStatus: (status) => { dom.loadingText.textContent = status; },
    });

    try {
      dom.loadingText.textContent = 'Assembling 3D scene & calculating normals...';
      const object = await buildModelFromCode(code, { detailLevel: request.detailLevel });
      return { object, model };
    } catch (err) {
      lastError = err;
      previousAttempt = { code, error: err.message };

      if (attempt < MAX_REPAIR_ATTEMPTS) {
        console.warn(`Build attempt ${attempt + 1} failed; asking for a correction.`, err);
        dom.loadingText.textContent = err.isApiError
          ? `Invalid API used — requesting a fix (${attempt + 2}/${MAX_REPAIR_ATTEMPTS + 1})…`
          : `Build failed — requesting a fix (${attempt + 2}/${MAX_REPAIR_ATTEMPTS + 1})…`;
      }
    }
  }

  throw lastError;
}

/** Prompt -> Gemini -> Three.js code -> mounted model. */
async function handleGenerate() {
  const key = apiKey.getKey();
  const prompt = dom.promptInput.value.trim();
  const image = imageInput.getImage();

  if (!key) {
    alert('Please enter your Google Gemini API Key first.\n(Get one at: https://aistudio.google.com/app/apikey)');
    dom.apiKeyInput.focus();
    return;
  }

  if (!prompt && !image) {
    alert('Please enter a prompt or attach an image.');
    return;
  }

  setBusy(true, 'Contacting Gemini API...');
  timer.start();

  try {
    const built = await generateWithRepair({
      apiKey: key,
      model: dom.modelSelect.value,
      prompt,
      image,
      detailLevel: dom.detailLevelSelect.value,
      materialStyle: dom.materialStyleSelect.value,
    });

    syncSelectedModel(built.model);
    viewport.setModel(built.object);
    refreshStats();
    timer.stop();
  } catch (err) {
    console.error(err);
    alert(`Generation Error: ${err.message}`);
    timer.fail();
  } finally {
    setBusy(false);
  }
}

/** Exports the current model, guarding against an empty scene. */
async function handleExport(format) {
  // The Unity helper is a static file, so it has nothing to do with the scene
  // and must not be gated behind having generated a model.
  if (format === 'unity-script') {
    try {
      await exportUnityPostprocessor();
    } catch (err) {
      console.error(err);
      alert(`Download failed: ${err.message}`);
    }
    return;
  }

  if (!viewport.hasModel()) {
    alert('Please generate a 3D model first!');
    return;
  }

  const fallbackName = imageInput.getImage() ? 'model_asset' : 'model';

  // The exporter reads the live model's materials; hold disposal so a
  // generation finishing mid-export can't free them underneath it.
  viewport.holdDisposal(true);
  try {
    await exportModel(
      viewport.getModel(),
      format,
      dom.promptInput.value.trim() || fallbackName,
      { collisionMode: dom.collisionModeSelect.value, merge: isMergeEnabled() },
    );
  } catch (err) {
    console.error(err);
    alert(`Export failed: ${err.message}`);
  } finally {
    viewport.holdDisposal(false);
  }
}

// --- Event wiring ---

dom.generateBtn.addEventListener('click', handleGenerate);

dom.randomBtn.addEventListener('click', () => {
  const index = Math.floor(Math.random() * SAMPLE_PROMPTS.length);
  dom.promptInput.value = SAMPLE_PROMPTS[index];
});

dom.promptChips().forEach((chip) => {
  chip.addEventListener('click', () => {
    dom.promptInput.value = chip.dataset.prompt;
    handleGenerate();
  });
});

// The draw-call readout depends on the merge setting, not just the model.
dom.mergeModeSelect.addEventListener('change', refreshStats);

dom.lightingPresetSelect.addEventListener('change', (event) => {
  viewport.setLightingPreset(event.target.value);
});

/**
 * Applies a reflection environment, reporting progress on the shared loading
 * row. HDRIs are a network fetch, so the control locks until it resolves.
 */
async function applyEnvironment(id) {
  dom.environmentSelect.disabled = true;
  const wasGenerating = dom.generateBtn.disabled;

  try {
    const result = await viewport.setEnvironment(id, (status) => {
      dom.loadingIndicator.style.display = 'flex';
      dom.loadingText.textContent = status;
    });

    if (result.fellBack) {
      dom.environmentSelect.value = result.id;
      alert(`That environment could not be downloaded, so the built-in studio is being used instead.\n\n${result.error}`);
    }
  } finally {
    dom.environmentSelect.disabled = false;
    // Don't clear the row out from under an in-flight generation.
    if (!wasGenerating) dom.loadingIndicator.style.display = 'none';
  }
}

dom.environmentSelect.addEventListener('change', (event) => applyEnvironment(event.target.value));

dom.turntableToggle.addEventListener('click', () => {
  dom.turntableToggle.classList.toggle('active-toggle', viewport.toggleAutoRotate());
});

dom.wireframeToggle.addEventListener('click', () => {
  dom.wireframeToggle.classList.toggle('active-toggle', viewport.toggleWireframe());
});

initExportMenu({
  trigger: dom.exportDropdownTrigger,
  menu: dom.exportMenu,
  options: dom.exportOptions(),
  onSelect: handleExport,
});

initTheme({
  toggle: dom.themeToggle,
  onChange: (theme) => viewport.setTheme(theme),
});

// Editing a part can change what the draw-call figure should read.
initInspector({ selection: viewport.selection, onChange: refreshStats });

viewport.start();

// Reflections are on from the first frame; the default needs no network.
dom.environmentSelect.value = DEFAULT_ENVIRONMENT;
applyEnvironment(DEFAULT_ENVIRONMENT);
