# Blog lighting bundle

The blog uses Shaders 4.0.4 with three components: Godrays on the home cover,
and MeshGradient followed by LightLeak on inner page headers. The committed
ES module in `assets/vendor/shaders` is served by Hugo; production pages do
not load a CDN or require an account. The integration disables telemetry.

To reproduce the bundle from this directory:

```powershell
npm ci --ignore-scripts
node build.cjs
Copy-Item -LiteralPath shaders-4.0.4.js -Destination ../../assets/vendor/shaders/shaders-4.0.4.js
```

The build replaces both internal registry imports used by this exact version
with `selected-registry.js`. This removes unused effects without modifying the
installed package. Review the registry paths and component APIs before changing
the pinned version. `bundle-report.json` records the components and size.

The current output is 1,296,034 bytes (309,017 bytes gzip), with SHA-256
`423c515ab50bba6ff6d21e9189af934b27eab38fca61a63d3a302d8d0e30a624`.
Keep `assets/vendor/shaders/THIRD-PARTY-LICENSES.txt` alongside the bundle;
the footer partial publishes both resources. This file contains the license
notices for Shaders and its bundled dependencies.

`assets/js/journal-shaders.js` bounds the framebuffer, pauses rendering off
screen and in hidden tabs, and keeps static CSS decorations when WebGPU is
unavailable. Reduced motion, data-saving mode, and desk iframe previews skip
the GPU engine. All canvases are decorative and do not capture pointer events.

Upstream: https://github.com/shader-effects-inc/shaders
