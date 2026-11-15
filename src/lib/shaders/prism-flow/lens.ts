/**
 * Prism Flow, lens pass - derived from "Paper Shaders: Lens" as embedded in
 * "Wayglim Prism Flow" (the "wl-xf3n5k" preset), Copyright 2026 Paper
 * (https://shaders.paper.design), Apache License 2.0.
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * This file is a modified work, ported to MetroMark's shader pipeline. It is
 * the final pass; it samples the field buffer bound as iChannel0 and draws
 * straight to the canvas:
 *   - `u_image` is gone; the field output is sampled as iChannel0.
 *   - `uViewWindow` is gone (full-frame matrix from the Wayglim engine); the
 *     input is used as-is.
 *   - `v_imageUV` is derived from `gl_FragCoord`; the vertex shader declares
 *     no varyings.
 *   - Every uniform is baked to a constant from the preset (angle 2, spread
 *     .7, swirl -.14, count 35, focusCenter .8, focusEdges 1, grainOverlay
 *     .2). `u_imageAspectRatio` is a #define on `iResolution` so it tracks
 *     the window aspect instead of a fixed 16:9 box.
 *   - The remove-backdrop and rounded-frame code paths are deleted: the
 *     preset composites opaque and MetroMark draws full-bleed.
 *   - The two Wayglim engine fixes are applied verbatim: `rn` uses
 *     `boxOutradius()` when `u_lensBulge > 0`, and the lens circle is
 *     clamped at `inradius * 1.015`.
 */
