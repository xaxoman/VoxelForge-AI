/**
 * Wires the refine box: the second prompt, which changes the model already on
 * stage instead of building a new one.
 *
 * The panel is inert until a model exists, because a refinement with nothing to
 * refine is just a worse version of the main prompt. The applied edits stay
 * listed under it so the thread the model is answering against is visible
 * rather than implied.
 *
 * @param {object} options
 * @param {HTMLTextAreaElement} options.input
 * @param {HTMLButtonElement} options.button
 * @param {HTMLElement} options.log     Ordered list the applied edits render into.
 * @param {HTMLElement} options.status  Line explaining what the box will do next.
 * @param {(instruction: string) => void} options.onSubmit
 * @returns {{sync: (state: object) => void, clear: () => void}}
 */
export function initRefine({ input, button, log, status, onSubmit }) {
  const submit = () => {
    const instruction = input.value.trim();

    if (!instruction) {
      input.focus();
      return;
    }

    onSubmit(instruction);
  };

  /** Describes what the box does from here, which depends on the thread. */
  const describe = (isOpen, edits) => {
    if (!isOpen) return 'Generate a model first — refinements build on what is already on stage.';

    if (!edits.length) {
      return 'Editing the model on stage. Anything you do not mention stays exactly as it is.';
    }

    return `${edits.length} edit${edits.length === 1 ? '' : 's'} applied. Generating again starts a new model and clears this thread.`;
  };

  /**
   * Reflects the current thread.
   *
   * @param {object} state
   * @param {boolean} state.isOpen  Whether a model exists to refine.
   * @param {string[]} state.edits  Refinements applied so far, oldest first.
   * @param {boolean} [state.busy]  True while a request is in flight.
   */
  const sync = ({ isOpen, edits, busy = false }) => {
    input.disabled = !isOpen || busy;
    button.disabled = !isOpen || busy;

    log.replaceChildren(...edits.map((instruction) => {
      const item = document.createElement('li');
      item.textContent = instruction;
      return item;
    }));
    log.hidden = !edits.length;

    status.textContent = describe(isOpen, edits);
  };

  button.addEventListener('click', submit);

  // Ctrl/Cmd+Enter applies without reaching for the mouse — refinement is the
  // step people repeat, so it is the one worth a shortcut.
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });

  return {
    sync,
    clear: () => { input.value = ''; },
  };
}
