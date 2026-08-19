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
import { createConversation } from './ai/conversation.js';
import { buildModelFromCode } from './ai/model-compiler.js';
import { exportModel, exportUnityPostprocessor } from './export/model-exporter.js';
import { initApiKeyField } from './ui/api-key.js';
import { initImageInput } from './ui/image-input.js';
import { initRefine } from './ui/refine.js';
import { initExportMenu } from './ui/export-menu.js';
import { createTimer } from './ui/timer.js';
import { initInspector } from './ui/inspector.js';
import { initTheme, storedTheme } from './ui/theme.js';

const viewport = new Viewport(dom.canvasContainer, storedTheme());
const timer = createTimer(dom.timerDisplay);
const conversation = createConversation();
const apiKey = initApiKeyField({
  input: dom.apiKeyInput,
  dot: dom.keyDot,
  statusText: dom.keyStatusText,
});
const imageInput = initImageInput({
  dropzone: dom.imageDropzone,
  fileInput: dom.fileInput,
  grid: dom.referenceGrid,
  status: dom.referenceStatus,
  // 0 references reads as a text prompt, 1 as a recreation, 2+ as a fusion.
  onChange: (count) => {
    const byCount = [GENERATE_LABELS.text, GENERATE_LABELS.image];
    dom.generateBtnLabel.textContent = byCount[count] || GENERATE_LABELS.multiView;
  },
});
const refine = initRefine({
  input: dom.refineInput,
  button: dom.refineBtn,
  log: dom.editLog,
  status: dom.refineStatus,
  onSubmit: (instruction) => handleRefine(instruction),
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

/** Reflects the edit thread in the refine panel. */
function syncRefine(busy = false) {
  refine.sync({ isOpen: conversation.isOpen(), edits: conversation.edits(), busy });
}

/** Toggles the loading spinner and locks both prompts while a request is out. */
function setBusy(isBusy, status = '') {
  dom.loadingIndicator.style.display = isBusy ? 'flex' : 'none';
  dom.generateBtn.disabled = isBusy;
  syncRefine(isBusy);
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
 * @returns {Promise<{object: object, model: string, code: string, parts: object[]}>}
 *   `parts` is the request as first asked, so a repaired answer is recorded in
 *   the edit thread under what the user wanted rather than the correction that
 *   got there.
 */
async function generateWithRepair(request) {
  let previousAttempt = null;
  let lastError = null;
  let requestParts = null;

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    const { code, model, parts } = await generateModelCode({
      ...request,
      previousAttempt,
      onStatus: (status) => { dom.loadingText.textContent = status; },
    });

    requestParts ??= parts;

    try {
      dom.loadingText.textContent = 'Assembling 3D scene & calculating normals...';
      const object = await buildModelFromCode(code, { detailLevel: request.detailLevel });
      return { object, model, code, parts: requestParts };
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

/**
 * Shared plumbing for both generation paths: busy state, the stopwatch, error
 * reporting, and mounting whatever came back.
 *
 * `onBuilt` runs before the model is mounted and only on success, so a failed
 * request leaves both the scene and the edit thread as they were.
 *
 * @param {object} request        Passed through to generateWithRepair.
 * @param {object} options
 * @param {string} options.status First line shown on the loading row.
 * @param {(built: object) => void} options.onBuilt
 */
async function runGeneration(request, { status, onBuilt }) {
  const key = apiKey.getKey();

  if (!key) {
    alert('Please enter your Google Gemini API Key first.\n(Get one at: https://aistudio.google.com/app/apikey)');
    dom.apiKeyInput.focus();
    return;
  }

  setBusy(true, status);
  timer.start();

  try {
    const built = await generateWithRepair({
      ...request,
      apiKey: key,
      model: dom.modelSelect.value,
    });

    onBuilt(built);
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

/** Prompt -> Gemini -> Three.js code -> mounted model. */
async function handleGenerate() {
  const prompt = dom.promptInput.value.trim();
  const images = imageInput.getImages();

  if (!prompt && !images.length) {
    alert('Please enter a prompt or attach a reference view.');
    return;
  }

  // Fidelity and the reference views are frozen for the life of the thread:
  // every later edit is asked for against the model these settings produced.
  const context = {
    images,
    detailLevel: dom.detailLevelSelect.value,
    materialStyle: dom.materialStyleSelect.value,
  };

  await runGeneration({ ...context, prompt }, {
    status: 'Contacting Gemini API...',
    onBuilt: (built) => {
      // A new model ends the old thread — its edits described a different object.
      conversation.open(context);
      conversation.record({ parts: built.parts, code: built.code });
      refine.clear();
    },
  });
}

/**
 * Applies one refinement to the model on stage, as the next turn of the same
 * conversation rather than a fresh request.
 *
 * @param {string} instruction
 */
async function handleRefine(instruction) {
  if (!conversation.isOpen()) return;

  await runGeneration(
    {
      ...conversation.context(),
      editInstruction: instruction,
      history: conversation.turns(),
    },
    {
      status: 'Applying your edit...',
      onBuilt: (built) => {
        conversation.record({ parts: built.parts, code: built.code, instruction });
        refine.clear();
      },
    },
  );
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

  const fallbackName = imageInput.getImages().length ? 'model_asset' : 'model';

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

syncRefine();
viewport.start();

// Reflections are on from the first frame; the default needs no network.
dom.environmentSelect.value = DEFAULT_ENVIRONMENT;
applyEnvironment(DEFAULT_ENVIRONMENT);
