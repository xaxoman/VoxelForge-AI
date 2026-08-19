import {
  MAX_IMAGE_DIMENSION,
  IMAGE_ENCODE_QUALITY,
  MAX_REFERENCE_IMAGES,
  REFERENCE_VIEWS,
  DEFAULT_VIEW_ORDER,
} from '../config.js';

/** Fits width/height inside a square of `maxDim`, preserving aspect ratio. */
function fitWithin(width, height, maxDim) {
  if (width <= maxDim && height <= maxDim) return { width, height };

  return width > height
    ? { width: maxDim, height: Math.round((height * maxDim) / width) }
    : { width: Math.round((width * maxDim) / height), height: maxDim };
}

/**
 * Downscales an image file through an offscreen canvas so API payloads stay
 * small, and returns it as a data URL.
 *
 * @param {File} file
 * @returns {Promise<string>} data URL of the rescaled image.
 */
function rescaleImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Could not decode the image file.'));
      img.onload = () => {
        const { width, height } = fitWithin(img.width, img.height, MAX_IMAGE_DIMENSION);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        const mimeType = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mimeType, IMAGE_ENCODE_QUALITY));
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Picks the view to tag a newly added image with: the first of the classic
 * front/side/top triple that is still free, so dropping three files in gives
 * a complete orthographic set with nothing to configure.
 *
 * @param {string[]} taken Views already in use.
 */
function nextFreeView(taken) {
  const order = [...DEFAULT_VIEW_ORDER, ...Object.keys(REFERENCE_VIEWS)];
  return order.find((view) => !taken.includes(view)) || DEFAULT_VIEW_ORDER[0];
}

/**
 * Wires the reference image dropzone: click-to-browse, drag-and-drop, clipboard
 * paste, per-view previews and removal.
 *
 * Up to `MAX_REFERENCE_IMAGES` images are held, each tagged with the camera
 * angle it was shot from. The tag is what turns a pile of pictures into an
 * orthographic set the model can triangulate, so it is editable per image —
 * but only surfaced once a second image makes it meaningful.
 *
 * @param {object} options
 * @param {HTMLElement} options.dropzone
 * @param {HTMLInputElement} options.fileInput
 * @param {HTMLElement} options.grid       Container the preview rows render into.
 * @param {HTMLElement} options.status     Line reporting how many views are attached.
 * @param {(count: number) => void} [options.onChange] Fired on every add and remove.
 * @returns {{getImages: () => Array<{base64: string, mimeType: string, view: string}>, clear: () => void}}
 */
