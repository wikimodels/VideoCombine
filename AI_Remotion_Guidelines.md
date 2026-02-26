# 🤖 REMOTION AI DEVELOPER GUIDELINES (MUSIC VISUALIZATION PROJECT)

**Context:** You are an AI assistant tasked with building highly dynamic, audio-reactive 2D music visualizers using `remotion`, `@remotion/media-utils`, React, and raw SVG. 

**Core Objective:** Create premium, fluid, and heavily styled sci-fi/cyberpunk/neon scenes. Every element must feel alive, breathing, and perfectly synced to the music (especially the bass and high-hats).

### 1. 🏗️ Architecture & Best Practices
*   **Always use `<AbsoluteFill>`** from `remotion` as the root container to ensure scaling and absolute positioning.
*   **Backgrounds:** Start with a very dark/solid background (e.g., `#020205` or `#0a0a0f`) to make neon elements pop.
*   **Heavy reliance on raw `<svg>`:** Instead of complex HTML/CSS or external images, draw complex elements (spaceships, devils, UFOs, EQ bars) using SVG `<path>`, `<circle>`, `<rect>`, and `<ellipse>`.
*   **Group and Transform:** Use `<g transform="...">` tags in SVG extensively. Create a base element at `(0,0)` and then group it inside `<g transform={"translate(x, y) rotate(deg) scale(int)"}>` to move it around the screen. This makes math and relative animations drastically easier.
*   **Memoize Static Data:** If you have an array of particles, stars, or fixed scene objects, ALWAYS wrap their initialization in `useMemo(..., [width, height])`. Never regenerate 150 random stars on every single frame.

### 2. 🎵 Audio Reactivity & Synchronization
*   **The Viz Pipeline:** We use `useAudioData` and `visualizeAudio` from `@remotion/media-utils`.
*   **Extracting Frequencies:** 
    *   **Bass:** Always extract the lowest frequency bins to drive the heaviest animations: `const bass = (viz[0] + viz[1] + viz[2]) / 3;`
    *   **Highs/Snares:** Use higher bins (e.g., `viz[15]` to `viz[20]`) for sharp, quick actions like lightning, glitches, or sparks.
*   **Multiplier Logic:** Never apply raw audio data directly. Always map it to a baseline.
    *   *Bad:* `opacity={bass}`
    *   *Good:* `opacity={0.3 + bass * 0.7}` (Ensures the element is always slightly visible, but spikes on the beat).
    *   *Good (Exponential):* `scale={1 + Math.pow(bass, 2) * 0.5}` (Makes drops hit much harder visually).
*   **Overload State:** Create boolean triggers for heavy drops: `const isOverload = bass > 0.4;`. Use this to trigger screen shakes or massive color inversions.
*   **Avoid Audio Lag:** Always calculate `viz` based directly on the current `frame` and `fps`.

### 3. 🌀 Animation Mechanics (The Math of Movement)
*   **Continuous Fluidity:** Elements should NEVER be fully static, even when there is no music. Use `Math.sin()` and `Math.cos()` tied to the `frame` variable to create continuous, organic loops.
    *   *Drifting/Swaying:* `const swayY = Math.sin(frame * 0.05) * 20;`
    *   *Pulsing (Breathing):* `const pulse = 1 + Math.abs(Math.sin(frame * 0.1)) * 0.1;`
*   **Asymmetry & Phase Offsets:** When animating multiple identical elements (like UFOs or tentacles), always add a `phase` offset (e.g., `Math.sin(frame * 0.05 + phaseIndex)`) so they don't move exactly identically. It breaks the mechanical feel.
*   **Camera Shake:** Create a global wrapper `<g transform={translate(shakeX, shakeY)}>` triggered by `isOverload` to simulate heavy impact: 
    *   `const shakeX = (Math.random() - 0.5) * 20 * (isOverload ? 1 : 0);`

### 4. ✨ Styling, Glows & Neon Aesthetics
*   **Drop-Shadows rule:** The primary way we create the cyberpunk/neon glow effect is via the `style` prop on SVG elements: `style={{ filter: 'drop-shadow(0 0 10px #ff0055)' }}`. It is heavily preferable over native SVG `<radialGradient>` because it renders cleaner and reacts better to CSS transitions.
*   **Dynamic Glows:** Bind the `blur()` or `drop-shadow` blur radius to the bass to make lights visually "bloom" on the beat.
    *   `style={{ filter: 'blur(' + (10 + bass * 20) + 'px)' }}`
*   **Multi-layered Blooms:** For massive light sources (like a disco sparkle or thruster engine), do not rely on one circle. Layer multiple circles with decreasing opacity and increasing blur radius to create a dense core and a wide, soft halo.
*   **Color Palettes:** Use deeply saturated neon hues (`#ff0033` Red, `#00f0ff` Cyan, `#bf00ff` Purple, `#33ff00` Green). Never use dull or desaturated colors unless they are for metallic hulls (`#2a2a35`).

### 5. ⚠️ Common Pitfalls to Avoid
*   **Rendering limits:** Be careful not to map over arrays of 1000+ complex SVG paths per frame (like drawing 1000 detailed spaceships). Keep massive arrays limited to simple primitives (`<rect>`, `<circle>`, `<line>`).
*   **Coordinate Chaos:** Always log or heavily comment your relative X and Y centers. Often assume the center of the screen is `cx = width / 2`, `cy = height / 2` and build outwards from there.
*   **Absolute Overlaps:** In `remotion`, the order of HTML/SVG elements determines Z-index. The last element rendered is on top. Keep backgrounds at the top of the file, midground items in the middle, and HUD/UI text strings at the very bottom of the render block.
