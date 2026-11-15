/**
 * Prism Flow - derived from "Wayglim Prism Flow" (the "wl-xf3n5k" preset),
 * a WebGL2 renderer built on Paper Shaders, Copyright 2026 Paper
 * (https://shaders.paper.design).
 * Includes Paper Shaders (https://shaders.paper.design), Copyright 2026 Paper,
 * licensed under the Apache License, Version 2.0
 * (https://www.apache.org/licenses/LICENSE-2.0).
 *
 * This shader is a modified work; see `field.ts` and `lens.ts` for the list
 * of changes. The modifications were made for MetroMark, a free and
 * non-commercial browser extension; they do not imply Paper's endorsement.
 *
 * The upstream look is a glowing dispersion band sweeping a curved path
 * across the lower edge of the screen (their "edge" mode). It renders in
 * two passes: the raymarched dispersion sheet (38 steps) into an RGBA16F
 * buffer, then a 35-tap "lens" pass that splits it into hues and draws to
 * the canvas. Full-screen at 0.5 render scale because of the march, like
 * Swiss Alps.
 *
 * The preset is baked as constants; MetroMark shaders have no per-user
 * knobs. Selection, persistence and the settings UI all key off `id`.
 */
import type { ShaderDefinition } from '$lib/shaders/types'
import { VERTEX_SHADER } from '$lib/shaders/vertex'
import { FIELD } from './field'
import { LENS } from './lens'

export const prismFlow: ShaderDefinition = {
  id: 'prism-flow',
  name: 'Prism Flow',
  vertexShader: VERTEX_SHADER,
  // The lens pass is the final pass; it is what the canvas sees.
  fragmentShader: LENS,
  glslVersion: 300,
  renderScale: 0.5,
  passes: [
    {
      id: 'field',
      fragmentShader: FIELD,
      channels: [
        // Upstream binds an R8 128x128 grain texture (embedded as base64 in
        // the preset). MetroMark does not ship it; the pipeline's generated
        // 128x128 RGBA noise is bound instead.
        { texture: { noise: 128 } },
      ],
    },
    {
      id: 'lens',
      fragmentShader: LENS,
      channels: [{ buffer: 'field' }],
    },
  ],
}
