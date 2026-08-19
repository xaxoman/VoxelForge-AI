import { MAX_IMAGE_DIMENSION, IMAGE_ENCODE_QUALITY } from '../config.js';

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
 * Wires the reference image dropzone: click-to-browse, drag-and-drop, clipboard
 * paste, preview and removal.
 *
 * @param {object} options
 * @param {HTMLElement} options.dropzone
 * @param {HTMLInputElement} options.fileInput
 * @param {HTMLElement} options.previewWrapper
 * @param {HTMLImageElement} options.preview
 * @param {HTMLElement} options.removeBtn
 * @param {(hasImage: boolean) => void} [options.onChange] Fired on set and clear.
 * @returns {{getImage: () => {base64: string, mimeType: string}|null, clear: () => void}}
 */
export function initImageInput({
  dropzone,
  fileInput,
  previewWrapper,
  preview,
  removeBtn,
  onChange,
}) {
  let activeImage = null;

  const clear = () => {
    activeImage = null;
    preview.src = '';
    previewWrapper.style.display = 'none';
    dropzone.style.display = 'block';
    fileInput.value = '';
    onChange?.(false);
  };

  const setImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please provide a valid image (PNG, JPEG, WebP).');
      return;
    }

    try {
      const dataUrl = await rescaleImage(file);
      const [header, base64] = dataUrl.split(',');

      activeImage = { base64, mimeType: header.match(/:(.*?);/)[1] };
      preview.src = dataUrl;
      dropzone.style.display = 'none';
      previewWrapper.style.display = 'block';
      onChange?.(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  removeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    clear();
  });

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (file) setImage(file);
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');

    const [file] = event.dataTransfer.files || [];
    if (file) setImage(file);
  });

  window.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        setImage(item.getAsFile());
        break;
      }
    }
  });

  return {
    getImage: () => activeImage,
    clear,
  };
}
