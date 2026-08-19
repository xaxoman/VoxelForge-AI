/**
 * Builds the system instruction sent to Gemini.
 *
 * The prompt is assembled from two orthogonal knobs exposed in the UI:
 * geometric fidelity (`detailLevel`) and shading style (`materialStyle`), plus
 * the set of reference views attached to the request.
 */

import { REFERENCE_VIEWS, AXIS_LABELS } from '../config.js';

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

/** Resolves a view id, falling back to the front view for unknown ids. */
function resolveView(viewId) {
  return REFERENCE_VIEWS[viewId] || REFERENCE_VIEWS.front;
}

/** The two axes a view measures. */
function visibleAxes({ horizontal, vertical }) {
  return [horizontal, vertical];
}

/** The axis a view cannot measure, i.e. the one it projects away. */
function hiddenAxis({ horizontal, vertical }) {
  return ['x', 'y', 'z'].find((axis) => axis !== horizontal && axis !== vertical);
}

/**
 * Labels one reference image so the model knows which angle it is looking at
 * and which dimensions that angle is authoritative for.
 *
 * Sent as its own text part immediately before the image it describes: an
 * unlabelled pile of images is exactly what makes a model average three views
 * into one mushy silhouette.
 *
 * @param {string} viewId Key of REFERENCE_VIEWS.
 * @param {number} index  Zero-based position in the request.
 * @param {number} total  How many views the request carries.
 */
export function buildViewLabel(viewId, index, total) {
  const view = resolveView(viewId);

  const measurements = view.axes
    ? `Its horizontal direction is ${AXIS_LABELS[view.axes.horizontal]}; its vertical direction is ${AXIS_LABELS[view.axes.vertical]}. It cannot show ${AXIS_LABELS[hiddenAxis(view.axes)]} — take that axis from another view.`
    : 'This is NOT an orthographic projection, so it is foreshortened: read colour, finish and how surfaces meet from it, never a measurement.';

  return `REFERENCE ${index + 1} of ${total} — ${view.label.toUpperCase()}.
${measurements}
Read from it: ${view.reads}.${view.note ? `\n${view.note}` : ''}`;
}

/**
 * Lists the dimensions two views both show, which is where scale errors get
 * caught: a front and a side view disagreeing about height means one of them
 * was read wrong, and the model has to settle it before writing geometry.
 *
 * @param {string[]} viewIds
 * @returns {string[]} One line per overlapping pair.
 */
function buildCrossChecks(viewIds) {
  const lines = [];

  for (let i = 0; i < viewIds.length; i += 1) {
    for (let j = i + 1; j < viewIds.length; j += 1) {
      const a = resolveView(viewIds[i]);
      const b = resolveView(viewIds[j]);
      if (!a.axes || !b.axes) continue;

      const shared = visibleAxes(a.axes).filter((axis) => visibleAxes(b.axes).includes(axis));
      if (!shared.length) continue;

      const dimensions = shared.map((axis) => AXIS_LABELS[axis]).join(' and ');
      lines.push(`   - ${a.label} vs ${b.label}: ${dimensions} must come out identical in both.`);
    }
  }

  return lines;
}

/**
 * The reconciliation protocol for a request carrying several angles of one
 * subject.
 *
 * Two failure modes are worth the prompt budget. Without an explicit axis map
 * the model treats extra views as extra objects, or averages them into a
 * silhouette that matches none of them; and without an explicit blind-spot rule
 * it invents features for the faces no view covers, or builds a part twice
 * because it showed up in two pictures.
 *
 * @param {string[]} viewIds
 * @returns {string} Empty for zero or one view — there is nothing to reconcile.
 */
export function buildMultiViewProtocol(viewIds) {
  if (viewIds.length < 2) return '';

  const roster = viewIds
    .map((viewId, index) => `  ${index + 1}. ${resolveView(viewId).label}`)
    .join('\n');

  const crossChecks = buildCrossChecks(viewIds);
  const agreement = crossChecks.length
    ? `${crossChecks.join('\n')}
   Where two views disagree, trust the one where the dimension is largest and
   most face-on, then apply that single number everywhere.`
    : '   These views share no measurable axis, so derive each axis from the one view that shows it.';

  return `
ORTHOGRAPHIC MULTI-VIEW INPUT:
This request carries ${viewIds.length} reference images. They are ${viewIds.length} VIEWS OF ONE
SINGLE OBJECT, not ${viewIds.length} separate objects and not ${viewIds.length} models. Each image is
labelled with the angle it was taken from and the axes it measures:
${roster}

Three.js axes: +X is right, +Y is up, +Z is toward the camera. Orient the model
so its FRONT faces +Z and its up direction is +Y.

Resolve the object before writing any geometry:
1. Fix the bounding box first. Take width (X), height (Y) and depth (Z) from the
   views that actually measure them. Never estimate an axis that a supplied view
   already shows.
2. Cross-check every dimension two views share:
${agreement}
3. Place each part in all three axes. A part read off one view must be given the
   depth or width the other views imply — never an arbitrary thickness.
4. Match features across views before modelling them. A part visible in two
   views is ONE part appearing twice, so build it once; the front and side views
   of a wheel are the same wheel.
5. Respect the silhouette of every view at once. The finished model, seen from
   each supplied angle, must read as that reference — a shape that only matches
   one view is wrong.

BLIND SPOTS — build only what the views support. For surfaces no view covers,
continue the forms and symmetry the views establish and keep the geometry
plain. Do not invent details there, and do not carry a feature around to a face
where no view shows one.
`;
}

