/**
 * Swiss Alps - https://www.shadertoy.com/view/ttcSD8
 * by piyushslayer - CC BY-NC-SA 3.0 (Attribution-NonCommercial-ShareAlike 3.0
 *   Unported; https://creativecommons.org/licenses/by-nc-sa/3.0/).
 *
 * Non-commercial use only. Redistribution and derivatives must keep this
 * attribution and the same CC BY-NC-SA 3.0 license. MetroMark is distributed
 * free of charge and does not use this work commercially.
 *
 * Embedded third-party material whose licenses are unverified; treat them as
 * CC BY-NC-SA 3.0 as well:
 *   - robobo1221's fake atmospheric scattering (https://www.shadertoy.com/view/4tVSRt),
 *     slightly modified, in common.ts.
 *   - the lens flare routine (https://www.shadertoy.com/view/XdfXRX), in image.ts.
 *
 * Five buffer passes and an image pass: A generates the tileable Perlin-Worley
 * noise, B ray marches the terrain, C ray marches the clouds, D runs TXAA over the
 * clouds, and the image pass blurs, composites, scatters, flares and tonemaps. The
 * pass bodies are copied verbatim from the export; the only behavioural change is
 * `getSun` in Common, which takes the sun's position from the viewer's wall clock
 * (`iTimeOfDay`) instead of running its own cycle, so the day/night the shader was
 * built around is now the real one. Holding the pointer down still drags the sun,
 * exactly as upstream.
 *
 * Why this needs WebGL2 and ES 3.00:
 *   - `uint` hashes with XOR/multiply (`hash13`, `hash33`), `ivec2 & 255` masks and
 *     `texelFetch` are all ES 3.00-only. The export is compiled as-is, not rewritten.
 *   - Buffers are float render targets. Buffer B packs the marched terrain distance
 *     into alpha (`CAMERA_FAR` means "sky") and Buffer C carries the cloud
 *     transmittance there, neither of which survives 8-bit targets.
 *
 * Buffer A is the odd one: it regenerates only when `int(BufferB.texel(0,0).r)` stops
 * matching `iResolution.x`, which is how upstream detects a resize. That works here
 * unchanged because each pass's channels are rebound after every resize and a fresh
 * target reads as zero.
 *
 * Cost: 18 cloud steps with a 6-step light march each, on top of a 200-step terrain
 * march with 12-octave normals and an 80-step shadow march - but only for one pixel
 * in sixteen per pass per frame (`writeToPixel`), with the rest carried forward. So
 * the pipeline takes 16 frames to fill in after a resize, and a moving sun needs
 * those frames to settle. It defaults to a reduced render scale.
 */
import type { ShaderDefinition } from '../types'
import { VERTEX_SHADER } from '../vertex'
import { EPILOGUE, PRELUDE } from './adapter'
import { BUFFER_A } from './buffer-a'
import { BUFFER_B } from './buffer-b'
import { BUFFER_C } from './buffer-c'
import { BUFFER_D } from './buffer-d'
import { COMMON } from './common'
import { IMAGE } from './image'

/** Every pass is compiled as prelude + Common tab + the pass itself + main(). */
const pass = (body: string) => `${PRELUDE}\n${COMMON}\n${body}\n${EPILOGUE}`

/**
 * The export's value noise, used for the terrain and for the cloud coverage texture.
 * Sampled with `texelFetch(... & 255)`, so it must stay 256 square and must not be
 * filtered or resized on the way in.
 */
const VALUE_NOISE_URL = new URL('./value-noise.png', import.meta.url).href
/**
 * The export's blue noise, used to rotate the cloud march start. Sampled with
 * `texelFetch(... & 1023)`, so it must stay 1024 square.
 */
const BLUE_NOISE_URL = new URL('./blue-noise.png', import.meta.url).href

export const swissAlps: ShaderDefinition = {
  id: 'swiss-alps',
  name: 'Swiss Alps',
  vertexShader: VERTEX_SHADER,
  fragmentShader: pass(IMAGE),
  glslVersion: 300,
  renderScale: 0.5,
  passes: [
    {
      id: 'a',
      fragmentShader: pass(BUFFER_A),
      // iChannel1 is Buffer B: its first texel stores the width the terrain pass is
      // rendering at, which is how this pass notices a resize.
      channels: [{ buffer: 'a' }, { buffer: 'b' }],
      // Buffer C samples this with wrapped world-space coordinates.
      wrap: 'repeat',
    },
    {
      id: 'b',
      fragmentShader: pass(BUFFER_B),
      // iChannel0 is the export's value noise (repeat, vflip=true upstream);
      // iChannel1 is this pass's own previous frame, for the 1-in-16 update.
      channels: [
        {
          texture: { image: VALUE_NOISE_URL, wrap: 'repeat', flipY: true, noiseFallback: 256 },
        },
        {
          buffer: 'b',
        },
      ],
      // rgb = terrain colour, a = marched distance (CAMERA_FAR marks sky).
      wrap: 'clamp',
    },
    {
      id: 'c',
      fragmentShader: pass(BUFFER_C),
      // Upstream order: B (terrain distance), own previous frame, A (cloud noise),
      // blue noise. The own-frame channel is declared nearest upstream; it is read
      // at texel centres, where nearest and linear agree.
      channels: [
        { buffer: 'b' },
        { buffer: 'c' },
        { buffer: 'a' },
        {
          texture: { image: BLUE_NOISE_URL, wrap: 'repeat', flipY: false, noiseFallback: 1024 },
        },
      ],
      // rgb = scattered cloud light, a = transmittance (1 = clear sky).
      wrap: 'clamp',
    },
    {
      id: 'd',
      fragmentShader: pass(BUFFER_D),
      // iChannel0 is Buffer C, iChannel1 is this pass's own TXAA history.
      channels: [{ buffer: 'c' }, { buffer: 'd' }],
      wrap: 'clamp',
    },
    {
      id: 'image',
      fragmentShader: pass(IMAGE),
      // iChannel0 = terrain, iChannel1 = clouds (its alpha feeds the light scatter
      // and the lens flare mask).
      channels: [{ buffer: 'b' }, { buffer: 'd' }],
    },
  ],
}
