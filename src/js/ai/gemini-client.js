import {
  GEMINI_API_BASE,
  GENERATION_TEMPERATURE,
  FALLBACK_MODELS,
  RETRYABLE_STATUSES,
} from '../config.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairPrompt,
  buildEditPrompt,
  buildViewLabel,
} from './prompt-builder.js';

/** Strips markdown fences Gemini sometimes wraps around the code block. */
function stripCodeFences(text) {
  return text.replace(/```javascript/gi, '').replace(/```/g, '').trim();
}

/** Pulls the answer text out of a generateContent response, skipping thoughts. */
function extractText(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];

  let rawText = '';
  for (const part of parts) {
    if (part.text && !part.thought) rawText += part.text;
  }

  if (!rawText && parts.length > 0) {
    rawText = parts[parts.length - 1].text || '';
  }

  return rawText;
}

/**
 * Calls generateContent, cascading down `FALLBACK_MODELS` whenever a model
 * reports high demand or rate limiting.
 *
 * @param {object} options
 * @param {string} options.model      Preferred model id; tried first.
 * @param {string} options.apiKey
 * @param {object} options.payload    generateContent request body.
 * @param {(status: string) => void} [options.onStatus] Progress callback.
 * @returns {Promise<{code: string, model: string}>} Code and the model that answered.
 */
async function callWithFailover({ model, apiKey, payload, onStatus }) {
  const trialModels = [model, ...FALLBACK_MODELS.filter((candidate) => candidate !== model)];
  let lastError = null;

  for (const trialModel of trialModels) {
    const url = `${GEMINI_API_BASE}/${trialModel}:generateContent?key=${apiKey}`;

    try {
      onStatus?.(`Querying ${trialModel}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (RETRYABLE_STATUSES.includes(response.status)) {
        console.warn(`Model ${trialModel} returned ${response.status}. Trying next available fallback...`);
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const rawText = extractText(await response.json());
      if (rawText) {
        return { code: stripCodeFences(rawText), model: trialModel };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All model endpoints are busy. Please try again.');
}

/**
 * Composes the user turn for one request: the reference views, then whatever
 * this turn is asking for.
 *
 * Two or more views are sent as alternating text/image parts — each label
 * immediately precedes the picture it describes — so the model knows which
 * angle it is looking at. A bare stack of images gets averaged into one
 * silhouette instead of being triangulated into a consistent solid.
 */
function buildUserParts({ references, views, prompt, editInstruction, previousAttempt, isFirstTurn }) {
  const parts = [];

  // Images ride along only on the opening turn. On a refinement they are
  // already in the thread, and re-attaching them would have the model matching
  // two copies of the same reference.
  if (isFirstTurn) {
    // A lone reference goes in bare: with nothing to triangulate against, an
    // axis map is a claim about a picture the user never confirmed, and a
    // mislabelled one contradicts what the model can plainly see.
    const isMultiView = references.length > 1;

    references.forEach((image, index) => {
      if (isMultiView) {
        parts.push({ text: buildViewLabel(image.view, index, references.length) });
      }
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    });
  }

  // A repair turn carries the failing source and error instead of the request
  // it stands in for; the surrounding thread is unchanged, so the fix still
  // sees the reference views and everything already agreed.
  if (previousAttempt) {
    parts.push({ text: buildRepairPrompt(previousAttempt.code, previousAttempt.error) });
  } else if (editInstruction) {
    parts.push({ text: buildEditPrompt(editInstruction) });
  } else {
    parts.push({ text: buildUserPrompt(prompt, views) });
  }

  return parts;
}

/**
 * Asks Gemini for the Three.js source of a model — either a fresh one matching
 * the given prompt and reference views, or a revision of the one already built.
 *
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.model
 * @param {string} options.prompt
 * @param {Array<{base64: string, mimeType: string, view: string}>} [options.images]
 * @param {string} options.detailLevel
 * @param {string} options.materialStyle
 * @param {string} [options.editInstruction] A change to the model already built.
 * @param {object[]} [options.history] Prior turns of the edit thread.
 * @param {(status: string) => void} [options.onStatus]
 * @param {{code: string, error: string}|null} [options.previousAttempt]
 *   When set, asks the model to correct that code instead of starting over.
 * @returns {Promise<{code: string, model: string, parts: object[]}>}
 *   `parts` is the user turn as sent, for the caller to record in the thread.
 */
export async function generateModelCode({
  apiKey,
  model,
  prompt,
  images = [],
  detailLevel,
  materialStyle,
  editInstruction,
  history = [],
  onStatus,
  previousAttempt,
}) {
  const references = images.filter((image) => image?.base64 && image?.mimeType);
  const views = references.map((image) => image.view);

  const userParts = buildUserParts({
    references,
    views,
    prompt,
    editInstruction,
    previousAttempt,
    isFirstTurn: history.length === 0,
  });

  const payload = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(detailLevel, materialStyle, views) }],
    },
    contents: [...history, { role: 'user', parts: userParts }],
    generationConfig: { temperature: GENERATION_TEMPERATURE },
  };

  const answer = await callWithFailover({ model, apiKey, payload, onStatus });
  return { ...answer, parts: userParts };
}
