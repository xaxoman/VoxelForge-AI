import * as THREE from 'three';

/**
 * Procedural canvas textures offered to generated model code.
 *
 * Some surface detail is far cheaper to paint than to model: a racing number,
 * a carbon weave or a gauge face costs one quad with a texture instead of
 * hundreds of triangles. Each factory here draws into an offscreen 2D canvas
 * and returns a `THREE.CanvasTexture` ready to assign to a material slot.
 *
 * The library is handed to `createModel` as a second argument, so generated
 * code calls e.g. `TEX.racingNumber({ text: '07' })`. Passing it as an extra
 * argument keeps older single-parameter `createModel(THREE)` functions working
 * untouched — JavaScript simply ignores the surplus argument.
 */

/** Texture resolution per detail level, so decals track overall fidelity. */
export const TEXTURE_RESOLUTION = {
  ultra: 1024,
  high: 512,
  standard: 256,
};

/** Creates a 2D drawing surface of the given square size. */
function createCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

/**
 * Wraps a finished canvas as a texture.
 *
 * Colour maps must be tagged sRGB or they render washed out under the
 * renderer's linear workflow.
 */
function toTexture(canvas, { repeat = 1, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);

  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat !== 1) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
  }

  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Deterministic value noise, so a given seed always weathers the same way. */
function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state / 0xffffffff;
  };
}

/**
 * Builds the texture library bound to a resolution.
 *
 * @param {number} [baseSize] Default canvas edge in pixels.
 */