/**
 * @param {keyof DETAIL_INSTRUCTIONS} detailLevel
 * @param {keyof MATERIAL_INSTRUCTIONS} materialStyle
 * @param {string[]} [viewIds] Views attached to the request, in payload order.
 * @returns {string} The full system instruction.
 */
export function buildSystemPrompt(detailLevel, materialStyle, viewIds = []) {
  const detail = DETAIL_INSTRUCTIONS[detailLevel] || DETAIL_INSTRUCTIONS.ultra;
  const material = MATERIAL_INSTRUCTIONS[materialStyle] || MATERIAL_INSTRUCTIONS.pbr_realistic;
  const multiView = buildMultiViewProtocol(viewIds);

  return `
You are an expert Three.js procedural 3D modeler and technical game artist.
Generate valid, optimized Three.js JavaScript code returning a high-quality 3D model.

FIDELITY SPECIFICATIONS:
${detail}

MATERIAL GUIDELINES:
${material}
${multiView}
MANDATORY RULES:
1. Define and return ONLY this async function:
   async function createModel(THREE, TEX, CSG) {
       const group = new THREE.Group();
       group.name = "Root_Model";
       // construct 3D model with named meshes, geometries, and materials
       return group;
   }
2. Do NOT import THREE or instantiate scene/camera/renderer. Use the passed 'THREE' instance.
3. Set .castShadow = true and .receiveShadow = true on all meshes.
4. Center the model at (0, 0, 0) with height scaled between 1.5 and 4 units.
5. If reference images are provided, accurately copy their silhouette, proportions, colors, sub-components, and materials — satisfying ALL supplied views at once!
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

BOOLEAN OPERATIONS (CSG):
createModel receives a third argument, CSG, for real constructive solid
geometry. Use it when a shape is defined by what has been REMOVED — cutting is
far more accurate than arranging primitives around a hole.

  CSG.subtract(base, tool)        base minus tool
  CSG.union(base, tool)           welds two solids into one
  CSG.intersect(base, tool)       keeps only the overlapping volume
  CSG.subtractAll(base, [tools])  subtracts several tools in sequence

All operands are THREE.Mesh objects. Position and rotate them normally BEFORE
the call; the result comes back at identity with the geometry baked, so add it
to your group exactly where the base mesh would have gone. The result inherits
the base mesh's material and name.

Reach for it on: wheel wells cut out of a chassis block, a hollow cockpit
drilled into a fuselage, vent or barrel holes punched through a cylinder,
windows cut from a hull.

Example — four wheel wells cut from a solid chassis:
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 4.4), bodyMat);
  const wells = [[1.1, 1.5], [-1.1, 1.5], [1.1, -1.5], [-1.1, -1.5]].map(([x, z]) => {
    const cutter = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 24));
    cutter.rotation.z = Math.PI / 2;
    cutter.position.set(x, -0.25, z);
    return cutter;
  });
  const body = CSG.subtractAll(chassis, wells);
  body.name = 'Chassis';
  group.add(body);

Booleans are not free: keep operands to simple primitives, and do not run them
over high-density meshes. These are the only CSG functions that exist.

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
possible, and keep matching the reference views above. Return only the
corrected JavaScript.`;
}

/**
 * Composes the user-facing turn, which changes depending on whether the request
 * carries a text prompt, reference views, or both.
 *
 * @param {string} textPrompt
 * @param {string[]} [viewIds] Views attached to the request, in payload order.
 */
export function buildUserPrompt(textPrompt, viewIds = []) {
  if (!viewIds.length) {
    return `Create a high-fidelity 3D model for: "${textPrompt}"`;
  }

  const request = viewIds.length > 1
    ? `Reconstruct the single object shown in the ${viewIds.length} labelled reference views above as one 3D model, reconciling the views so the proportions are correct in all three axes.`
    : 'Recreate this reference image in maximum 3D fidelity with faithful geometry, colors, and realistic PBR materials.';

  return textPrompt ? `${request} Additional requirements: "${textPrompt}"` : request;
}