export function initImageInput({ dropzone, fileInput, grid, status, onChange }) {
  /** @type {Array<{id: number, dataUrl: string, base64: string, mimeType: string, view: string}>} */
  let references = [];
  let nextId = 0;

  /**
   * What one row calls its image. An untagged lone reference is not described
   * as an angle, in the row or to a screen reader, because it has not been
   * assigned one.
   */
  const nameOf = (image) => (references.length < 2
    ? 'Reference image'
    : REFERENCE_VIEWS[image.view]?.label || image.view);

  /** Reports what is attached, and what the count currently buys. */
  const describe = () => {
    if (!references.length) {
      const suggested = DEFAULT_VIEW_ORDER
        .slice(0, MAX_REFERENCE_IMAGES)
        .map((view) => REFERENCE_VIEWS[view].short)
        .join(', ');
      return `Up to ${MAX_REFERENCE_IMAGES} angles — ${suggested}.`;
    }

    // A lone image is not tagged with an angle, so it is not described as one.
    if (references.length < 2) return '1 reference. Add a second angle to pin down depth.';

    const named = references.map((image) => REFERENCE_VIEWS[image.view]?.short || image.view).join(', ');
    return `${references.length} views — ${named}. Scale is solved across all of them.`;
  };

  const render = () => {
    grid.replaceChildren(...references.map(buildRow));
    grid.style.display = references.length ? 'flex' : 'none';
    dropzone.style.display = references.length >= MAX_REFERENCE_IMAGES ? 'none' : 'block';
    status.textContent = describe();
    onChange?.(references.length);
  };

  const remove = (id) => {
    references = references.filter((image) => image.id !== id);
    fileInput.value = '';
    render();
  };

  /**
   * Moves an image onto another angle. Two images claiming the same angle would
   * leave an axis unmeasured, so whoever held it takes the vacated one instead
   * of silently duplicating.
   */
  const assignView = (id, view) => {
    const target = references.find((image) => image.id === id);
    if (!target || target.view === view) return;

    const occupant = references.find((image) => image.view === view && image.id !== id);
    if (occupant) occupant.view = target.view;
    target.view = view;
    render();
  };

  /** One preview row: thumbnail, angle selector, remove button. */
  function buildRow(image) {
    const row = document.createElement('div');
    row.className = 'reference-row';

    const thumb = document.createElement('img');
    thumb.className = 'reference-thumb';
    thumb.src = image.dataUrl;
    thumb.alt = `${nameOf(image)} preview`;

    const angle = references.length < 2 ? buildPlaceholder(image) : buildViewSelect(image);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'reference-remove icon-only ghost';
    removeBtn.type = 'button';
    removeBtn.title = 'Remove this reference';
    removeBtn.setAttribute('aria-label', `Remove ${nameOf(image)}`);
    removeBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-x"/></svg>';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      remove(image.id);
    });

    row.append(thumb, angle, removeBtn);
    return row;
  }

  /** The angle picker, offered once a second image makes the tag meaningful. */
  function buildViewSelect(image) {
    const select = document.createElement('select');
    select.className = 'reference-view';
    select.setAttribute('aria-label', 'Camera angle for this reference');

    for (const [id, view] of Object.entries(REFERENCE_VIEWS)) {
      select.add(new Option(view.label, id, false, id === image.view));
    }
    select.addEventListener('change', (event) => assignView(image.id, event.target.value));

    return select;
  }

  /** Stands in for the picker while a single, untagged reference is attached. */
  function buildPlaceholder(image) {
    const name = document.createElement('span');
    name.className = 'reference-name';
    name.textContent = nameOf(image);
    return name;
  }

  const clear = () => {
    references = [];
    fileInput.value = '';
    render();
  };

  /**
   * Accepts a batch of files, keeping only as many as there is room for and
   * saying so rather than dropping the surplus silently.
   *
   * @param {File[]|FileList} files
   */
  const addFiles = async (files) => {
    const images = [...files].filter((file) => file.type.startsWith('image/'));

    if (!images.length) {
      alert('Please provide a valid image (PNG, JPEG, WebP).');
      return;
    }

    const room = MAX_REFERENCE_IMAGES - references.length;
    if (room <= 0) {
      alert(`Up to ${MAX_REFERENCE_IMAGES} reference views can be attached. Remove one to add another.`);
      return;
    }

    if (images.length > room) {
      alert(`Only ${room} more reference view${room === 1 ? '' : 's'} can be attached, so the first ${room} of your ${images.length} images will be used.`);
    }

    for (const file of images.slice(0, room)) {
      // Rescaling is async, so a second batch can land mid-loop; the ceiling is
      // re-checked here rather than trusted from when this call started.
      if (references.length >= MAX_REFERENCE_IMAGES) break;

      try {
        const dataUrl = await rescaleImage(file);
        const [header, base64] = dataUrl.split(',');

        references.push({
          id: nextId,
          dataUrl,
          base64,
          mimeType: header.match(/:(.*?);/)[1],
          view: nextFreeView(references.map((image) => image.view)),
        });
        nextId += 1;
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    }

    // Clearing the picker lets the same filename be chosen again — otherwise
    // re-picking it fires no change event and the add is silently lost.
    fileInput.value = '';
    render();
  };

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (event) => {
    if (event.target.files?.length) addFiles(event.target.files);
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');

    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  });

  window.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    const pasted = [...items]
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (pasted.length) addFiles(pasted);
  });

  render();

  return {
    getImages: () => references.map(({ base64, mimeType, view }) => ({ base64, mimeType, view })),
    clear,
  };
}
