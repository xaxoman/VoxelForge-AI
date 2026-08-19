/** Formats a duration in seconds as `12.3s` or `1m 2.3s`. */
export function formatTime(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Live generation stopwatch bound to a display element.
 *
 * @param {HTMLElement} display
 * @returns {{start: () => void, stop: () => void, fail: () => void}}
 */
export function createTimer(display) {
  let intervalId = null;
  let startTime = 0;

  const clear = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  };

  return {
    start() {
      clear();
      startTime = performance.now();
      display.textContent = '0.0s';

      intervalId = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        display.textContent = formatTime(elapsed);
      }, 100);
    },

    stop() {
      clear();
      const elapsed = (performance.now() - startTime) / 1000;
      display.textContent = formatTime(elapsed);
    },

    fail() {
      clear();
      display.textContent = 'Failed';
    },
  };
}
