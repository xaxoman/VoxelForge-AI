/**
 * Wires the export dropdown: opens on trigger click, closes on outside click,
 * and reports the chosen format id.
 *
 * @param {object} options
 * @param {HTMLElement} options.trigger
 * @param {HTMLElement} options.menu
 * @param {NodeListOf<HTMLElement>} options.options Buttons carrying `data-format`.
 * @param {(format: string) => void} options.onSelect
 */
export function initExportMenu({ trigger, menu, options, onSelect }) {
  const close = () => menu.classList.remove('show');

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    menu.classList.toggle('show');
  });

  document.addEventListener('click', close);

  options.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      close();
      onSelect(button.dataset.format);
    });
  });
}
