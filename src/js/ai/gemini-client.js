import {
  GEMINI_API_BASE,
  GENERATION_TEMPERATURE,
  FALLBACK_MODELS,
  RETRYABLE_STATUSES,
} from '../config.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder.js';

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
 * Asks Gemini for the Three.js source of a model matching the given prompt
 * and/or reference image.
 *
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.model
 * @param {string} options.prompt
 * @param {{base64: string, mimeType: string}|null} [options.image]
 * @param {string} options.detailLevel
 * @param {string} options.materialStyle
 * @param {(status: string) => void} [options.onStatus]
 * @returns {Promise<{code: string, model: string}>}
 */
export async function generateModelCode({
  apiKey,
  model,
  prompt,
  image,
  detailLevel,
  materialStyle,
  onStatus,
}) {
  const userParts = [];

  if (image?.base64 && image?.mimeType) {
    userParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }

  userParts.push({ text: buildUserPrompt(prompt, Boolean(image?.base64)) });

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(detailLevel, materialStyle) }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: { temperature: GENERATION_TEMPERATURE },
  };

  return callWithFailover({ model, apiKey, payload, onStatus });
}
