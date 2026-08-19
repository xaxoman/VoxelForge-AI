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

Unlike heavy, closed neural-mesh black boxes, HyperMesh uses Google Gemini to procedurally synthesize structured, editable, and hierarchically organized Three.js scene graphs. Models are rendered with real-time ACES Filmic PBR lighting and can be exported immediately into industry-standard formats (**`.GLB`**, **`.GLTF`**, **`.OBJ`**, **`.STL`**) ready for direct drag-and-drop into **Godot**, **Unity**, **Blender**, or **3D printing slicers**.

---

## 🏗️ Core Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HYPERMESH CLIENT APPLICATION                    │
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │   Multimodal Input  │                 │    Three.js Viewport   │   │
│   │ ├── Text Prompt     │                 │ ├── ACESFilmic Tone    │   │
│   │ ├── Image Drop/File │                 │ ├── Dynamic Studio PBR │   │
│   │ └── Clipboard Paste │                 │ ├── Soft Shadow Maps   │   │
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
* **3D Engine**: Three.js (r160) with `OrbitControls`, `PCFSoftShadowMap`, ACES Filmic Tone Mapping, and `PMREMGenerator` image-based lighting.
* **AI Engine**: Google Gemini API (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`).
* **Export Pipeline**: `GLTFExporter` (Binary & JSON), `OBJExporter`, `STLExporter`.

---

## 🚀 Features Implemented So Far

### 1. Multimodal Text & Image-to-3D Synthesis
* **Clipboard Paste (`Ctrl+V`)**: Paste reference images directly from the clipboard.
* **Drag-and-Drop / File Upload**: Drop any `.png`, `.jpg`, or `.webp` reference into the lateral bar.
* **Client-Side Image Rescaling**: Auto-optimizes reference images using an offscreen canvas to keep payloads light and API round-trips fast.
* **Vision Topology Decomposition**: Gemini deconstructs 2D images into silhouette, symmetry, sub-parts, and colors.

### 2. High-Fidelity Geometry & Spatial Modeling
* **Detail Level Presets**:
  * **Ultra (Micro-parts)**: Generates complex composite shapes, chamfers, wheel hubs, exhausts, cockpit glass, and spoiler struts (tested up to ~20,000+ triangles).
  * **High (Curved & Smooth)**: Subdivided cylindrical approximations and angled multi-part panels.
  * **Standard Low-Poly**: Clean, minimalist geometry for retro/stylized games.
* **Camera Auto-Framing**: Dynamically computes 3D bounding boxes and bounding spheres to re-center and frame models on generation.

### 3. PBR Physical Material Engine
* **Material Finish Presets**:
  * **Realistic PBR**: Metallic painted shells (`metalness: 0.85`, `roughness: 0.15`), matte rubber tires (`roughness: 0.95`), chrome accents, and transparent glass.
  * **Cyberpunk Glow**: High-contrast dark metals paired with high-intensity emissive neon channels.
  * **Stylized Matte**: Low-metalness, saturated diffuse clay aesthetic.

### 4. Game-Engine Ready Hierarchy
* Every generated component is assigned a semantic identifier (`Chassis`, `Wheel_Front_Left`, `Cockpit_Glass`, `Spoiler`, `Headlight_Left`).
* Preserves named node trees upon `.glb` import into Godot and Unity for immediate rigging and animation (unless draw call merging is enabled — see [Draw call optimization](#-draw-call-optimization)).

### 5. Multi-Format 3D Exporter Dropdown
* 📦 **`.GLB` (Binary)**: Self-contained binary bundle with meshes, hierarchy, and embedded materials (Best for Godot & Unity).
* 📄 **`.GLTF` (JSON)**: Open scene description format for inspection and web apps.
* 📐 **`.OBJ` (Wavefront)**: Universal geometry file compatible with Blender, Maya, and 3ds Max.
* 🖨️ **`.STL` (Stereolithography)**: Binary mesh export ready for 3D printing slicers (Cura, PrusaSlicer).

### 6. Resilience & Developer Experience
* **Self-Repairing Generation**: Generated code is checked against the real Three.js namespace before it runs. If the model invents a class that doesn't exist (`THREE.PrismGeometry` and friends), the exact diagnostic is sent back for a corrective pass — up to `MAX_REPAIR_ATTEMPTS` times — so a hallucinated API costs a few seconds instead of a failed generation. The system prompt also carries an explicit allowlist of the 20 geometry constructors that actually exist.
* **Auto-Failover Circuit**: Automatically detects `503 High Demand` or `429 Rate Limit` errors and cascades down to available models (`3.6-flash` $\rightarrow$ `3.5-flash` $\rightarrow$ `2.5-flash` $\rightarrow$ `2.0-flash`).
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
- [x] **HDRI Image-Based Lighting (IBL)** — ships as the **Environment** control, with a procedural studio default and optional Poly Haven CC0 HDRIs. See [Reflections & environment lighting](#-reflections--environment-lighting).
- [ ] **Procedural Canvas Texture Baking**: Generate dynamic 2D canvas textures (racing stripes, decals, carbon fiber weaves, license plates) mapped to UV coordinates.
- [ ] **Post-Processing Pipeline**: Add `EffectComposer` with Unreal-style bloom on glowing emissive parts and subtle ambient occlusion (SSAO).

### Phase 2: Game Engine Production Optimization
- [x] **Automatic Collision Mesh Generation** — ships as the **Collision mesh** control. Generates invisible proxy hulls tagged with Godot's `-colonly` / `-convcolonly` suffixes, plus a Unity `AssetPostprocessor` that reads the same suffixes. See [Automatic collision meshes](#-automatic-collision-meshes).
- [x] **Draw Call Optimization (`BufferGeometryUtils.mergeGeometries`)** — ships as the **Draw call optimization** control. See [Draw call optimization](#-draw-call-optimization).
- [ ] **LOD (Level of Detail) Generator**: Export multi-tier LODs (`LOD0` full detail, `LOD1` medium proxy, `LOD2` low poly) in a single container.

### Phase 3: In-App Interactive 3D Editor
- [ ] **Raycast Click-to-Select**: Click any individual part on the canvas to inspect it.
- [ ] **Live Color & PBR Tweak Gizmo**: Interactive sliders for metalness, roughness, emissive intensity, and color picker without regenerating.
- [ ] **TransformControls**: Interactive 3D translate/rotate/scale gizmos to nudge parts into place.

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
        │   └── viewport.js       # Render loop, model swapping, framing, stats
        ├── ai/
        │   ├── prompt-builder.js # Detail/material instruction blocks → system prompt
        │   ├── gemini-client.js  # generateContent + auto-failover circuit
        │   └── model-compiler.js # Evaluates returned code into a Three.js object
        ├── export/
        │   ├── model-exporter.js # .GLB / .GLTF / .OBJ / .STL exporters
        │   ├── collision.js      # Collision proxy hulls + Godot name suffixes
        │   └── merge.js          # Draw call optimization via geometry merging
        └── ui/
            ├── api-key.js        # Key persistence + status indicator
            ├── image-input.js    # Dropzone, paste, preview, client-side rescaling
            ├── export-menu.js    # Export dropdown behavior
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
| Add a new export format                  | `src/js/export/model-exporter.js`   |
| Change how collision hulls are built     | `src/js/export/collision.js`        |
| Change how meshes are grouped for merging | `src/js/export/merge.js`           |
| Tweak lights or add a lighting preset    | `src/js/config.js` + `src/js/viewer/lighting.js` |
| Add an HDRI or change its resolution     | `src/js/config.js` (`ENVIRONMENTS`, `HDRI_BASE_URL`) |
| Adjust colors and spacing                | `src/styles/variables.css`          |
| Add a new UI control                     | `index.html` + `src/js/dom.js` + `src/js/main.js` |

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
3. Paste an image reference (`Ctrl+V`) or type a prompt.
4. Click **✨ Generate 3D Model** and export your asset!
