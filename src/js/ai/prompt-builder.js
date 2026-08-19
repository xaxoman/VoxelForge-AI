/**
 * Builds the system instruction sent to Gemini.
 *
 * The prompt is assembled from two orthogonal knobs exposed in the UI:
 * geometric fidelity (`detailLevel`) and shading style (`materialStyle`).
 */

/** Geometry instructions keyed by the value of the #detail-level select. */
export const DETAIL_INSTRUCTIONS = {
  ultra: `
- ULTRA-HIGH FIDELITY: Break the object down into modular sub-assemblies.
- Micro-details: Bevels, rims with rubber treads and hubcaps, exhausts, headlights/taillights, spoiler struts, cockpit steering wheel/seat, antennas, panel lines.
- Use curved composite forms: TorusGeometry, CylinderGeometry with radial segments (16-32), SphereGeometry, CapsuleGeometry, ExtrudeGeometry.
- Give each distinct part a meaningful mesh.name (e.g. 'Chassis', 'Wheel_Front_Left', 'Cockpit_Glass', 'Spoiler', 'Headlight_Left').`,
  high: `
- HIGH FIDELITY: Construct smooth, curved shapes using cylindrical approximations, angled segments, and multi-part hierarchies. Give meshes descriptive mesh.name labels.`,
  standard: `
- BALANCED LOW-POLY: Clean geometry focusing on core silhouettes and primary forms.`,
};

/** Material instructions keyed by the value of the #material-style select. */
export const MATERIAL_INSTRUCTIONS = {
  pbr_realistic: `
- PBR REALISM:
  * Painted Shell: { color: <hex>, metalness: 0.85, roughness: 0.15 }
  * Rubber Tires/Grips: { color: 0x1a1a1a, metalness: 0.05, roughness: 0.95 }
  * Chrome/Exhaust: { color: 0xd1d5db, metalness: 0.95, roughness: 0.1 }
  * Headlights/Glow: { color: <hex>, emissive: <hex>, emissiveIntensity: 2.5 }
  * Glass/Canopy: { color: 0xa5f3fc, transparent: true, opacity: 0.45, roughness: 0.1 }`,
  neon_glow: `
- CYBERPUNK GLOW: High-contrast dark metallic hulls ({ metalness: 0.8, roughness: 0.3 }) with bright glowing emissive stripes/neon edges ({ emissiveIntensity: 3.5 }).`,
  stylized_matte: `
- STYLIZED MATTE: Low metalness (0.0), medium roughness (0.6), clean vibrant diffuse colors.`,
};

/**
 * Every geometry class the core THREE namespace exports in r160.
 *
 * Spelled out in the prompt because models otherwise invent plausible-sounding
 * classes — `PrismGeometry`, `RoundedBoxGeometry`, `TextGeometry` — that only
 * fail once the generated code runs.
 */
export const ALLOWED_GEOMETRIES = [
  'BoxGeometry', 'CapsuleGeometry', 'CircleGeometry', 'ConeGeometry',
  'CylinderGeometry', 'DodecahedronGeometry', 'ExtrudeGeometry',
  'IcosahedronGeometry', 'LatheGeometry', 'OctahedronGeometry',
  'PlaneGeometry', 'PolyhedronGeometry', 'RingGeometry', 'ShapeGeometry',
  'SphereGeometry', 'TetrahedronGeometry', 'TorusGeometry',
  'TorusKnotGeometry', 'TubeGeometry', 'BufferGeometry',
];

/**
 * @param {keyof DETAIL_INSTRUCTIONS} detailLevel
 * @param {keyof MATERIAL_INSTRUCTIONS} materialStyle
 * @returns {string} The full system instruction.
 */