export const LENS = `
precision highp float;
uniform vec3 iResolution;
uniform sampler2D iChannel0;
#define u_imageAspectRatio (iResolution.x/iResolution.y)
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
const float u_spread = 0.7;
const float u_bias = 1.0;
const float u_angle = 2.0;
const float u_perspective = 0.1;
const float u_count = 35.0;
const float u_dispersion = 0.2;
const float u_dispersionShift = 0.11;
const float u_dispersionColor = 0.46;
const float u_focusCenter = 0.8;
const float u_focusEdges = 1.0;
const float u_swirl = -0.14;
const float u_noise = 0.35;
const float u_noiseFrequency = 0.35;
const float u_noiseOffset = 0.0;
const float u_lensBulge = 0.0;
const float u_lensCircle = 0.0;
const float u_grainMixer = 0.0;
const float u_grainOverlay = 0.2;
const float u_imageX = 0.0;
const float u_imageY = 0.0;

out vec4 fragColor;

// === Paper Shaders PAPER_LENS_FRAGMENT_GLSL, engine-transformed (Apache 2.0, Copyright 2026 Paper) ===
float hash21(vec2 p){
p=fract(p*vec2(0.3183099,0.3678794))+ 0.1;
p +=dot(p,p+19.19);
return fract(p.x*p.y);
}
vec2 rotate(vec2 uv,float th){
return mat2(cos(th),sin(th),-sin(th),cos(th))*uv;
}
float valueNoise(vec2 st){
vec2 i=floor(st);
vec2 f=fract(st);
float a=hash21(i);
float b=hash21(i+vec2(1.,0.));
float c=hash21(i+vec2(0.,1.));
float d=hash21(i+vec2(1.,1.));
vec2 u=f*f*(3.-2.*f);
return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
vec4 sampleOverWhite(vec2 uv){
vec4 img=texture(iChannel0,uv);
float cover=img.a;
vec3 colorOverWhite=mix(vec3(1.),img.rgb,cover);
return vec4(colorOverWhite,cover);
}
vec3 hueColor(float hue){
vec3 rgb=clamp(abs(mod(hue*6.+vec3(0.,4.,2.),6.)- 3.)- 1.,0.,1.);
rgb=rgb*rgb*(3.-2.*rgb);
return rgb;
}
float boxInradius(){
return .5*min(u_imageAspectRatio,1.);
}
float boxOutradius(){
return .5*length(vec2(u_imageAspectRatio,1.));
}
float spreadReach(){
return .7*pow(u_spread,1.3+2.7*u_spread);
}
float innerCircleMask(float radius,float inradius){
return 1.-smoothstep(.5*inradius,1.1*inradius,radius);
}
float dispersionCurve(float t,float biasPow){
float mirroredT=u_bias<0.?1.-t:t;
float curved=pow(mirroredT,biasPow);
return u_bias<0.?1.-curved:curved;
}
vec2 getSpread(vec2 fromCenter,float radius,vec2 warpedUV,float edgeAA,float inradius,float outradius,float reach,out float outStrength){
float angleRad=radians(u_angle);
vec2 uniformDir=vec2(cos(angleRad),sin(angleRad));
float invInradius=1./inradius;
vec2 radialDir=fromCenter*invInradius;
float maxLen=(outradius+reach)*invInradius;
float radialLen=radius*invInradius;
if(radialLen>maxLen)radialDir*=maxLen/radialLen;
vec2 spreadDir=mix(uniformDir,radialDir,u_perspective);
float bandProximity=smoothstep(inradius*.8,inradius,radius);
float lensCircleMaxing=bandProximity*u_lensCircle*u_lensCircle*u_lensCircle;
spreadDir=mix(spreadDir,radialDir,lensCircleMaxing);
vec2 warpedAbs=abs(warpedUV-.5);
float inner=mix(1.,smoothstep(0.,mix(inradius,outradius,u_focusCenter),radius),u_focusCenter);
float boxDist=max(warpedAbs.x,warpedAbs.y)*2.;
float outer=mix(1.,1.-min(boxDist,1.),u_focusEdges);
float strength=inner*outer;
strength*=mix(1.,mix(.15,.03,max(-u_lensBulge,0.)),lensCircleMaxing);
vec2 outside=max(warpedAbs-.5,0.);
float margin=max(reach*length(spreadDir)*(1.-u_lensCircle),edgeAA);
strength*=1.-smoothstep(0.,margin,length(outside));
outStrength=strength;
vec2 axis=spreadDir*(reach*strength);
if(u_noise>0.){
float turn=(valueNoise(fromCenter*u_noiseFrequency*18.+u_noiseOffset*30.)- .5)*2.*u_noise;
float cs=cos(turn),sn=sin(turn);
axis=mat2(cs,-sn,sn,cs)*axis;
}
axis.x/=u_imageAspectRatio;
return axis;
}
vec2 lensWarp(vec2 fromCenter,float radius,float inradius,out float bulgeFade){
bulgeFade=1.;
if(u_lensBulge==0.&&u_lensCircle<=0.)return fromCenter;
if(radius<1e-5)return fromCenter;
float r=radius;
if(u_lensBulge!=0.){
float rn=radius/(u_lensBulge>0.?boxOutradius():inradius);
float bulge=abs(u_lensBulge)*(u_lensBulge>0.?1.4:1.2);
if(u_lensBulge>0.)bulgeFade=1.-smoothstep(1.45,1.53,rn*bulge);
float map=u_lensBulge>0.
?tan(min(rn*bulge,1.53))/tan(bulge)
:atan(rn*tan(bulge))/bulge;
float bulgeScale=map/rn;
fromCenter*=bulgeScale;
r*=bulgeScale;
}
if(u_lensCircle>0.){
vec2 dir=fromCenter/max(r,1e-5);
vec2 halfBox=vec2(u_imageAspectRatio,1.)*.5;
float rBox=min(halfBox.x/max(abs(dir.x),1e-4),halfBox.y/max(abs(dir.y),1e-4));
float band=inradius*mix(.03,.2,.5*(u_lensBulge+1.));
float innerEdge=inradius-band;
float over=smoothstep(0.,1.,(r-innerEdge)/band);
float g=r +(rBox-inradius)*pow(over,14.);
fromCenter=dir*mix(r,g,u_lensCircle*(1.-smoothstep(inradius,inradius*1.015,r)));
}
return fromCenter;
}
void main(){
vec2 uv=gl_FragCoord.xy/iResolution.xy;
float invAspect=1./u_imageAspectRatio;
float inradius=boxInradius();
float outradius=boxOutradius();
float reach=spreadReach();
vec2 fromCenter=uv-.5;
fromCenter.x*=u_imageAspectRatio;
float radius=length(fromCenter);
float bulgeFade;
vec2 warpedFromCenter=lensWarp(fromCenter,radius,inradius,bulgeFade);
vec2 baseUV=vec2(warpedFromCenter.x*invAspect,warpedFromCenter.y)+ .5;
vec2 baseDerivative=fwidth(baseUV);
float edgeAA=clamp(2.*max(baseDerivative.x,baseDerivative.y),.001,.02);
float spreadStrength;
vec2 spreadAxis=getSpread(fromCenter,radius,baseUV,edgeAA,inradius,outradius,reach,spreadStrength);
vec2 grainUV=vec2(0.);
if(u_grainMixer>0.||u_grainOverlay>0.){
vec2 dudx=dFdx(uv);
vec2 dudy=dFdy(uv);
grainUV=(uv-.5)*(.8/vec2(length(dudx),length(dudy)))+ .5;
}
if(u_grainMixer>0.){
float grainSeed=valueNoise(grainUV);
vec2 jit=fract(grainSeed*vec2(157.31,113.57))*2.-1.;
spreadAxis +=jit*.3*u_grainMixer*length(spreadAxis);
}
float count=floor(u_count);
int countInteger=int(count);
float invCount=1./count;
float invSpan=1./max(count-1.,1.);
float hueBase=u_dispersionColor+.5;
float biasPower=1.+2.*abs(u_bias);
vec2 tapBias=.5-vec2(u_imageX,u_imageY);
float centerAmount=clamp(1.-u_dispersionShift,0.,1.);
float edgesAmount=clamp(1.+u_dispersionShift,0.,1.);
float dispersion=u_dispersion*mix(edgesAmount,centerAmount,innerCircleMask(radius,inradius));
float dispersionPower=pow(dispersion,.8);
float warpedRadius=length(warpedFromCenter);
float swirlAngle=u_swirl*.4*PI*spreadStrength*u_spread*min(1.,inradius/max(warpedRadius,1e-4));
vec3 colorSum=vec3(0.);
vec3 weightSum=vec3(0.);
float coverSum=0.;
for(int i=0;i<50;i++){
if(i>=countInteger)break;
float layer=float(i);
float hue=hueBase+layer*invCount;
float spread=layer*invSpan;
if(u_bias!=0.)spread=dispersionCurve(spread,biasPower);
float fanPos=1.-2.*spread;
vec2 tapUV=baseUV+spreadAxis*fanPos-.5;
if(u_swirl!=0.){
tapUV.x*=u_imageAspectRatio;
tapUV=rotate(tapUV,swirlAngle*fanPos);
tapUV.x*=invAspect;
}
vec4 tap=sampleOverWhite(tapUV+tapBias);
vec3 weight=1.-dispersionPower*hueColor(hue);
colorSum +=tap.rgb*weight;
weightSum +=weight;
coverSum +=tap.a;
}
vec3 color=colorSum/max(weightSum,1e-4);
float coverAvg=coverSum*invCount;
float ground=min(color.r,min(color.g,color.b));
float alpha=max(coverAvg,1.-ground);
vec3 premult=max(color -(1.-alpha),0.);
fragColor=vec4(premult,alpha)*bulgeFade;
if(u_grainOverlay>0.){
float grain=valueNoise(rotate(grainUV,1.)+ vec2(3.));
grain=mix(grain,valueNoise(rotate(grainUV,2.)+ vec2(-1.)),.5);
grain=pow(grain,1.3);
float grainV=grain*2.-1.;
float grainStrength=pow(u_grainOverlay*abs(grainV),.8)*fragColor.a;
fragColor.rgb=mix(fragColor.rgb,vec3(step(0.,grainV))*fragColor.a,.35*grainStrength);
}
}`
