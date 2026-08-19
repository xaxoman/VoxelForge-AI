import { GEMINI_API_BASE, GENERATION_TEMPERATURE } from '../config.js';
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
 * What each status the Generative Language API returns actually means for the
 * person looking at the alert.
 *
 * The status alone is not actionable — a 429 on a model you have never
 * successfully called is a different problem from a 429 after a dozen
 * generations, and only one of them is fixed by waiting.
 */
const STATUS_EXPLANATIONS = {
  400: 'The request was rejected as malformed. If the key was only just pasted, check it copied in full.',
  401: 'The API key was not accepted. Check it is a Generative Language API key from Google AI Studio.',
  403: 'This key is not allowed to use this model. The Generative Language API may not be enabled on the project, or the model may be restricted.',
  404: 'No model with this id exists at this endpoint, or it is not exposed to your key. Preview models are often unavailable outside an allowlist.',
  429: 'Quota exhausted for this model. Free-tier keys have a small per-minute allowance, and preview models usually carry their own separate — often zero — quota.',
  500: 'The model failed internally. Retrying usually helps; if it never succeeds, the request itself may be too large.',
  503: 'The model is overloaded and is refusing work. This is capacity on Google\'s side, not a problem with your request.',
};

/**
 * Calls generateContent against exactly the model that was asked for.
 *
 * Deliberately no failover. Silently retrying a different model hides which
 * model is broken and why: a model that never once answers looks like it works,
 * because a healthy one answers in its place.
 *
 * @param {object} options
 * @param {string} options.model      Model id to call. The only one called.
 * @param {string} options.apiKey
 * @param {object} options.payload    generateContent request body.
 * @param {(status: string) => void} [options.onStatus] Progress callback.
 * @returns {Promise<string>} The returned source, stripped of markdown fences.
 */
async function callModel({ model, apiKey, payload, onStatus }) {
  onStatus?.(`Querying ${model}...`);

  let response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // fetch only rejects when the request never reached the API at all.
    throw new Error(`Could not reach the Gemini API: ${err.message}\n\nCheck your network connection, and whether an extension or firewall is blocking generativelanguage.googleapis.com.`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.error?.message || response.statusText || 'No detail returned.';
    const explanation = STATUS_EXPLANATIONS[response.status] || 'The API rejected the request.';

    throw new Error(`${model} returned HTTP ${response.status}.\n\n${explanation}\n\nAPI said: ${detail}`);
  }

  const data = await response.json();
  const rawText = extractText(data);

  if (!rawText) {
    // A 200 with nothing in it is its own failure: the model was reached and
    // chose not to answer, and the reason for that is in the response.
    const candidate = data.candidates?.[0];
    const reason = candidate?.finishReason || data.promptFeedback?.blockReason;

    throw new Error(`${model} accepted the request but returned no code.${reason ? `\n\nIt stopped with: ${reason}.` : ''}\n\nSAFETY or RECITATION means the prompt tripped a filter; MAX_TOKENS means the answer was cut off — ask for less detail.`);
  }

  return stripCodeFences(rawText);
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
 * @returns {Promise<{code: string, parts: object[]}>}
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

  const code = await callModel({ model, apiKey, payload, onStatus });
  return { code, parts: userParts };
}
