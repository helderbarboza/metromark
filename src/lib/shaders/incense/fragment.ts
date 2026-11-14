/**
 * Incense - an original arrangement of noise snippets from The Book of
 * Shaders (https://thebookofshaders.com), after Morgan McGuire
 * (https://www.shadertoy.com/view/4dS3Wd).
 *
 * The 2D `random`/`noise` functions below are The Book of Shaders' value-noise
 * example (CC BY-NC-SA 3.0; https://creativecommons.org/licenses/by-nc-sa/3.0/).
 * The Book of Shaders material is non-commercial; MetroMark is distributed
 * free of charge and does not use this work commercially. Redistribution and
 * derivatives must keep this attribution and the same license.
 *
 * The iterated smoke body and colour ramp around those functions are an
 * original composition in the same style.
 */
export const FRAGMENT_SHADER = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

//
// 2D Random
//
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

//
// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
//
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float t = iTime / 10.;
    vec2 p = 100. * fragCoord/(iResolution.xy);
    float y = p.y/100.;
    p.y += sin(2.*t);
    p.x += cos(5.*t);
    p *= .125*mat2(sin(t/2.),-cos(t/2.),cos(t/2.),sin(t/2.));
    for (float i = 0.; i < 8.; i++) {
        fragColor=cos(p.xxxx*.3)*.5+.5;
        float n = noise(p/5.);
        fragColor *= n;
        p.x += sin(p.y + iTime*.3 + i);
        p*=mat2(6,-8,8,6)/8.;
    }
    fragColor *= 1. - smoothstep(0., .86, y);
    fragColor *= vec4(0.2, 0.23, 0.52, 1.);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`