export function buildSystemPrompt(detailLevel, materialStyle) {
  const detail = DETAIL_INSTRUCTIONS[detailLevel] || DETAIL_INSTRUCTIONS.ultra;
  const material = MATERIAL_INSTRUCTIONS[materialStyle] || MATERIAL_INSTRUCTIONS.pbr_realistic;

  return `
You are an expert Three.js procedural 3D modeler and technical game artist.
Generate valid, optimized Three.js JavaScript code returning a high-quality 3D model.

FIDELITY SPECIFICATIONS:
${detail}

MATERIAL GUIDELINES:
${material}

MANDATORY RULES:
1. Define and return ONLY this async function:
   async function createModel(THREE, TEX) {
       const group = new THREE.Group();
       group.name = "Root_Model";
       // construct 3D model with named meshes, geometries, and materials
       return group;
   }
2. Do NOT import THREE or instantiate scene/camera/renderer. Use the passed 'THREE' instance.
3. Set .castShadow = true and .receiveShadow = true on all meshes.
4. Center the model at (0, 0, 0) with height scaled between 1.5 and 4 units.
5. If an image is provided, accurately copy its silhouette, proportions, colors, sub-components, and materials!
6. Return PURE JavaScript code only inside \`\`\`javascript ... \`\`\` or raw code without markdown explanation.

PROCEDURAL TEXTURES:
createModel receives a second argument, TEX, holding canvas-texture factories.
Each returns a ready THREE.CanvasTexture — assign it to material.map (or any
map slot). Prefer a texture over modelled geometry for flat surface detail:
a racing number is one textured quad, not extruded letterforms.

  TEX.carbonFiber({ color, highlight, weave, repeat })
  TEX.racingNumber({ text, color, background, outline, roundel })
  TEX.stripes({ colors, count, angle, thickness, background })
  TEX.rust({ base, rust, amount, seed, repeat })
  TEX.gauge({ label, ticks, value, face, accent, needle })
  TEX.licensePlate({ text, background, color, border })
  TEX.panelLines({ base, line, cells, rivets, repeat })

Use them ONLY where the subject calls for it — racing livery, weathered metal,
cockpit instruments, hull plating. Do not texture a surface that should be
plain paint. These are the only TEX functions that exist; do not invent others.

Example:
  const decal = new THREE.MeshStandardMaterial({
    map: TEX.racingNumber({ text: '07', background: '#1d4ed8' }),
    metalness: 0.4, roughness: 0.35,
  });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), decal);
  door.name = 'Door_Decal_Left';

GEOMETRY ALLOWLIST — these are the ONLY geometry constructors that exist:
${ALLOWED_GEOMETRIES.join(', ')}

Do NOT invent geometry classes. There is no THREE.PrismGeometry,
THREE.RoundedBoxGeometry, THREE.TextGeometry or THREE.WedgeGeometry.
Build such shapes by combining the allowlisted primitives instead — a prism is
a CylinderGeometry with 3 radial segments, a rounded box is a scaled
CapsuleGeometry or a box with bevel meshes, and any custom profile can be
produced with ExtrudeGeometry or LatheGeometry over a THREE.Shape.
`;
}

/**
 * Builds the follow-up turn asking the model to fix code that failed.
 *
 * The failing source and the exact error go back verbatim: a model correcting
 * a concrete diagnostic does far better than one asked to "try again".
 *
 * @param {string} code  The source that failed.
 * @param {string} error The error it produced.
 */
export function buildRepairPrompt(code, error) {
  return `The previous createModel implementation failed and must be corrected.

ERROR:
${error}

FAILING CODE:
\`\`\`javascript
${code}
\`\`\`

Rewrite createModel(THREE) so it runs correctly. Replace any non-existent API
with one from the geometry allowlist, keeping the intended shape as close as
possible. Return only the corrected JavaScript.`;
}

/**
 * Composes the user-facing turn, which changes depending on whether the request
 * carries a text prompt, a reference image, or both.
 *
 * @param {string} textPrompt
 * @param {boolean} hasImage
 */
export function buildUserPrompt(textPrompt, hasImage) {
  if (!textPrompt) {
    return 'Recreate this reference image in maximum 3D fidelity with faithful geometry, colors, and realistic PBR materials.';
  }

  return hasImage
    ? `Recreate this reference image in maximum 3D fidelity. Additional requirements: "${textPrompt}"`
    : `Create a high-fidelity 3D model for: "${textPrompt}"`;
}
