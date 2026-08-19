import { STORAGE_KEYS } from '../config.js';

/**
 * Wires the API key field to localStorage and keeps the status dot in sync.
 *
 * @param {object} elements
 * @param {HTMLInputElement} elements.input
 * @param {HTMLElement} elements.dot
 * @param {HTMLElement} elements.statusText
 * @returns {{getKey: () => string}}
 */
export function initApiKeyField({ input, dot, statusText }) {
  const render = (hasKey) => {
    dot.classList.toggle('active', hasKey);
    statusText.textContent = hasKey ? 'Key Active' : 'Key Required';
  };

  const savedKey = localStorage.getItem(STORAGE_KEYS.apiKey);
  if (savedKey) input.value = savedKey;
  render(Boolean(savedKey));

  input.addEventListener('input', (event) => {
    const value = event.target.value.trim();
    localStorage.setItem(STORAGE_KEYS.apiKey, value);
    render(value.length > 0);
  });

  return {
    getKey: () => input.value.trim(),
  };
}
