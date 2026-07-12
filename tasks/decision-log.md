# Decision Log

Architectural and scope decisions for Tobu Farm of Fame that aren't obvious from reading the code, kept alongside the PRDs that motivated them.

---

## DEC-001: Bull walk animation uses a bone-free procedural vertex shader, not skeletal animation

**Date:** 2026-07-11
**Status:** Decided
**Related:** [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md), [tech-farm-visual-rehaul.md](tech-farm-visual-rehaul.md)

### Context

The farm rehaul requires bulls to visibly walk around the pasture (US-003). The existing rendering architecture renders all bulls through a single `InstancedMesh` (`src/scene/BullHerd.tsx`) for performance — this is an explicit project rule (CLAUDE.md: "Use InstancedMesh for rendering multiple bulls"). Standard Three.js `InstancedMesh` does not support per-instance skeletal animation (bones/`SkinnedMesh`/`AnimationMixer`), creating a conflict between "bulls that really walk" and "bulls that render in one draw call."

### Options considered

| Option | Description | Verdict |
|---|---|---|
| **(a) Procedural vertex shader** | Bone-free. A custom vertex shader displaces vertices above a height threshold ("legs") using a sine/noise function driven by a per-instance phase value. Body gets a walk-bob. Stays in one `InstancedMesh` draw call. | **Chosen** |
| (b) `SkinnedMesh` per bull | Standard GLTF skeletal animation, one `AnimationMixer` per bull instance. | **Rejected** |
| (c) Baked Vertex Animation Textures (VAT) | Rig + animate the mesh once in a DCC tool, bake the animation into a texture, sample it per-instance in a custom shader at render time. Real walk cycle, still one draw call. | **Documented fallback** |

### Decision

Use **option (a)**. Validate with a throwaway one-bull spike (no art polish, placeholder geometry) before committing the Fable asset pipeline to it.

### Why

- **(b) breaks the core performance architecture.** 40 separate `SkinnedMesh` instances with 40 concurrent bone-matrix updates per frame is the most likely path to miss the mobile perf budget (30fps floor, 60fps target — [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md) US-005) and directly contradicts the project's existing single-draw-call rule.
- **(a) is the simplest path that preserves the architecture.** It requires no rigging step, so Fable-generated meshes only need to be clean static low-poly geometry — no skeleton, no animation clips, no rigging expertise needed on either the art or engineering side.
- **(a) fits the toy-like low-poly aesthetic.** A stylized swing-and-bob reads fine at the project's fixed, zoomed-out camera distance (`camera={{ position: [0, 8, 14], fov: 50 }}`); true skeletal fidelity would be effort spent on detail nobody will see.
- **(c) is the right fallback, not the starting point.** It delivers the best visual fidelity while keeping the single-draw-call architecture, but requires a rigging + bake step in a DCC tool (e.g., Blender) that adds pipeline complexity. Since (a)'s shader code is architecturally compatible with upgrading to (c) later (same `InstancedMesh` + custom-shader approach, just a richer per-vertex data source), there's no cost to trying the cheaper option first.

### Consequences

- Fable's bull mesh output must be a **static, unrigged mesh** with legs identifiable by a vertex-height threshold (or an equivalent convention — see [tech-farm-visual-rehaul.md](tech-farm-visual-rehaul.md) for the exact spec).
- `BullHerd.tsx`'s material moves from `MeshStandardMaterial` to a custom `ShaderMaterial` (or `onBeforeCompile`-patched standard material) that accepts a per-instance phase attribute.
- If a future prototype shows the procedural walk looks too crude, escalate to VAT (option c) — this is an intentional escape hatch, not a sign the decision was wrong.
- Bull-to-bull collision avoidance and flocking remain explicitly out of scope regardless of animation approach (see PRD Non-Goals) — this decision only concerns single-bull leg/body animation, not group behavior.

---

## DEC-002: Paid tooling for asset generation and device testing — PARKED

**Date:** 2026-07-11
**Status:** Parked — not decided, revisit later
**Related:** [prd-world-and-chrome-polish.md](prd-world-and-chrome-polish.md), [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md)

### Context

Two open gaps surfaced during the farm rehaul retro that a paid tool could close:

1. **Art quality ceiling.** All current GLB assets are procedurally generated boxes (`scripts/generate-models.mjs`) — cute, but a ceiling on how far the "Animal Crossing meets Monument Valley" vision can go without either a human 3D artist or an AI text-to-3D generator.
2. **No real-device testing.** All mobile performance/layout verification so far has used DevTools emulation (viewport resize, CPU throttling) — never an actual physical phone. The [farm rehaul PRD](prd-farm-visual-rehaul.md) explicitly flagged this as an open question.

The user asked whether they could subscribe to paid tools and have Claude drive generation/testing through them via browser or API. Division of responsibility agreed: **the user handles account creation and payment**; Claude can drive generation via a scripted API integration (preferred) or browser automation (fallback) once credentials/API keys exist.

### Options researched (not yet chosen)

**Text-to-3D generation:**

