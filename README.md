# Kaleidoscope

A web app that transforms any image into an endlessly animating kaleidoscope pattern. Upload a photo and watch it fold into a live, scrolling hexagonal tessellation driven entirely by the HTML5 Canvas API.

Built with **Next.js 14**, **React 18**, and **TypeScript**. No WebGL, no external rendering libraries — just 2D canvas math.

---

## Features

- Upload any image (PNG, JPG, GIF) to use as the pattern source
- Live animation at a selectable frame rate (20 / 30 / 40 / 60 / 90 / 120 FPS)
- Fullscreen mode — controls fade in on hover
- Responsive canvas that scales to fit any screen width

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How the Kaleidoscope is Generated

The effect is built in six stages each frame. There is no 3D rendering or shader involved — it is all affine 2D canvas transforms applied to a tiled image pattern.

### 1. The base geometry

Everything is built from a single **equilateral triangle** with:

```
side length  = PAT_DIM = 150 px
height       = (√3 / 2) × PAT_DIM ≈ 129.9 px
```

`√3/2` is `sin(60°)` — the height of a unit equilateral triangle. This triangle is the atomic tile from which the whole pattern is assembled.

### 2. Filling triangles with the image

The uploaded image is registered as a `CanvasPattern` with `ctx.createPattern(img, 'repeat')`. This tiles the image infinitely across the canvas coordinate space. When a triangle path is filled with this pattern, the region of the image that falls inside the triangle's bounds is what gets drawn.

The key insight: the pattern is fixed to the **canvas coordinate system**, not to the triangle. So if the canvas transform shifts, the texture inside the triangles shifts too — which is how the scrolling animation works.

### 3. Building a hexagonal cell with 120° rotations

The `fn` function draws one triangular group by rotating 120° between each triangle:

```
draw triangle at base position
→ rotate 120° around (PAT_DIM, 0)
→ draw triangle
→ rotate 120° again
→ draw triangle
→ rotate 120° again
→ draw fourth triangle (for tiling overlap)
```

Three 120° steps = one full 360° cycle. This gives the pattern its **3-fold rotational symmetry** — equilateral triangles tile naturally at 120° intervals, so three of them exactly fill the space around a shared vertex.

### 4. Mirror symmetry

After the rotational group is drawn, the second half of `fn` applies:

```js
ctx.scale(-1, -1)  // flip both axes
```

This renders a mirror-image copy of the same triangle group on top. The mirror layer fills the gaps between the rotational tiles and creates the **reflective symmetry** that makes the result look like a kaleidoscope rather than a plain geometric tile.

### 5. Two interleaved calls fill the honeycomb

A single call to `fn` only covers one triangular orientation. A hexagonal grid requires two interlocking orientations (like upward- and downward-pointing triangles fitting together). Each frame runs:

```js
fn(false)                                  // "even row" triangles
ctx.translate(1.5 × PAT_DIM, TRI_HEIGHT)   // shift to the odd-row offset
fn(true)                                   // "odd row" triangles
ctx.translate(-1.5 × PAT_DIM, -TRI_HEIGHT) // restore origin
```

The `alternateMode = true` flag shifts one subgroup inside `fn` by an additional `3 × PAT_DIM`, so the two calls interlock perfectly without overlap and tile the plane completely.

### 6. Pixel stamping for performance

Re-drawing the entire 1024×900 canvas through canvas transforms every frame would be expensive. Instead:

1. The two `fn` calls only render the **first tile** — a strip `3 × PAT_DIM` wide and `PATTERN_HEIGHT` tall.
2. `tile()` reads that strip's raw pixels with `ctx.getImageData` and stamps copies of it across the rest of the canvas with `ctx.putImageData`.

This works because the hexagonal pattern is periodic — that narrow strip is the **minimal repeating unit** of the full tessellation.

### 7. The scrolling animation

```js
offsetRef.current = (offsetRef.current - 1) % 1024
```

`offset` decrements by 1 on every `fn` call (twice per frame). It is fed into the canvas translations inside `fn`, which shifts the pattern fill relative to the triangles. Because the fill is anchored to the canvas, the image texture appears to continuously drift through the geometry — producing the hypnotic scrolling effect without ever resetting or redrawing from scratch.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout, font, metadata
│   ├── page.tsx         # Entry point
│   └── globals.css      # Tailwind base + body background
└── features/
    └── kaleidoscope/
        └── index.tsx    # Canvas logic, animation loop, UI
```

All rendering logic lives in `src/features/kaleidoscope/index.tsx`. The canvas is controlled via refs (`canvasRef`, `intervalRef`, `tickRef`, `offsetRef`) so React state changes never interrupt the animation loop.
