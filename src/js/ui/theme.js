import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from '../config.js';

/**
 * Light/dark theme switching.
 *
 * The whole interface is driven by custom properties, so flipping a
 * `data-theme` attribute on the root element re-skins the DOM. The 3D viewport
 * has no CSS to inherit, so listeners are notified to re-colour the scene.
 *
 * Dark stays the default: it is the product's identity, and a returning user
 * should not be surprised by a white screen. The choice persists once made.
 */
export function initTheme({ toggle, onChange }) {
  const listeners = new Set();
  if (onChange) listeners.add(onChange);

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  let current = THEMES.includes(stored) ? stored : DEFAULT_THEME;

  function render() {
    document.documentElement.setAttribute('data-theme', current);

    const goingLight = current === 'dark';
    toggle.title = goingLight ? 'Switch to light theme' : 'Switch to dark theme';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.querySelector('use').setAttribute('href', goingLight ? '#i-sun' : '#i-moon');
  }

  function set(theme) {
    if (!THEMES.includes(theme) || theme === current) return;

    current = theme;
    localStorage.setItem(THEME_STORAGE_KEY, current);
    render();
    listeners.forEach((listener) => listener(current));
  }

  toggle.addEventListener('click', () => set(current === 'dark' ? 'light' : 'dark'));

  render();
  listeners.forEach((listener) => listener(current));

  return {
    get: () => current,
    set,
    onChange: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

/** The theme to use on first paint, before any module has initialised. */
export function storedTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.includes(stored) ? stored : DEFAULT_THEME;
}