| Option | API access | Cost | Notes |
|---|---|---|---|
| **Meshy AI** | Yes — REST API, but gated behind the Pro tier and above (no free-tier API access) | Pro: $20/mo for 1,000 credits. Low-poly text-to-3D costs ~20 credits (mesh) + 10 credits (texture) ≈ 30 credits/gen → ~33 textured generations/mo on Pro | Officially documented API ([docs.meshy.ai](https://docs.meshy.ai/en/api/pricing)), credit-based, no per-call free trial for API specifically |
| **Tripo3D** | Yes — separate "Tripo Platform" API, pay-per-call | Third-party resellers quote ~$0.075/generation (untextured) plus add-ons (+$0.15 detailed geometry, +$0.0375 quad mesh); official rate sheet at `platform.tripo3d.ai/docs/billing` not yet directly confirmed | Cheaper per-call than Meshy on paper, but pricing sourced partly via resellers (poyo.ai, wavespeed.ai) — needs direct confirmation from Tripo's own billing docs before committing |
| **Hunyuan3D-2** (Tencent, open-source) | **Free** — self-hosted, or a free public Hugging Face Space (`huggingface.co/spaces/tencent/Hunyuan3D-2`) on shared "ZeroGPU" compute | $0 for the hosted demo; self-hosting needs a 6–16GB VRAM NVIDIA GPU, which this project's dev machine (MacBook Air, no discrete GPU) does not have | Live-tested 2026-07-11 (see below) — genuinely free, but with real caveats |

**Hunyuan3D-2 live test findings (2026-07-11):** Navigated the public HF Space directly via browser automation. Confirmed: (1) no login/paywall on the hosted demo; (2) **only image-to-3D shape generation is active on the public instance** — the Text Prompt tab is visibly disabled, and the page itself states "Text to 3D is disable. To activate it, please run `python gradio_app.py --enable_t23d`" (self-host-only feature); (3) **texture synthesis is also disabled** on the public instance ("Texture synthesis is disable due to missing requirements") — output is untextured geometry only, which actually fits this project fine since coat color is applied at runtime via `instanceColor` anyway; (4) GLB export is supported with a configurable "Target Face Number" (default 10,000 — needs decimation via the project's existing `gltf-transform` step to hit the <300KB budget); (5) output is unrigged, consistent with [DEC-001](#dec-001-bull-walk-animation-uses-a-bone-free-procedural-vertex-shader-not-skeletal-animation)'s static-mesh requirement. **Automation limits hit:** the Gradio UI runs inside an iframe that blocks ref-based element targeting from this session's browser tools; the built-in example gallery didn't populate the input on synthetic clicks; this sandboxed browser session cannot navigate to `localhost` to feed in a reference image of the current bull. A Gradio "Use via API" affordance exists (auto-generated REST/Python client), which is the more promising integration path than continued UI automation, but its exact call schema wasn't confirmed in this pass — worth checking with a `gradio_client` script directly if this option is picked up later. **Net assessment:** usable by a human directly in a real browser (upload an image, click Gen Shape, download GLB, hand the file to Claude for integration/decimation) right now, at zero cost; not yet reliably drivable end-to-end by Claude autonomously in this environment.

**Real-device mobile testing:**

| Option | Cheapest manual-testing plan | Ease of use (per current reviews) |
|---|---|---|
| **BrowserStack** | Desktop & Mobile plan, **$39/mo** (billed annually, individual), unlimited testing minutes, 30,000+ real device units, free trial available | Reviews describe a steeper initial learning curve (30–60 min to get comfortable) but a simpler flow for quick one-off manual "Live" sessions specifically |
| **LambdaTest** (rebranded **TestMu AI** as of this research — same product, new brand) | Real Device Plus Live, **$39/mo per parallel session** (billed annually), unlimited minutes, real iOS/Android devices; free tier exists but limited to 2-minute sessions on emulators/simulators only (no real devices) | Reviews describe smoother onboarding and more modern UI (15–30 min to productivity) for general use |

Both real-device options land at effectively the same $39/mo price point for an individual manual-testing tier — this is not a cost differentiator, it's a UX/workflow preference.

### Why parked, not decided

- The project has no hard deadline and is explicitly meant to stay low-maintenance/free-tier-friendly long-term ([docs/tobu_wall_of_fame_prd.md](../docs/tobu_wall_of_fame_prd.md) §7.4) — a recurring subscription is a real tradeoff against that principle, not a default yes.
- Tripo3D's official per-call pricing wasn't directly confirmed (only third-party resellers) — needs a direct check of `platform.tripo3d.ai/docs/billing` before it's a fair comparison against Meshy.
- No decision needed yet to keep making progress — the procedural asset pipeline and DevTools-emulation testing are both functional stand-ins, just not final-quality.

### To resolve when revisited

- Confirm Tripo3D's official API rate sheet directly (not via resellers)
- Decide: is a one-time single-month subscription (generate a batch of assets, cancel) preferable to an ongoing one, given no hard deadline?
- For device testing: is a single free trial sufficient for one pre-launch check, or is a paid month justified?
- For Hunyuan3D-2: decide between (a) manual human-driven generation via the free hosted Space, handing GLBs to Claude for integration, or (b) inspecting the Gradio "Use via API" schema to script it end-to-end for free — worth trying before paying for Meshy/Tripo3D, since it's free if either path works
- If proceeding with a paid generator instead: user creates the account/API key; Claude writes a `scripts/generate-scenery.mjs`-style script (parallel to the existing `generate-models.mjs`) that calls the API, downloads results, and runs them through the existing `gltf-transform` optimization step already in the project

Sources: [Meshy API pricing](https://docs.meshy.ai/en/api/pricing), [Meshy pricing](https://www.meshy.ai/pricing), [Tripo3D API](https://www.tripo3d.ai/api), [BrowserStack pricing](https://www.browserstack.com/pricing), [TestMu AI (LambdaTest) pricing](https://www.testmuai.com/pricing/), [Hunyuan3D-2 GitHub](https://github.com/Tencent-Hunyuan/Hunyuan3D-2), [Hunyuan3D-2 HF Space](https://huggingface.co/spaces/tencent/Hunyuan3D-2) (live-tested)
