export const PRELUDE = `
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
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

export const EPILOGUE = `
void main() {
  vec4 color = vec4(0.);
  mainImage(color, gl_FragCoord.xy);
  fragColor = color;
}
`
