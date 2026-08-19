import { SUPERSEDED_REVISION } from './prompt-builder.js';

/**
 * The running edit thread for one model.
 *
 * Refinement is a real multi-turn conversation rather than a single "here is
 * some code, change it" request: the model sees what was originally asked, what
 * it built, and every refinement since, so "make that a bit wider" resolves
 * against the previous turn the way a person would read it.
 *
 * Only the newest revision carries its source. Superseded ones are replaced by
 * a one-line notice, because a thread that kept every revision would re-upload
 * the whole model on every turn while the older copies say nothing the current
 * one does not — the instructions between them are what actually carry intent,
 * and those are a sentence each.
 */
export function createConversation() {
  /** @type {{parts: object[], code: string, instruction: string|null}[]} */
  let exchanges = [];

  /**
   * Settings frozen when the thread opened. Fidelity and the reference views
   * describe the artifact being edited, so they stay put for the life of the
   * thread — swapping the detail level midway would tell the model to rebuild
   * everything at the same moment the edit prompt tells it to change one part.
   */
  let context = null;

  return {
    /** True once a model exists to refine. */
    isOpen: () => exchanges.length > 0,

    /** The frozen generation settings this thread is editing under. */
    context: () => context,

    /** Refinements applied so far, oldest first, for the UI to list. */
    edits: () => exchanges.slice(1).map((exchange) => exchange.instruction),

    /** Source of the model currently on stage. */
    code: () => exchanges.at(-1)?.code || null,

    /**
     * The thread as Gemini `contents`, ready for the next user turn to be
     * appended.
     */
    turns: () => exchanges.flatMap(({ parts, code }, index) => [
      { role: 'user', parts },
      {
        role: 'model',
        parts: [{
          text: index === exchanges.length - 1
            ? `\`\`\`javascript\n${code}\n\`\`\``
            : SUPERSEDED_REVISION,
        }],
      },
    ]),

    /** Starts a new thread, discarding any previous one. */
    open(generationContext) {
      context = generationContext;
      exchanges = [];
    },

    /**
     * Appends a completed exchange. Called only after code has actually built,
     * so failed attempts and their repair turns never enter the thread.
     *
     * @param {object} exchange
     * @param {object[]} exchange.parts       User parts as they were sent.
     * @param {string} exchange.code          Source that built.
     * @param {string|null} [exchange.instruction] Refinement text, for the UI list.
     */
    record({ parts, code, instruction = null }) {
      exchanges.push({ parts, code, instruction });
    },
  };
}