export function createTextureLibrary(baseSize = 512) {
  const lib = {
    /**
     * Twill carbon-fibre weave.
     * @param {{size?:number, color?:string, highlight?:string, weave?:number, repeat?:number}} [o]
     */
    carbonFiber(o = {}) {
      const size = o.size || baseSize;
      const cell = Math.max(4, Math.round(size / (o.weave || 32)));
      const { canvas, ctx } = createCanvas(size);

      ctx.fillStyle = o.color || '#141417';
      ctx.fillRect(0, 0, size, size);

      // Alternating 2x2 tow direction is what reads as twill rather than checks.
      for (let y = 0; y < size; y += cell) {
        for (let x = 0; x < size; x += cell) {
          const diagonal = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
          const gradient = ctx.createLinearGradient(x, y, x + cell, y + cell);
          const light = o.highlight || '#3c3c44';
          const dark = o.color || '#141417';
          gradient.addColorStop(0, diagonal ? light : dark);
          gradient.addColorStop(0.5, diagonal ? dark : light);
          gradient.addColorStop(1, diagonal ? light : dark);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, cell, cell);
        }
      }

      return toTexture(canvas, { repeat: o.repeat || 4 });
    },

    /**
     * Racing number or short decal text, optionally in a roundel.
     * @param {{text?:string, size?:number, color?:string, background?:string,
     *          outline?:string, roundel?:boolean, font?:string}} [o]
     */
    racingNumber(o = {}) {
      const size = o.size || baseSize;
      const text = String(o.text ?? '01').slice(0, 4);
      const { canvas, ctx } = createCanvas(size);

      ctx.fillStyle = o.background || '#d92626';
      ctx.fillRect(0, 0, size, size);

      if (o.roundel !== false) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = o.color || '#ffffff';
        ctx.fill();
      }

      const glyphColor = o.roundel !== false ? (o.background || '#d92626') : (o.color || '#ffffff');
      ctx.font = `900 ${size * (text.length > 2 ? 0.34 : 0.46)}px ${o.font || 'Impact, Arial Black, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (o.outline) {
        ctx.lineWidth = size * 0.02;
        ctx.strokeStyle = o.outline;
        ctx.strokeText(text, size / 2, size / 2);
      }

      ctx.fillStyle = glyphColor;
      ctx.fillText(text, size / 2, size / 2);

      return toTexture(canvas);
    },

    /**
     * Racing stripes across the surface.
     * @param {{size?:number, background?:string, colors?:string[], count?:number,
     *          angle?:number, thickness?:number}} [o]
     */
    stripes(o = {}) {
      const size = o.size || baseSize;
      const colors = o.colors?.length ? o.colors : ['#ffffff', '#1e293b'];
      const count = Math.max(1, o.count || 2);
      const { canvas, ctx } = createCanvas(size);

      ctx.fillStyle = o.background || '#d92626';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(((o.angle || 0) * Math.PI) / 180);
      ctx.translate(-size / 2, -size / 2);

      const band = size * (o.thickness || 0.12);
      const span = band * count * 2;
      let x = (size - span) / 2;
      for (let i = 0; i < count; i += 1) {
        ctx.fillStyle = colors[i % colors.length];
        // Overdraw vertically so the band still covers after rotation.
        ctx.fillRect(x, -size, band, size * 3);
        x += band * 2;
      }
      ctx.restore();

      return toTexture(canvas);
    },

    /**
     * Weathering: rust blotches and grime over a base colour.
     * @param {{size?:number, base?:string, rust?:string, amount?:number,
     *          seed?:number, repeat?:number}} [o]
     */
    rust(o = {}) {
      const size = o.size || baseSize;
      const { canvas, ctx } = createCanvas(size);
      const random = seededRandom(o.seed ?? 1337);

      ctx.fillStyle = o.base || '#6b7280';
      ctx.fillRect(0, 0, size, size);

      const blotches = Math.round((o.amount ?? 0.5) * 260);
      const rustColor = o.rust || '#8a4b21';

      for (let i = 0; i < blotches; i += 1) {
        const x = random() * size;
        const y = random() * size;
        const radius = size * (0.01 + random() * 0.07);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, rustColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.25 + random() * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fine speckle keeps it from looking like smooth airbrush.
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < size * 3; i += 1) {
        ctx.fillStyle = random() > 0.5 ? '#3f2a17' : '#9ca3af';
        ctx.fillRect(random() * size, random() * size, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      return toTexture(canvas, { repeat: o.repeat || 1 });
    },

    /**
     * Cockpit gauge face with ticks and a needle.
     * @param {{size?:number, label?:string, ticks?:number, value?:number,
     *          face?:string, accent?:string, needle?:string}} [o]
     */
    gauge(o = {}) {
      const size = o.size || baseSize;
      const { canvas, ctx } = createCanvas(size);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.4;

      ctx.fillStyle = o.face || '#0b0f19';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = o.accent || '#38bdf8';
      ctx.lineWidth = size * 0.012;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Ticks sweep the lower 270 degrees, leaving a gap at the bottom.
      const ticks = o.ticks || 12;
      const start = Math.PI * 0.75;
      const sweep = Math.PI * 1.5;
      for (let i = 0; i <= ticks; i += 1) {
        const angle = start + (sweep * i) / ticks;
        const inner = radius * (i % 3 === 0 ? 0.76 : 0.85);
        ctx.lineWidth = size * (i % 3 === 0 ? 0.014 : 0.007);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * radius * 0.94, cy + Math.sin(angle) * radius * 0.94);
        ctx.stroke();
      }

      const value = Math.min(1, Math.max(0, o.value ?? 0.65));
      const needleAngle = start + sweep * value;
      ctx.strokeStyle = o.needle || '#ef4444';
      ctx.lineWidth = size * 0.018;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(needleAngle) * radius * 0.8, cy + Math.sin(needleAngle) * radius * 0.8);
      ctx.stroke();

      ctx.fillStyle = o.accent || '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.03, 0, Math.PI * 2);
      ctx.fill();

      if (o.label) {
        ctx.fillStyle = o.accent || '#38bdf8';
        ctx.font = `600 ${size * 0.075}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(o.label).slice(0, 12), cx, cy + radius * 0.55);
      }

      return toTexture(canvas);
    },

    /**
     * License / registration plate.
     * @param {{text?:string, size?:number, background?:string, color?:string,
     *          border?:string}} [o]
     */
    licensePlate(o = {}) {
      const size = o.size || baseSize;
      const { canvas, ctx } = createCanvas(size);
      const text = String(o.text ?? 'HYPER-01').slice(0, 10);

      // Plates are wide, so the art occupies a central band of the square.
      ctx.fillStyle = '#0b0b0d';
      ctx.fillRect(0, 0, size, size);

      const plateH = size * 0.42;
      const plateY = (size - plateH) / 2;
      ctx.fillStyle = o.background || '#f4f4f5';
      ctx.fillRect(size * 0.04, plateY, size * 0.92, plateH);

      ctx.strokeStyle = o.border || '#18181b';
      ctx.lineWidth = size * 0.012;
      ctx.strokeRect(size * 0.04, plateY, size * 0.92, plateH);

      ctx.fillStyle = o.color || '#18181b';
      ctx.font = `700 ${plateH * 0.52}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, size / 2, plateY + plateH / 2);

      return toTexture(canvas);
    },

    /**
     * Panel seams and rivets for hull plating.
     * @param {{size?:number, base?:string, line?:string, cells?:number,
     *          rivets?:boolean, repeat?:number}} [o]
     */
    panelLines(o = {}) {
      const size = o.size || baseSize;
      const cells = Math.max(2, o.cells || 4);
      const step = size / cells;
      const { canvas, ctx } = createCanvas(size);

      ctx.fillStyle = o.base || '#9ca3af';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = o.line || '#4b5563';
      ctx.lineWidth = Math.max(1, size * 0.006);
      for (let i = 0; i <= cells; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size);
        ctx.moveTo(0, i * step); ctx.lineTo(size, i * step);
        ctx.stroke();
      }

      if (o.rivets !== false) {
        ctx.fillStyle = o.line || '#4b5563';
        for (let y = 0; y <= cells; y += 1) {
          for (let x = 0; x <= cells; x += 1) {
            ctx.beginPath();
            ctx.arc(x * step, y * step, Math.max(1.5, size * 0.008), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      return toTexture(canvas, { repeat: o.repeat || 2 });
    },
  };

  return lib;
}

/** Factory names the library exposes, for prompt text and validation. */
export const TEXTURE_FACTORIES = Object.keys(createTextureLibrary(8));
