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

* **Frontend**: Vanilla JavaScript (native ES Modules), HTML5, CSS3 Glassmorphism UI (zero build tools, zero runtime dependencies).
* **3D Engine**: Three.js (r160) with `OrbitControls`, `PCFSoftShadowMap`, and ACES Filmic Tone Mapping.
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
* Preserves named node trees upon `.glb` import into Godot and Unity for immediate rigging and animation.

### 5. Multi-Format 3D Exporter Dropdown
* 📦 **`.GLB` (Binary)**: Self-contained binary bundle with meshes, hierarchy, and embedded materials (Best for Godot & Unity).
* 📄 **`.GLTF` (JSON)**: Open scene description format for inspection and web apps.
* 📐 **`.OBJ` (Wavefront)**: Universal geometry file compatible with Blender, Maya, and 3ds Max.
* 🖨️ **`.STL` (Stereolithography)**: Binary mesh export ready for 3D printing slicers (Cura, PrusaSlicer).

### 6. Resilience & Developer Experience
* **Auto-Failover Circuit**: Automatically detects `503 High Demand` or `429 Rate Limit` errors and cascades down to available models (`3.6-flash` $\rightarrow$ `3.5-flash` $\rightarrow$ `2.5-flash` $\rightarrow$ `2.0-flash`).
* **Live Generation Stopwatch**: Real-time timer tracking elapsed seconds during generation and displaying total build time.
* **Live Mesh Diagnostics**: Dynamic triangle polycount and object-count counters.
* **Studio Lighting Presets**: Toggle between *Clean Studio Light*, *Cyberpunk Dusk*, and *Warm Sunlight*.
* **Interactive Viewport Tools**: Real-time wireframe overlay toggle and 360° auto-rotation turntable.
* **Persistent Key Storage**: Secure local browser storage (`localStorage`) for API keys.

---

## 🎮 Engine Import Workflows

### Godot 4.x / 3.x
1. Click **Export 3D Asset** $\rightarrow$ **`.GLB`**.
2. Drag the downloaded `.glb` directly into the Godot `res://` FileSystem dock.
3. Right-click the asset $\rightarrow$ **New Inherited Scene**.
4. Access all pre-named child meshes (`Chassis`, `Wheel_FL`, etc.) directly in the Scene Tree.

### Unity (2022 / 2023 / 6)
1. Drag the `.glb` into your `Assets/` directory.
2. Drag the prefab into the Scene Hierarchy.
3. Materials automatically map to Unity's Universal Render Pipeline (URP/Lit) with specular and roughness preserved.

---

## 🗺️ Product Roadmap & Production-Grade Suggestions

### Phase 1: Visual Realism & Shading
- [ ] **HDRI Image-Based Lighting (IBL)**: Integrate `RGBELoader` with Poly Haven CC0 studio HDRIs for realistic environment reflections on metals and glass.
- [ ] **Procedural Canvas Texture Baking**: Generate dynamic 2D canvas textures (racing stripes, decals, carbon fiber weaves, license plates) mapped to UV coordinates.
- [ ] **Post-Processing Pipeline**: Add `EffectComposer` with Unreal-style bloom on glowing emissive parts and subtle ambient occlusion (SSAO).

### Phase 2: Game Engine Production Optimization
- [ ] **Godot `-col` / `-convcol` Auto-Physics Tagging**: Automatically generate simplified low-poly bounding volumes tagged with `-col` suffixes so Godot automatically builds collision hulls upon import.
- [ ] **Draw Call Optimization (`BufferGeometryUtils.mergeGeometries`)**: Provide a toggle to merge meshes sharing identical materials, dropping draw calls from 80+ down to 3–5 for mobile/VR performance.
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
        │   └── viewport.js       # Render loop, model swapping, framing, stats
        ├── ai/
        │   ├── prompt-builder.js # Detail/material instruction blocks → system prompt
        │   ├── gemini-client.js  # generateContent + auto-failover circuit
        │   └── model-compiler.js # Evaluates returned code into a Three.js object
        ├── export/
        │   └── model-exporter.js # .GLB / .GLTF / .OBJ / .STL exporters
        └── ui/
            ├── api-key.js        # Key persistence + status indicator
            ├── image-input.js    # Dropzone, paste, preview, client-side rescaling
            ├── export-menu.js    # Export dropdown behavior
            └── timer.js          # Generation stopwatch
```

### Where to change things

| I want to…                              | Edit                                |
| :-------------------------------------- | :---------------------------------- |
| Add or reorder fallback models           | `src/js/config.js`                  |
| Change how Gemini is instructed          | `src/js/ai/prompt-builder.js`       |
| Add a new export format                  | `src/js/export/model-exporter.js`   |
| Tweak lights or add a lighting preset    | `src/js/config.js` + `src/js/viewer/lighting.js` |
| Adjust colors and spacing                | `src/styles/variables.css`          |
| Add a new UI control                     | `index.html` + `src/js/dom.js` + `src/js/main.js` |

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
