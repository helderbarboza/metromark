/**
 * Adapter shared by every Swiss Alps pass.
 *
 * The export is GLSL ES 3.00: `uint` hashes, bitwise masking, `texelFetch`, array
 * constructors and `uint`-sized arrays are all essential to it, so the passes are
 * compiled as ES 3.00 (`glslVersion: 300` in the definition) rather than rewritten
 * into ES 1.00 the way Himalayas had to be. Shadertoy supplies the uniforms and the
 * `main` wrapper; this prelude supplies the same things, and nothing else about a
 * pass is touched.
 */
export const PRELUDE = `
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
/** Local wall-clock time of day, 0 at midnight and .5 at noon. */
uniform float iTimeOfDay;
uniform vec4 iMouse;
uniform int iFrame;
uniform vec3 iChannelResolution[4];

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

out vec4 fragColor;
`

/**
 * Shadertoy calls `mainImage` with the pixel coordinate measured from the bottom
 * left, which is exactly `gl_FragCoord.xy`.
 */
export const EPILOGUE = `
void main() {
  vec4 color = vec4(0.);
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`
