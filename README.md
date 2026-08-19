# ⚡ HyperMesh 3D Studio
> **Next-Generation Multimodal Text & Image-to-3D Generative Studio for Game Engines**

![Three.js](https://img.shields.io/badge/Three.js-r160-black?style=for-the-badge&logo=three.js)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4?style=for-the-badge&logo=google)
![Godot](https://img.shields.io/badge/Godot%20Engine-4.x%20Ready-478CBF?style=for-the-badge&logo=godotengine)
![Unity](https://img.shields.io/badge/Unity-2022%2F2023%2F6-000000?style=for-the-badge&logo=unity)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🌟 Executive Summary

**HyperMesh 3D Studio** is a serverless, client-side generative 3D web application that turns plain text prompts and 2D reference images into fully articulated, physically-based Three.js 3D models in seconds.

Unlike heavy, closed neural-mesh black boxes, HyperMesh uses Google Gemini to procedurally synthesize structured, editable, and hierarchically organized Three.js scene graphs. Because the output is code rather than an opaque mesh, a model can be refined in conversation — *"swap the spoiler for dual thrusters"* — instead of regenerated from scratch. Models are rendered with real-time ACES Filmic PBR lighting and can be exported immediately into industry-standard formats (**`.GLB`**, **`.GLTF`**, **`.OBJ`**, **`.STL`**) ready for direct drag-and-drop into **Godot**, **Unity**, **Blender**, or **3D printing slicers**.

---

## 🏗️ Core Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HYPERMESH CLIENT APPLICATION                    │
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │   Multimodal Input  │                 │    Three.js Viewport   │   │
│   │ ├── Text Prompt     │                 │ ├── ACESFilmic Tone    │   │
│   │ ├── 2-3 Ortho Views │                 │ ├── Dynamic Studio PBR │   │
│   │ └── Refine / Edit   │                 │ ├── Soft Shadow Maps   │   │
│   └──────────┬──────────┘                 │ └── Turntable Controls │   │
│              │                            └───────────▲────────────┘   │
│              ▼                                        │                │
│   ┌──────────────────────────────────┐                │                │
│   │  Gemini Vision & LLM Engine      │                │                │
│   │ ├── Spatial Reasoning Analysis   │                │                │
│   │ ├── Procedural Three.js Compiler │────────────────┘                │
│   │ └── Auto-Failover Circuit        │                                 │
│   └──────────────────┬───────────────┘                                 │
│                      ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    Universal Multi-Format Exporters            │   │
│   │       [.GLB Binary]  |  [.GLTF JSON]  |  [.OBJ]  |  [.STL]     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

* **Frontend**: Vanilla JavaScript (native ES Modules), HTML5, CSS3 with a token-driven dark UI and an inline SVG icon sprite (zero build tools, zero runtime dependencies).
* **3D Engine**: Three.js (r160) with `OrbitControls`, `PCFSoftShadowMap`, ACES Filmic Tone Mapping, `PMREMGenerator` image-based lighting, and `three-bvh-csg` booleans (loaded on demand).
* **AI Engine**: Google Gemini API (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.7-flash`).
* **Export Pipeline**: `GLTFExporter` (Binary & JSON), `OBJExporter`, `STLExporter`.

---

## 🚀 Features Implemented So Far

### 1. Multimodal Text & Image-to-3D Synthesis
* **Orthographic Multi-Angle Input**: Attach up to **three** reference views — front, side, top — and Gemini reads all of them at once to fix scale in all three axes. See [Orthographic multi-angle input](#-orthographic-multi-angle-input).
* **Clipboard Paste (`Ctrl+V`)**: Paste reference images directly from the clipboard.
* **Drag-and-Drop / File Upload**: Drop any `.png`, `.jpg`, or `.webp` reference into the lateral bar — several at once.
* **Client-Side Image Rescaling**: Auto-optimizes reference images using an offscreen canvas to keep payloads light and API round-trips fast.
* **Vision Topology Decomposition**: Gemini deconstructs 2D images into silhouette, symmetry, sub-parts, and colors.

### 2. Conversational Iterative Edit
* **Refine Box**: A second prompt that changes the model already on stage — *"replace the rear spoiler with dual exhaust thrusters"* — instead of starting a new one. See [Iterative edit mode](#-iterative-edit-mode).
* **Real Multi-Turn Thread**: Each refinement is the next turn of the same conversation, so *"make that a bit wider"* resolves against the previous edit the way a person would read it.
* **Bounded Context**: Only the newest revision carries its source; superseded ones collapse to a one-line notice, so a long edit session does not re-upload the whole model every turn.

### 3. High-Fidelity Geometry & Spatial Modeling
* **Detail Level Presets**:
  * **Ultra (Micro-parts)**: Generates complex composite shapes, chamfers, wheel hubs, exhausts, cockpit glass, and spoiler struts (tested up to ~20,000+ triangles).
  * **High (Curved & Smooth)**: Subdivided cylindrical approximations and angled multi-part panels.
  * **Standard Low-Poly**: Clean, minimalist geometry for retro/stylized games.
* **Camera Auto-Framing**: Dynamically computes 3D bounding boxes and bounding spheres to re-center and frame models on generation.

### 4. PBR Physical Material Engine
* **Material Finish Presets**:
  * **Realistic PBR**: Metallic painted shells (`metalness: 0.85`, `roughness: 0.15`), matte rubber tires (`roughness: 0.95`), chrome accents, and transparent glass.
  * **Cyberpunk Glow**: High-contrast dark metals paired with high-intensity emissive neon channels.
  * **Stylized Matte**: Low-metalness, saturated diffuse clay aesthetic.

### 5. Game-Engine Ready Hierarchy
* Every generated component is assigned a semantic identifier (`Chassis`, `Wheel_Front_Left`, `Cockpit_Glass`, `Spoiler`, `Headlight_Left`).
* Preserves named node trees upon `.glb` import into Godot and Unity for immediate rigging and animation (unless draw call merging is enabled — see [Draw call optimization](#-draw-call-optimization)).

### 6. Multi-Format 3D Exporter Dropdown
* 📦 **`.GLB` (Binary)**: Self-contained binary bundle with meshes, hierarchy, and embedded materials (Best for Godot & Unity).
* 📄 **`.GLTF` (JSON)**: Open scene description format for inspection and web apps.
* 📐 **`.OBJ` (Wavefront)**: Universal geometry file compatible with Blender, Maya, and 3ds Max.
* 🖨️ **`.STL` (Stereolithography)**: Binary mesh export ready for 3D printing slicers (Cura, PrusaSlicer).

### 7. Resilience & Developer Experience
* **Self-Repairing Generation**: Generated code is checked against the real Three.js namespace before it runs. If the model invents a class that doesn't exist (`THREE.PrismGeometry` and friends), the exact diagnostic is sent back for a corrective pass — up to `MAX_REPAIR_ATTEMPTS` times — so a hallucinated API costs a few seconds instead of a failed generation. The system prompt also carries an explicit allowlist of the 20 geometry constructors that actually exist.
* **Auto-Failover Circuit**: Automatically detects `503 High Demand` or `429 Rate Limit` errors and cascades down to available models (`3.6-flash` $\rightarrow$ `3.5-flash` $\rightarrow$ `3.7-flash`). The model select moves to whichever model answered, so a silent failover is still visible.
* **Live Generation Stopwatch**: Real-time timer tracking elapsed seconds during generation and displaying total build time.
* **Live Mesh Diagnostics**: Dynamic triangle polycount and object-count counters.
* **Studio Lighting Presets**: Toggle between *Clean Studio Light*, *Cyberpunk Dusk*, and *Warm Sunlight*.
* **Interactive Viewport Tools**: Real-time wireframe overlay toggle and 360° auto-rotation turntable.
* **Persistent Key Storage**: Secure local browser storage (`localStorage`) for API keys.

---

## 🎮 Engine Import Workflows

### Godot 4.x / 3.x
1. Pick a **Collision mesh** mode (defaults to *Convex hull*), then **Export** $\rightarrow$ **`.glb`**.
2. Drag the downloaded `.glb` directly into the Godot `res://` FileSystem dock.
3. Right-click the asset $\rightarrow$ **New Inherited Scene**.
4. Access all pre-named child meshes (`Chassis`, `Wheel_FL`, etc.) directly in the Scene Tree.
5. Collision bodies are already there — Godot reads the `-colonly` / `-convcolonly` suffixes on import. Nothing to add by hand.

### Unity (2022 / 2023 / 6)
1. Install the importer **once**: **Export** $\rightarrow$ **Unity collider importer (.cs)**, and drop the file into any `Editor` folder in your project (e.g. `Assets/Editor/`).
2. Drag the `.glb` into your `Assets/` directory.
3. Drag the prefab into the Scene Hierarchy.
4. Materials automatically map to Unity's Universal Render Pipeline (URP/Lit) with specular and roughness preserved.
5. `MeshCollider` components are generated automatically from the same suffixes.

---

## 🛡️ Automatic Collision Meshes

Physics-ready on import, in both engines — no colliders added by hand.

The **Collision mesh** control generates invisible proxy geometry alongside the
visible model and names it using the suffixes Godot's glTF importer recognises:

| Mode | Produces | Best for |
| :--- | :--- | :--- |
| **None** | no proxies | render-only assets, 3D printing |
| **Box** | one axis-aligned box | crates, pickups, simple props |
| **Convex hull** *(default)* | one tight hull around the whole model | most props and vehicles |
| **Convex hull — per part** | one hull per top-level part | vehicles and mechs whose wheels, limbs or turrets need separate shapes |

### How the two engines get there

**Godot** supports this natively. A node whose name ends in a collision suffix
is converted on import:

| Suffix | Godot result | Visual mesh |
| :--- | :--- | :--- |
| `-colonly` | `StaticBody3D` + `ConcavePolygonShape3D` | removed |
| `-convcolonly` | `StaticBody3D` + `ConvexPolygonShape3D` | removed |
| `-col` | collision added beside the mesh | **kept** |
| `-convcol` | convex collision beside the mesh | **kept** |

HyperMesh emits the **`-only`** variants. This matters: `-col` and `-convcol`
*preserve* the proxy as a visible mesh, which would leave a solid box rendered
over your model.

**Unity has no such convention** — its importer only offers a blanket "Generate
Colliders" checkbox that wraps every mesh. To get the same behaviour,
`integrations/unity/HyperMeshColliderPostprocessor.cs` is an `AssetPostprocessor`
that reads the identical suffixes, attaches a `MeshCollider` with the right
convexity, strips the renderer for `-only` proxies, and removes the suffix from
the object name so the hierarchy matches Godot's. Install it once per project;
it then applies to every model you import.

### Notes

* Proxies are written **only into `.glb` and `.gltf`**. `.obj` and `.stl` go to
  modelling and slicing tools, where an extra hull would just be stray geometry.
* Proxies are never visible in the viewport, and the triangle/object counters
  continue to report the visible mesh only.
* Per-part mode roughly doubles file size on a multi-part model — one hull per
  part is not free. Whole-model convex is the cheaper default.
* Unity's convex `MeshCollider` is capped at 255 triangles and silently
  simplifies past that; generated hulls stay well under.
* Concave (`-colonly`) shapes are static-only in both engines. For a moving
  physics body, use a convex mode.

---

## 🗺️ Product Roadmap & Production-Grade Suggestions

### Phase 1: Visual Realism & Shading
- [x] **Orthographic Multi-Angle Input** — ships as the **Reference views** control: 2–3 labelled angles analysed together so scale is solved across all of them. See [Orthographic multi-angle input](#-orthographic-multi-angle-input).
- [x] **HDRI Image-Based Lighting (IBL)** — ships as the **Environment** control, with a procedural studio default and optional Poly Haven CC0 HDRIs. See [Reflections & environment lighting](#-reflections--environment-lighting).
- [x] **CSG Boolean Operations** — real constructive solid geometry via `three-bvh-csg`, loaded on demand. See [Boolean operations](#-boolean-operations-csg).
- [x] **Procedural Canvas Texture Baking** — ships as the `TEX` library handed to generated code. See [Procedural textures](#-procedural-textures).
- [ ] **Post-Processing Pipeline**: Add `EffectComposer` with Unreal-style bloom on glowing emissive parts and subtle ambient occlusion (SSAO).

### Phase 2: Game Engine Production Optimization
- [x] **Automatic Collision Mesh Generation** — ships as the **Collision mesh** control. Generates invisible proxy hulls tagged with Godot's `-colonly` / `-convcolonly` suffixes, plus a Unity `AssetPostprocessor` that reads the same suffixes. See [Automatic collision meshes](#-automatic-collision-meshes).
- [x] **Draw Call Optimization (`BufferGeometryUtils.mergeGeometries`)** — ships as the **Draw call optimization** control. See [Draw call optimization](#-draw-call-optimization).
- [ ] **LOD (Level of Detail) Generator**: Export multi-tier LODs (`LOD0` full detail, `LOD1` medium proxy, `LOD2` low poly) in a single container.

### Phase 3: In-App Interactive 3D Editor
- [x] **Conversational Iterative Edit** — ships as the **Refine** box: refinements run as further turns of the same Gemini conversation, against the model already on stage. See [Iterative edit mode](#-iterative-edit-mode).
- [x] **Raycast Click-to-Select** — see [Inspector & material editor](#-inspector--material-editor).
- [x] **Live Color & PBR Tweak Gizmo** — see [Inspector & material editor](#-inspector--material-editor).
- [x] **TransformControls** — see [Inspector & material editor](#-inspector--material-editor).

### Phase 4: Procedural Animation & Rigging
- [ ] **Embedded GLTF Animation Tracks (`THREE.AnimationClip`)**:
  - Rotating wheels/propellers for vehicles.
  - Hovering bob/sway loops for sci-fi drones.
  - Blinking light/energy pulse sequences.

### Phase 5: Packaging & Asset Store Bundles
- [ ] **Instant Transparent PNG Thumbnail Generator**: Capture a clean 512x512 render with transparent background upon export.
- [ ] **Complete ZIP Asset Package**: Bundle `.glb` + `.obj` + `thumbnail.png` + `metadata.json` (dimensions, license, triangle count, part names) into a single download.

---

## 📁 Project Structure

The app is plain ES modules and plain CSS — no bundler, no transpiler, no
`node_modules` required at runtime. Three.js is pulled from a CDN via an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
declared in `index.html`.

```text
.
├── index.html                    # Markup only — structure, import map, entry points
├── package.json                  # Static-server scripts (no runtime dependencies)
├── integrations/
│   └── unity/                    # AssetPostprocessor giving Unity Godot's collider suffixes
└── src/
    ├── styles/
    │   ├── main.css              # Entry point: @imports the four sheets below
    │   ├── variables.css         # Design tokens (colors, borders, accents)
    │   ├── base.css              # Reset, document shell, typography, keyframes
    │   ├── layout.css            # Overlay panels, grids, button rows
    │   └── components.css        # Buttons, inputs, dropzone, export menu, chips
    └── js/
        ├── main.js               # Entry point: wires every module together
        ├── config.js             # Tunable constants (models, presets, limits)
        ├── dom.js                # Single lookup point for every DOM element
        ├── viewer/
        │   ├── scene.js          # Scene, camera, renderer, controls, grid, floor
        │   ├── lighting.js       # Three-point rig + lighting presets
        │   ├── environment.js    # HDRI / procedural IBL via PMREMGenerator
        │   ├── selection.js      # Raycast picking + TransformControls gizmo
        │   └── viewport.js       # Render loop, model swapping, framing, stats
        ├── geometry/
        │   └── csg.js            # Boolean operations, lazily loaded
        ├── textures/
        │   └── procedural.js     # Canvas texture factories (decals, weaves, gauges)
        ├── ai/
        │   ├── prompt-builder.js # Detail/material instruction blocks → system prompt
        │   ├── gemini-client.js  # generateContent + auto-failover circuit
        │   ├── conversation.js   # The edit thread: turns, revisions, frozen settings
        │   └── model-compiler.js # Evaluates returned code into a Three.js object
        ├── export/
        │   ├── model-exporter.js # .GLB / .GLTF / .OBJ / .STL exporters
        │   ├── collision.js      # Collision proxy hulls + Godot name suffixes
        │   └── merge.js          # Draw call optimization via geometry merging
        └── ui/
            ├── api-key.js        # Key persistence + status indicator
            ├── image-input.js    # Dropzone, paste, multi-view slots, client-side rescaling
            ├── refine.js         # Refine box, applied-edit log, thread state
            ├── export-menu.js    # Export dropdown behavior
            ├── inspector.js      # Selection inspector + material editor
            ├── theme.js          # Light/dark switching + persistence
            └── timer.js          # Generation stopwatch
```

### Design system

The interface uses a restrained, near-monochrome dark palette so the generated
model is the only saturated thing on screen. Every colour, radius and spacing
step is a custom property in `src/styles/variables.css` — restyling the whole
app means editing that one file.

* **Surfaces** are neutral greys with no colour cast (`#0a0a0b` → `#18181c`).
* **The accent** (`#6366f1`) is deliberately scarce: the primary action, focus
  rings, and active toggles. Nothing else competes for attention.
* **Depth** comes from 1px hairline borders rather than heavy drop shadows.
* **Icons** are an inline SVG sprite defined once at the top of `index.html`
  and referenced with `<use href="#i-name">`. They inherit `currentColor`, so a
  single definition works on every button variant. No emoji in UI chrome —
  they render inconsistently across platforms and can't be styled.
* **Numeric readouts** use `font-variant-numeric: tabular-nums` so digits don't
  jitter as they update.
* **Type** is Inter, loaded from Google Fonts with a full system fallback stack;
  the UI degrades cleanly if the font fails to load.

### Where to change things

| I want to…                              | Edit                                |
| :-------------------------------------- | :---------------------------------- |
| Add or reorder fallback models           | `src/js/config.js`                  |
| Change how Gemini is instructed          | `src/js/ai/prompt-builder.js`       |
| Change what an edit turn may touch       | `src/js/ai/prompt-builder.js` (`buildEditPrompt`) + `conversation.js` |
| Add a new export format                  | `src/js/export/model-exporter.js`   |
| Change the inspector's controls          | `src/js/ui/inspector.js`            |
| Add or tune a procedural texture         | `src/js/textures/procedural.js`     |
| Change the CSG budget or operations       | `src/js/geometry/csg.js` + `config.js` |
| Change how collision hulls are built     | `src/js/export/collision.js`        |
| Change how meshes are grouped for merging | `src/js/export/merge.js`           |
| Tweak lights or add a lighting preset    | `src/js/config.js` + `src/js/viewer/lighting.js` |
| Add an HDRI or change its resolution     | `src/js/config.js` (`ENVIRONMENTS`, `HDRI_BASE_URL`) |
| Add a reference angle or raise the view cap | `src/js/config.js` (`REFERENCE_VIEWS`, `MAX_REFERENCE_IMAGES`) |
| Adjust colors and spacing                | `src/styles/variables.css`          |
| Tune the light theme                     | `src/styles/variables.css` (`[data-theme="light"]`) + `VIEWPORT_THEMES` |
| Add a new UI control                     | `index.html` + `src/js/dom.js` + `src/js/main.js` |

---

## 🌓 Themes

A switcher in the panel header toggles between the dark default and a light
theme. The choice persists in `localStorage`.

The entire interface is driven by custom properties, so the light theme is
**only a second token block** in `variables.css` under `:root[data-theme="light"]`
— no parallel rule set. Two things could not simply inherit tokens and are
handled explicitly:

* **The 3D viewport has no CSS.** Background, fog, grid colours and shadow
  opacity come from `VIEWPORT_THEMES` in `config.js`, applied when the theme
  changes. `GridHelper` bakes colours into vertex data, so it is rebuilt rather
  than recoloured.
* **Lighting presets own the scene backdrop**, so each carries one per theme —
  *Cyberpunk dusk* stays moody in light mode instead of punching a black hole
  in a white interface.

An inline script in `<head>` applies the stored theme before first paint;
module scripts are deferred, so without it a light-theme user would see a dark
flash on every load.

Dark remains the default. A returning user who never touched the switcher
should not be surprised by a white screen.

**Note:** the theme is interface chrome, not a render setting. A generated
model looks identical in both — metals reflect the chosen *environment*, not
the page background, so chrome can read dark against a light viewport. Pick a
brighter environment if that matters for a screenshot.

---

## 📐 Orthographic Multi-Angle Input

One photo is one silhouette. Everything behind it — depth, the far side, how
tall a part really is relative to how long it is — is guesswork, and a model
asked to guess will produce something plausible rather than something correct.

Attach **two or three views of the same object** and that guesswork disappears:
each angle measures two of the three axes, so together they pin down the whole
bounding box.

```text
  Front view             Side view              Top view
  ┌─────────┐            ┌───────────┐          ┌─────────┐
  │         │ Y          │           │ Y        │         │ Z
  │         │ height     │           │ height   │         │ depth
  └─────────┘            └───────────┘          └─────────┘
    X width                Z depth                X width

    X + Y                  Z + Y                  X + Z
         ╲                   │                   ╱
          ╲                  │                  ╱
           →  one bounding box, all three axes, nothing guessed
```

### Using it

1. Drop, paste, or pick **up to three images**. Several files at once is fine —
   they fill the slots in order.
2. The first three are tagged **Front**, **Side** and **Top** automatically. Any
   row can be re-tagged from its dropdown; **Back**, **Bottom** and **3/4 or
   detail** are also available.
3. Generate. The button reads **Fuse views into 3D** once a second angle is
   attached.

Picking an angle another row already holds swaps the two rather than
duplicating it — two images claiming "front" would leave an axis unmeasured.

### What gets sent

Each image travels as its own labelled part, with the label immediately ahead of
the picture it describes:

```text
text  → REFERENCE 2 of 3 — SIDE VIEW.
        Its horizontal direction is Z (depth, back to front); its vertical
        direction is Y (height, bottom to top). It cannot show X (width, left
        to right) — take that axis from another view.
        Read from it: the profile silhouette and how mass is distributed…
image → <side.png>
```

An unlabelled stack of images is the failure case worth avoiding: models average
it into one mushy silhouette that matches none of the views, or treat three
pictures as three separate objects.

The system instruction then carries a reconciliation protocol built from the
views actually attached — including the shared-axis checks that catch scale
errors:

```text
   - Front view vs Side view: Y (height, bottom to top) must come out identical in both.
   - Front view vs Top view:  X (width, left to right)  must come out identical in both.
   - Side view vs Top view:   Z (depth, back to front)  must come out identical in both.
```

Height read off the front view has to match height read off the side view. When
they disagree, the prompt says which one to trust and to apply that single
number everywhere — rather than letting each part settle its own scale.

### Blind spots

The other half of the protocol is about what *not* to build. Surfaces no view
covers are continued from the forms and symmetry the views establish, and left
plain; invented greebles on an unseen face are the most common way a
multi-view reconstruction stops matching its reference. The same rule catches
double-building: a wheel visible in both the front and side view is one wheel,
not two.

### Notes

* **Angles are only used when there are two or more.** A single reference is
  sent bare, exactly as before — an axis map is a claim about a picture, and
  claiming a lone 3/4 render is a front elevation is worse than saying nothing.
  The angle dropdown appears when the second image does.
* **`3/4 or detail`** is the escape hatch for a non-orthographic image. It is
  labelled as foreshortened and explicitly excluded from measurement, so it
  contributes colour, finish and construction detail without corrupting scale.
* **Back and bottom views are marked as mirrored** against their opposite, so a
  feature on the left of a back view does not end up on the left of the model.
* Every view is rescaled to `MAX_IMAGE_DIMENSION` (800px) before upload, so
  three references cost roughly three times a single one — not three times a
  full-resolution photo.
* The repair pass keeps all views attached, so a correction stays matched to
  every reference rather than drifting back to the first one.

---

## 🔁 Iterative Edit Mode

Regenerating to change one part is a bad trade: the same prompt run twice gives
two different cars, so fixing the spoiler costs you the bodywork you liked.

The **Refine** box changes the model already on stage. It is the second turn of
the same conversation, not a new request:

> *"Keep the car exactly as it is, but replace the rear spoiler with dual
> exhaust thrusters."*

> *"Change the color scheme from blue/yellow to stealth matte black with crimson
> neon trim."*

`Ctrl`/`Cmd`+`Enter` applies without reaching for the button. Applied edits stay
listed under the box, in the order the model received them.

### It is an actual conversation

Each refinement is appended to a running thread and the whole thread is sent:

```text
user   → a hover car        + reference views
model  → (revision 1 source)
user   → replace the rear spoiler with dual exhaust thrusters
model  → (revision 2 source)
user   → stealth matte black with crimson neon trim      ← this turn
```

Which is why *"make that a bit wider"* works — "that" is the thing the previous
turn added. A tool that only sent the latest code plus your sentence would have
nothing to resolve "that" against.

### Only the newest revision carries its source

Superseded revisions collapse to a one-line notice:

```text
model  → (Earlier revision, replaced by the one below. Its source is omitted;
          the most recent code is the one to edit.)
```

An edit session that kept every revision would re-upload the entire model on
every turn, and the old copies say nothing the current one does not. The
*instructions* between them are what carry intent, and those are a sentence
each — so the thread stays conversational while the payload stays roughly flat
no matter how many edits you make.

### What the edit turn is told

Two failure modes are both silent, so both are ruled out explicitly:

* **Answering with a fragment.** Models asked to edit their own code like to
  reply with an excerpt and `// ...rest unchanged`. The reply replaces the whole
  model, so anything omitted is deleted. The prompt forbids diffs, excerpts and
  abbreviations, and asks for the complete `createModel`.
* **Rebuilding everything.** Asked for one change, a model will happily redesign
  the rest. The prompt pins everything the request does not mention — mesh
  names, geometry parameters, positions, materials, textures — and requires a
  removed part to actually be deleted rather than hidden or scaled to zero.

### Notes

* **Fidelity, finish and the reference views freeze when the thread opens.**
  Changing the Detail select mid-thread would tell the model to rebuild
  everything at the same moment the edit prompt tells it to change one part.
  Those selects apply to the *next* fresh generation; the reference views stay
  attached to the thread that was generated from them.
* **Generating again starts a new thread** and clears the edit log — the old
  edits described a different object.
* **A failed edit changes nothing.** The thread is only appended to after code
  has actually built, so a refusal or a bad build leaves the model on stage, the
  log, and your typed instruction exactly where they were — retry without
  retyping.
* **The self-repair pass is invisible to the thread.** If a revision fails to
  build and a corrective round fixes it, what gets recorded is your request and
  the code that worked — never the broken attempt or the repair turn.
* **Inspector tweaks do not survive an edit.** Material changes made by hand
  live on the mounted object, and a refinement replaces it. Refine first, then
  tune by hand.
* **Undo is not a first-class action.** "Put the spoiler back" usually works —
  the model has the full instruction history — but it is reconstructing, not
  reverting. Regenerate if a thread has gone somewhere you cannot talk it back
  from.

---

## 🔍 Inspector & Material Editor

Click any part of the model to open an inspector in the top-right corner and
adjust it in place — no regeneration, no waiting on the API.

| Control | Does |
| :--- | :--- |
| **Color** | Recolours the part's material |
| **Metalness / Roughness** | Slides between matte and chrome |
| **Emissive** | Raises glow, seeding the emissive colour from the base colour |
| **Visibility** | Hides a part without deleting it |
| **Transform gizmo** | Off / Move / Rotate / Scale handles on the selection |

Keyboard: `Q` `W` `E` `R` switch gizmo mode, `Esc` deselects. Shortcuts are
ignored while typing in a field.

### How selection stays out of the way

A click is only a selection if the pointer travelled less than 5 px — anything
further is an orbit, so dragging the view never changes what is selected. The
raycast tests the model alone, so the grid, floor, gizmo and outline are never
pickable, and dragging a gizmo axis temporarily disables orbiting.

The selection outline and the transform gizmo live on the **scene**, not inside
the model group. Everything that walks the model — export, collision hulls,
geometry merging, the triangle counter — therefore ignores them without needing
to know the inspector exists. Verified: exporting with an active gizmo yields
exactly the model's own nodes.

### Edits are real, not preview

Changes are written to the live material, so they are carried into `.glb` /
`.gltf` exactly as shown. Recolouring a part and exporting produces a file whose
`baseColorFactor` is the colour you picked.

Edits apply to the **material instance**. Parts that genuinely share one
material change together, which is what you want when recolouring a car's body
panels — and generated code usually gives each part its own material, so the
common case is per-part.

Selection is dropped when a new model is generated, since the outgoing model's
geometry is disposed at that moment.

---

## ✂️ Boolean Operations (CSG)

Some shapes are defined by what has been **removed**. Approximating a wheel arch
by arranging primitives around the gap is fiddly and wrong at the seams; cutting
it states the intent directly.

Generated code receives a `CSG` helper as a third argument:

| Call | Does |
| :--- | :--- |
| `CSG.subtract(base, tool)` | base minus tool |
| `CSG.union(base, tool)` | welds two solids into one |
| `CSG.intersect(base, tool)` | keeps only the overlapping volume |
| `CSG.subtractAll(base, [tools])` | subtracts several tools in sequence |

```js
// Four wheel wells cut out of a solid chassis block
const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 4.4), bodyMat);
const wells = [[1.1, 1.5], [-1.1, 1.5], [1.1, -1.5], [-1.1, -1.5]].map(([x, z]) => {
  const cutter = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 24));
  cutter.rotation.z = Math.PI / 2;
  cutter.position.set(x, -0.25, z);
  return cutter;
});
const body = CSG.subtractAll(chassis, wells);
body.name = 'Chassis';
```

Operands are ordinary `THREE.Mesh` objects, positioned and rotated before the
call. The result comes back at identity with its geometry baked, inheriting the
base mesh's **material and name** — so it drops into the group exactly where the
base mesh would have gone, and the exported node tree keeps its semantics.

### Loaded only when used

`three-bvh-csg` plus its `three-mesh-bvh` dependency is **~360 KB**. It is
imported on demand — the generated code is scanned for a `CSG.` reference, and
the library is fetched only if one is present. A model that never uses booleans
downloads nothing extra, and exports are byte-for-byte unchanged.

### Cost and limits

Booleans run on the main thread and are not cheap:

* A single operation is capped at **50,000 combined input triangles**
  (`MAX_CSG_TRIANGLES`). Over that it refuses with a clear message rather than
  locking the tab for seconds, and the repair pass can simplify instead.
* Boolean output is denser than its inputs — cutting a cylinder through a
  12-triangle box yields ~280 triangles. Keep operands to simple primitives.
* Non-indexed geometry (e.g. `ExtrudeGeometry`) is indexed automatically before
  the operation, since the BVH requires it.
* Shapes that do not overlap return the base unchanged; a subtraction that
  removes everything reports empty geometry rather than returning a void mesh.
* Invented operation names are caught by the same validator that guards THREE
  classes and texture factories, and routed to the same repair pass.

### Version pinning

`three-bvh-csg@0.0.17` is pinned deliberately. Version `0.0.18` raised its peer
requirement to `three >= 0.179`, which would force a three upgrade across the
whole app; `0.0.17` supports `three >= 0.151` and was verified against the
pinned r160.

---

## 🎨 Procedural Textures

Some surface detail is far cheaper to paint than to model. A racing number is
one textured quad; extruding the letterforms is hundreds of triangles that also
have to be positioned and beveled. Generated code therefore receives a texture
library as a second argument and can draw straight onto an offscreen canvas:

```js
async function createModel(THREE, TEX) {
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshStandardMaterial({
      map: TEX.racingNumber({ text: '07', background: '#1d4ed8' }),
      metalness: 0.4, roughness: 0.35,
    }),
  );
  door.name = 'Door_Decal_Left';
  // …
}
```

### Available factories

| Factory | Draws | Key options |
| :--- | :--- | :--- |
| `TEX.carbonFiber` | twill carbon weave | `color`, `highlight`, `weave`, `repeat` |
| `TEX.racingNumber` | number or short decal text, optional roundel | `text`, `color`, `background`, `outline`, `roundel` |
| `TEX.stripes` | racing stripes at any angle | `colors`, `count`, `angle`, `thickness`, `background` |
| `TEX.rust` | rust blotches and grime | `base`, `rust`, `amount`, `seed`, `repeat` |
| `TEX.gauge` | cockpit dial with ticks and needle | `label`, `ticks`, `value`, `face`, `accent` |
| `TEX.licensePlate` | registration plate | `text`, `background`, `color`, `border` |
| `TEX.panelLines` | hull seams and rivets | `base`, `line`, `cells`, `rivets`, `repeat` |

Each returns a `THREE.CanvasTexture` tagged sRGB, ready for `material.map` or
any other map slot.

### Notes

* **Resolution follows the Detail level** — Ultra bakes at 1024px, High at
  512px, Standard at 256px, so decals track overall fidelity without another
  control.
* **Textures export.** `GLTFExporter` embeds each canvas as a PNG, so `.glb`
  and `.gltf` carry the livery into Godot and Unity. `.obj` and `.stl` have no
  practical texture path and are unaffected.
* **They are not free.** Five 512px textures took one test export from ~11 KB
  to ~424 KB. Drop the Detail level, or ask for fewer decals, if size matters.
* **`TEX.rust` is deterministic** — the same `seed` always weathers the same
  way, so a regenerated asset matches.
* Invented factory names are caught by the same validator that guards THREE
  classes, and routed to the same repair pass.
* `createModel(THREE)` written without the second parameter keeps working
  untouched — JavaScript ignores the surplus argument.
* Replacing a model now frees its geometry, materials and textures. Several
  megabytes of canvas per generation would otherwise accumulate for the life of
  the tab. Disposal is held while an export is in flight, since the exporter
  borrows the live model's materials.

---

## 🪞 Reflections & Environment Lighting

Directional lights alone leave metal looking flat. A high-metalness surface has
almost no diffuse response, so with nothing to reflect it renders **near black**
except where a light hits it dead on — a chrome sphere lit only by the
directional rig measures a mean brightness of `2.9/255`. Give it an environment
to mirror and the same sphere measures `57`.

The **Environment** control (bottom bar) sets the reflection source:

| Option | Source | Network |
| :--- | :--- | :--- |
| No reflections | — | none |
| **Studio softbox** *(default)* | three.js `RoomEnvironment`, generated procedurally | **none** |
| Photo studio | Poly Haven `brown_photostudio_02` | ~1–2 MB |
| Empty warehouse | Poly Haven `empty_warehouse_01` | ~1–2 MB |
| Venice sunset | Poly Haven `venice_sunset` | ~1–2 MB |
| City at night | Poly Haven `potsdamer_platz` | ~1–2 MB |

Every map is prefiltered through `PMREMGenerator`, which converts an
equirectangular image into the roughness-aware mip chain `MeshStandardMaterial`
samples — that is what makes a rough surface blur its reflection while a
polished one stays sharp.

### Why the default is procedural

`RoomEnvironment` needs no network request, so reflections work on first paint,
offline, and behind a restrictive firewall. HDRIs are fetched only when you pick
one, and are cached for the rest of the session.

**A failed HDRI download is not fatal** — it falls back to the built-in studio
and tells you, rather than leaving the viewport broken.

### The lights step back automatically

An environment map supplies ambient fill as well as reflections, so leaving the
directional rig at full strength would double-light the scene into a white
blowout. When an environment is active the rig is scaled down
(`ENV_LIGHT_SCALE` in `config.js`) to what it is still needed for: shadows and
edge separation.

```text
                 ambient   key
lights only         0.90   1.80
with environment    0.14   0.99
```

Lighting presets and environment compensation feed the same intensities, so
switching preset while an environment is active will not undo the balance.

### Notes

* **Reflections are a viewport preview and are not exported.** glTF has no
  widely-supported way to carry an IBL environment, so Godot and Unity use
  their own sky/environment settings. What exports is the geometry and PBR
  material values, which is what those engines need.
* The viewport background stays the flat neutral grey rather than showing the
  HDRI as a skybox — a bright skybox would wreck contrast against the UI. The
  map is used for `scene.environment` only.
* HDRIs are 1k (~1–2 MB). Change the resolution segment of `HDRI_BASE_URL` in
  `config.js` for sharper reflections at a larger download.
* Poly Haven assets are CC0, so exported renders carry no attribution
  requirement.

---

## ⚡ Draw Call Optimization

A high-detail model can arrive as 60–80 separate primitives, and every one of
them is a draw call in your engine. Setting **Draw call optimization** to
*Merge by material* collapses parts that share a material into a single mesh
via `BufferGeometryUtils.mergeGeometries()`.

On a typical vehicle that is **58 meshes down to 4 draw calls** — the paint,
the rubber, the chrome and the glass — with the triangle count completely
unchanged.

The bottom bar shows the projected figure live, so you can see the effect
before exporting:

```text
420 triangles   7 objects   2 draw calls
```

### The trade-off

Merging **discards the per-part hierarchy**. `Wheel_Front_Left`,
`Cockpit_Glass` and friends collapse into `Wheel_Merged` and
`Cockpit_Glass_Merged`, so you can no longer address, rig or animate an
individual wheel in-engine.

That is the opposite of what the named-node-tree feature exists for, so it is
**off by default**. Turn it on for static scenery, props and background assets;
leave it off for anything you intend to rig.

### How parts are grouped

Generated code never reuses material *instances* — every part gets its own
`new THREE.MeshStandardMaterial(...)` — so grouping by object identity would
merge nothing. Parts are grouped by a signature of the properties that actually
affect rendering (type, colour, metalness, roughness, emissive, transparency,
opacity, side, shading, vertex colours, texture), rounded so float noise cannot
split an otherwise identical pair.

Merged meshes are named after the parts that went into them: a shared prefix
when the parts are clearly a family (all four wheels become `Wheel_Merged`),
otherwise the name of the part contributing the most geometry.

### Notes

* Applies to **`.glb` and `.gltf` only**, alongside collision. `.obj` and
  `.stl` keep the full part list a modeller expects.
* **Collision proxies are always derived from the original, unmerged parts.**
  Per-part collision therefore still produces one hull per wheel, rather than a
  single hull spanning all four corners of the vehicle.
* Transparent materials never merge into opaque ones — transparency is part of
  the signature — so render order is preserved.
* Meshes with an array of materials are passed through untouched.
* If a group cannot be reconciled (mismatched vertex attributes), those parts
  are kept separate rather than dropped, and a warning is logged.
* The live viewport is never modified; merging happens on a throwaway copy
  built at export time.

---

## 🛠️ Quick Start Guide

The app has **no build step and no dependencies to install** — but because the
source is split into native ES modules, it must be served over `http://` rather
than opened from the filesystem. Browsers block `file://` module imports for
security reasons (CORS), so double-clicking `index.html` will show a blank page.

Any static server works. Pick one:

```bash
# Option A — npm script (uses npx, nothing to install permanently)
npm start

# Option B — Python, already on most machines
python3 -m http.server 5173

# Option C — any other static server
npx --yes serve@14 . -l 5173
```

Then:

1. Open <http://localhost:5173> in a modern browser (Chrome, Edge, Firefox, Safari).
2. Paste your [Google AI Studio API Key](https://aistudio.google.com/app/apikey) — it is stored in `localStorage`, never sent anywhere but Google's API.
3. Type a prompt, or attach reference views (`Ctrl+V`, drag-and-drop, or click) —
   two or three angles of the same object gives the most accurate result.
4. Click the generate button, then refine it in place from the **Refine** box —
   *"swap the spoiler for dual thrusters"* — and export your asset!
