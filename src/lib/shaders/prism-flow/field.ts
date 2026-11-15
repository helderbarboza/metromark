/**
 * Prism Flow, field pass - derived from "Wayglim Prism Flow" (the "wl-xf3n5k"
 * preset), a WebGL2 renderer built on Paper Shaders, Copyright 2026 Paper
 * (https://shaders.paper.design), Apache License 2.0.
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * This file is a modified work, ported to MetroMark's shader pipeline:
 *   - Every Wayglim uniform is baked to a constant from the pasted preset
 *     ("edge" mode, custom 4-stop palette, path-form band, 38-step march).
 *   - `iResolution` and `iTime` are supplied by the shared pipeline; the
 *     Wayglim loop math (durationSeconds 60, pace 0.5, startSeconds 49.8,
 *     phase 31) is folded into `LOOP_START` and `LOOP_RATE` below.
 *   - The R8 grain noise texture (embedded in the preset as a base64 payload)
 *     is not shipped; the pipeline's generated 128x128 RGBA noise is bound as
 *     iChannel0 instead. The grain is equivalent procedural noise, filtered
 *     LINEAR rather than NEAREST. This differs subtly from upstream.
 *   - The over-backdrop / remove-backdrop / rounded-frame code paths are
 *     deleted: the preset composites opaque and MetroMark draws full-bleed.
 *   - Mask support is deleted (the preset has no masks); the pointer code is
 *     kept but inert (`pointer.enabled` is false, so `uPointer` is zero).
 *   - The final copy pass is deleted (frame coverage is always 1 here).
 */
export const FIELD = `
precision highp float;
precision highp int;
uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;

// ---- Wayglim preset, baked to constants (values derived with the upstream
// arithmetic, not copied raw from the settings file) ----
const float LOOP_START = 1.1401016666666667;
const float LOOP_RATE = 0.008333333333333333;
const float LOOP_RADIANS = 62.83185307179586;
const vec2 uViewOffset = vec2(0.0, 0.0);
const float uZoom = 0.92;
const float uWaveSpeed = 0.5;
const float uWaveHeight = 1.0;
const float uWave1Freq = 3.0;
const float uWave1Amp = 0.0399988;
const float uWave2Freq = 0.4;
const float uWave2Amp = -0.163335375;
const float uWave3FreqX = -0.7;
const float uWave3FreqZ = -0.7;
const float uWave3Amp = 0.163335375;
const float uFoldingOffset = 20.0;
const float uStepBase = 0.1138;
const float uGlowIntensity = 0.007081861111111111;
const float uGlowSpread = 2.402711737506062;
const float uOpaque = 1.0;
const vec3 uBg = vec3(0.0235, 0.0275, 0.0353);
const float uYShift = 0.62;
const float uTiltX = -0.018;
const float uCurveForm = 0.0;
const float uCurveAmp = 0.0;
const float uShading = 0.0;
const vec3 uPalettePhase = vec3(2.4781268488003945, 2.491592854805911, 2.422424015308577);
const vec3 uPaletteBase = vec3(1.6098, 1.69025, 1.7804);
const vec3 uPaletteAmp = vec3(0.15929174492107234, 0.12310259948514489, 0.08333846650856969);
const vec3 uPalette2Amp = vec3(0.2647, 0.21175, 0.1569);
const float uPaletteFreq = 3.206896551724138;
const float uPaletteShift = 1.7592918860102844;
const float uChroma = 1.0;
const float uSaturationX = 0.83125;
const vec2 uColorBalance = vec2(0.0, 0.0);
const float uEdgeFade = 0.0;
const float uPatternSoft = 0.7;
const float uChannelSplit = 0.0168;
const float uEffectArea = 1.0;
const float uGrainAmount = 0.5;
const float uGrainDistribution = 1.0;
const float uGrainScale = 1.92;
const float uGrainSoftness = 0.5;
const float uGrainDistortion = 0.5;
const float uGrainDrift = 0.35;
const float uPremultiply = 1.0;
const vec3 uPointer = vec3(0.0, 0.0, 0.0);
const float uPointerReach = 0.236;
const float uPointerPull = 0.48;
const float uPointerColor = 1.0995574287564276;
const float uPointerGrain = 0.3;
const float uPointerGlow = 0.35;
const float uForm = 4.0;
const float uFormSize = 0.65;
const float uFormRound = 0.35;
const float uFormAngle = 0.0;
const float uPathCount = 48.0;
const vec4 uPath[24] = vec4[24](
  vec4(-0.06, 0.556, -0.0373, 0.5762),
  vec4(-0.0144, 0.5955, 0.009, 0.6129),
  vec4(0.033, 0.6276, 0.0576, 0.6386),
  vec4(0.0827, 0.645, 0.1081, 0.6462),
  vec4(0.1333, 0.6419, 0.1581, 0.6326),
  vec4(0.1824, 0.6192, 0.206, 0.6027),
  vec4(0.229, 0.584, 0.2518, 0.5638),
  vec4(0.2743, 0.5431, 0.2969, 0.5225),
  vec4(0.3198, 0.5031, 0.3432, 0.4856),
  vec4(0.3672, 0.471, 0.3918, 0.4603),
  vec4(0.417, 0.4544, 0.4423, 0.4537),
  vec4(0.4675, 0.4583, 0.4923, 0.4678),
  vec4(0.5165, 0.4813, 0.5401, 0.498),
  vec4(0.5632, 0.5169, 0.5859, 0.5371),
  vec4(0.6084, 0.5578, 0.631, 0.5781),
  vec4(0.654, 0.5974, 0.6774, 0.6147),
  vec4(0.7014, 0.6292, 0.7261, 0.6399),
  vec4(0.7512, 0.6457, 0.7766, 0.6461),
  vec4(0.8018, 0.6412, 0.8266, 0.6316),
  vec4(0.8508, 0.6181, 0.8744, 0.6014),
  vec4(0.8974, 0.5825, 0.9201, 0.5623),
  vec4(0.9426, 0.5416, 0.9653, 0.5213),
  vec4(0.9883, 0.5023, 1.0118, 0.4854),
  vec4(1.0358, 0.4706, 1.06, 0.457)
);

float cfPointerFalloff = 0.0;

out vec4 cfFragColor;

// === Paper Shaders PAPER_GRAIN_NOISE_GLSL (Apache 2.0, Copyright 2026 Paper) ===
vec3 permute(vec3 x){return mod(((x*34.0)+ 1.0)*x,289.0);}
float snoise(vec2 v){
const vec4 C=vec4(0.211324865405187,0.366025403784439,
-0.577350269189626,0.024390243902439);
vec2 i=floor(v+dot(v,C.yy));
vec2 x0=v-i+dot(i,C.xx);
vec2 i1;
i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
vec4 x12=x0.xyxy+C.xxzz;
x12.xy -=i1;
i=mod(i,289.0);
vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))
+ i.x+vec3(0.0,i1.x,1.0));
vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),
dot(x12.zw,x12.zw)),0.0);
m=m*m;
m=m*m;
vec3 x=2.0*fract(p*C.www)- 1.0;
vec3 h=abs(x)- 0.5;
vec3 ox=floor(x+0.5);
vec3 a0=x-ox;
m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
vec3 g;
g.x=a0.x*x0.x+h.x*x0.y;
g.yz=a0.yz*x12.xz+h.yz*x12.yw;
return 130.0*dot(m,g);
}
vec2 rotate(vec2 uv,float th){
return mat2(cos(th),sin(th),-sin(th),cos(th))*uv;
}
float randomR(vec2 p){
vec2 uv=floor(p)/100.+.5;
return texture(iChannel0,fract(uv)).r;
}
float valueNoiseR(vec2 st){
vec2 i=floor(st);
vec2 f=fract(st);
float a=randomR(i);
float b=randomR(i+vec2(1.0,0.0));
float c=randomR(i+vec2(0.0,1.0));
float d=randomR(i+vec2(1.0,1.0));
vec2 u=f*f*(3.0-2.0*f);
float x1=mix(a,b,u.x);
float x2=mix(c,d,u.x);
return mix(x1,x2,u.y);
}
vec4 fbmR(vec2 n0,vec2 n1,vec2 n2,vec2 n3){
float amplitude=0.2;
vec4 total=vec4(0.);
for(int i=0;i<3;i++){
n0=rotate(n0,0.3);
n1=rotate(n1,0.3);
n2=rotate(n2,0.3);
n3=rotate(n3,0.3);
total.x +=valueNoiseR(n0)*amplitude;
total.y +=valueNoiseR(n1)*amplitude;
total.z +=valueNoiseR(n2)*amplitude;
total.z +=valueNoiseR(n3)*amplitude;
n0*=1.99;
n1*=1.99;
n2*=1.99;
n3*=1.99;
amplitude*=0.6;
}
return total;
}

// === CF_MOTION_PAPER_GRAIN_GLSL (Apache 2.0, Copyright 2026 Paper) ===
vec3 paperGrainShape(
vec2 grain_uv,
float intensity,
float amount,
float softness
){
const float u_colorsCount=4.0;
float shape=0.0;
float baseNoise=snoise(grain_uv*.5);
vec4 fbmVals=fbmR(
.002*grain_uv+10.,
.003*grain_uv,
.001*grain_uv,
rotate(.4*grain_uv,2.)
);
float grainDist=baseNoise*snoise(grain_uv*.2)- fbmVals.x-fbmVals.y;
float rawNoise=.75*baseNoise-fbmVals.w-fbmVals.z;
float noise=clamp(rawNoise,0.,1.);
shape +=intensity*2./u_colorsCount*(grainDist+.5);
shape +=amount*10./u_colorsCount*noise;
float aa=fwidth(shape);
shape=clamp(shape-.5/u_colorsCount,0.,1.);
float totalShape=smoothstep(0.,softness+2.*aa,clamp(shape*u_colorsCount,0.,1.));
float mixer=shape*(u_colorsCount-1.);
return vec3(totalShape,mixer,aa);
}
vec3 paperSpectrumStop(float angle){
vec3 color=0.5*(
uPaletteBase +
uPaletteAmp*cos(angle+uPalettePhase)+
uPalette2Amp*cos(2.0*angle)
);
color=clamp(color,0.0,1.0);
float luminance=dot(color,vec3(0.2125,0.7154,0.0721));
return mix(vec3(luminance),color,uChroma);
}
float paperGradientTransition(float mixer,float stopIndex,float softness,float aa){
float localT=clamp(mixer-stopIndex,0.0,1.0);
return smoothstep(0.5-0.5*softness-aa,0.5+0.5*softness+aa,localT);
}
vec3 paperSpectrumGradient(float mixer,float softness,float aa){
const float quarterTurn=1.5707963267948966;
float baseAngle=uPaletteShift+uPointerColor*cfPointerFalloff+2.0*quarterTurn;
vec3 gradient=paperSpectrumStop(baseAngle);
gradient=mix(gradient,paperSpectrumStop(baseAngle+quarterTurn),paperGradientTransition(mixer,0.0,softness,aa));
gradient=mix(gradient,paperSpectrumStop(baseAngle+2.0*quarterTurn),paperGradientTransition(mixer,1.0,softness,aa));
gradient=mix(gradient,paperSpectrumStop(baseAngle+3.0*quarterTurn),paperGradientTransition(mixer,2.0,softness,aa));
return gradient;
}
vec4 paperGrainSample(vec2 grainUv,float intensity,float amount,float softness){
vec3 paperShape=paperGrainShape(grainUv,intensity,amount,softness);
vec3 grainColor=paperSpectrumGradient(paperShape.y,softness,paperShape.z);
return vec4(grainColor,paperShape.x);
}

// === CF_MOTION_FORM_GLSL (Apache 2.0, Copyright 2026 Paper) ===
vec2 cfPathPoint(int i){
vec4 q=uPath[i/2];
return((i % 2==0?q.xy:q.zw)*2.0-1.0)*vec2(1.0,-1.0)*iResolution.xy/min(iResolution.x,iResolution.y);
}
vec2 cfPathUv(vec2 p){
vec2 a=cfPathPoint(0);
float m=1e9,run=0.0,wsum=0.0,asum=0.0,xsum=0.0;
for(int i=1;i<48;i++){
if(float(i)>=uPathCount)break;
vec2 b=cfPathPoint(i),ba=b-a,pa=p-a;
float len=max(length(ba),1e-5);
float h=clamp(dot(pa,ba)/(len*len),0.0,1.0);
float d=length(pa-ba*h);
if(d<m){float k=exp((d-m)*8.0);wsum*=k;asum*=k;xsum*=k;m=d;}
float w=exp((m-d)*8.0);
wsum +=w;
asum +=w*(run+h*len);
xsum +=w*(ba.x*pa.y-ba.y*pa.x)/len;
run +=len;
a=b;
}
float along=asum/wsum-0.5*run;
return vec2(sqrt(along*along+0.36),xsum/wsum);
}
float cfTriangle(vec2 p,float r){
const float k=1.7320508;
p.x=abs(p.x)- r;
p.y=p.y+r/k;
if(p.x+k*p.y>0.0)p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
p.x -=clamp(p.x,-2.0*r,0.0);
return -length(p)*sign(p.y);
}
float cfBox(vec2 p,vec2 b){
vec2 q=abs(p)- b;
return length(max(q,0.0))+ min(max(q.x,q.y),0.0);
}
float cfFormDistance(vec2 p,float R,float rr){
if(uForm<1.5)return length(p)- R;
if(uForm<2.5){float inr=0.606*R;float k=max(1.0-rr/inr,0.05);return cfTriangle(p/k,1.05*R)*k-rr;}
float inr=0.86*R;
float k=max(1.0-rr/inr,0.05);
return cfBox(p/k,vec2(inr))*k-rr;
}
vec2 cfFormUv(vec2 p){
if(uForm>3.5)return cfPathUv(p);
float c=cos(uFormAngle);
float s=sin(uFormAngle);
p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);
float R=uFormSize;
float rr=uFormRound*R*0.45;
if(uForm>1.5&&uForm<2.5)p.y +=0.3*R;
float a=atan(abs(p.x),-p.y);
float along=0.6*R*(a-1.5707963-0.5*sin(2.0*a));
return vec2(along,cfFormDistance(p,R,rr));
}

// === CF_MOTION_SHEET_GLSL (Apache 2.0, Copyright 2026 Paper) ===
float dispersionCurveProfile(float u){
if(uCurveForm<0.5)return 0.0;
if(uCurveForm<1.5)return u*u;
if(uCurveForm<2.5)return -(u*u);
if(uCurveForm<3.5)return u*(u*u-1.1);
if(uCurveForm<4.5)return sin(u*1.7);
float c=exp(1.15*u);
return 0.5*(c+1.0/c)- 1.0;
}
float dispersionCurveSlope(float u){
if(uCurveForm<0.5)return 0.0;
if(uCurveForm<1.5)return 2.0*u;
if(uCurveForm<2.5)return -2.0*u;
if(uCurveForm<3.5)return 3.0*u*u-1.1;
if(uCurveForm<4.5)return 1.7*cos(u*1.7);
float c=exp(1.15*u);
return 0.575*(c-1.0/c);
}
struct DispersionSheetResult{
vec3 color;
float sheetW;
vec3 sheetAcc;
};
DispersionSheetResult marchDispersionSheet(vec2 viewUv,float timeElapsed){
vec3 rayDir=normalize(vec3(viewUv,1.0));
float paletteShift=uPaletteShift+uPointerColor*cfPointerFalloff;
vec3 accumulatedColor=vec3(0.0);
float totalDistance=0.0;
float sheetW=0.0;
vec3 sheetAcc=vec3(0.0);
for(int marchIndex=0;marchIndex<38;marchIndex++){
vec3 currentPos=rayDir*totalDistance;
currentPos.z -=2.0;
float wTime=timeElapsed*uWaveSpeed;
float waveHeight=(
sin(currentPos.x*uWave1Freq+wTime)*uWave1Amp +
sin(currentPos.z*uWave2Freq-wTime*0.6)*uWave2Amp +
sin(currentPos.x*uWave3FreqX-currentPos.z*uWave3FreqZ+wTime*1.6)*uWave3Amp
)*uWaveHeight;
waveHeight +=uCurveAmp*7.0*dispersionCurveProfile(currentPos.x/7.0);
float distToWave=abs(currentPos.y-waveHeight);
float distToWaveR=abs(currentPos.y -(waveHeight-uChannelSplit));
float distToWaveB=abs(currentPos.y -(waveHeight+uChannelSplit));
if(totalDistance>0.7){
float sheetBlend=0.15/(distToWave*distToWave+0.01);
float causticW=sheetBlend*sheetBlend;
sheetW +=causticW;
sheetAcc +=vec3(currentPos.x,currentPos.z,waveHeight)*causticW;
}
currentPos/=uFoldingOffset;
float stepSize=min(distToWave-0.080,0.0)+ uStepBase;
totalDistance +=stepSize;
if(totalDistance>=36.5)break;
float patternX=sin(currentPos.x+cos(currentPos.y)*cos(currentPos.z));
float patternY=sin(currentPos.z+sin(currentPos.y)*cos(currentPos.x+timeElapsed));
float basePattern=smoothstep(0.5-0.34*uPatternSoft,0.7+0.22*uPatternSoft,patternX*patternY);
basePattern=mix(basePattern,0.78,uPatternSoft*0.7);
float blendFactor=0.15/(distToWave*distToWave+0.01);
float mixedPattern=mix(basePattern,1.0,blendFactor);
vec3 channelMix=vec3(
mix(basePattern,1.0,0.15/(distToWaveR*distToWaveR+0.01)),
mixedPattern,
mix(basePattern,1.0,0.15/(distToWaveB*distToWaveB+0.01))
);
float glowIntensity=uGlowIntensity/(uGlowSpread+stepSize);
float distanceFade=smoothstep(36.5,7.3,totalDistance);
vec3 paletteColor=uPaletteBase+uPaletteAmp*cos(totalDistance*uPaletteFreq+uPalettePhase+paletteShift);
paletteColor +=uPalette2Amp*cos(2.0*(totalDistance*uPaletteFreq+paletteShift));
paletteColor=max(paletteColor,vec3(0.0));
paletteColor=mix(vec3(dot(paletteColor,vec3(1.0/3.0))),paletteColor,uChroma);
float shadeMix=uShading*clamp(blendFactor,0.0,1.0);
if(shadeMix>0.0){
vec3 wavePos=currentPos*uFoldingOffset;
float dWdx=(
cos(wavePos.x*uWave1Freq+wTime)*uWave1Freq*uWave1Amp +
cos(wavePos.x*uWave3FreqX-wavePos.z*uWave3FreqZ+wTime*1.6)*uWave3FreqX*uWave3Amp
)*uWaveHeight+uCurveAmp*dispersionCurveSlope(wavePos.x/7.0);
float dWdz=(
cos(wavePos.z*uWave2Freq-wTime*0.6)*uWave2Freq*uWave2Amp -
cos(wavePos.x*uWave3FreqX-wavePos.z*uWave3FreqZ+wTime*1.6)*uWave3FreqZ*uWave3Amp
)*uWaveHeight;
vec3 sheetNormal=normalize(vec3(-dWdx,1.0,-dWdz));
float lit=0.5+0.5*dot(sheetNormal,normalize(vec3(-0.4,0.85,-0.3)));
float shade=mix(1.0,0.28+1.25*lit,shadeMix);
paletteColor*=shade;
}
accumulatedColor +=glowIntensity*channelMix*distanceFade*paletteColor;
}
DispersionSheetResult result;
result.color=accumulatedColor;
result.sheetW=sheetW;
result.sheetAcc=sheetAcc;
return result;
}

// === CF_MOTION_COMPOSE_GLSL (Apache 2.0, Copyright 2026 Paper) ===
float generateFineNoise(vec2 p){
vec3 p3=fract(vec3(p.xyx)*8.6231);
p3 +=dot(p3,p3.yzx+67.92);
return fract((p3.x+p3.y)*p3.z);
}
float dispersionEffectRegionMask(float area,vec3 lightColor){
float peak=max(lightColor.r,max(lightColor.g,lightColor.b));
float trough=min(lightColor.r,min(lightColor.g,lightColor.b));
float chroma=max(peak-trough,0.0);
float wholeWave=smoothstep(0.015,0.12,peak);
float core=smoothstep(0.14,0.65,peak);
float glow=smoothstep(0.045,0.20,peak)*(1.0-smoothstep(0.50,0.90,peak));
float bands=wholeWave*smoothstep(0.035,0.24,chroma);
float veil=smoothstep(0.008,0.075,peak)*(1.0-smoothstep(0.18,0.48,peak));
if(area<0.5)return wholeWave;
if(area<1.5)return core;
if(area<2.5)return glow;
if(area<3.5)return bands;
return veil;
}
vec4 composeDispersionSheet(
DispersionSheetResult sheet,
vec2 fragCoord,
float effectTime,
float grainDistribution,
float edgeFade
){
vec3 light=sheet.color*(1.0+uPointerGlow*cfPointerFalloff);
float areaMask=dispersionEffectRegionMask(uEffectArea,light);
float grainAmount=min(1.0,uGrainAmount+uPointerGrain*cfPointerFalloff);
if(grainAmount>0.0&&areaMask>0.0){
float driftPhase=effectTime*0.1;
vec2 drift=vec2(cos(driftPhase),sin(driftPhase))*(96.0*uGrainDrift);
float grainReferenceScale=720.0/max(min(iResolution.x,iResolution.y),1.0);
vec2 normalizedGrainCoord=fragCoord*grainReferenceScale;
vec2 grain_uv=normalizedGrainCoord*uGrainScale+drift;
float projectedSurfaceHit=1.0-exp(-0.035*max(sheet.sheetW,0.0));
float surfaceDistribution=pow(clamp(projectedSurfaceHit,0.0,1.0),0.75);
float distributionMask=mix(1.0,surfaceDistribution,grainDistribution);
float mappedGrainAmount=grainAmount;
float amountGate=smoothstep(0.0,0.05,mappedGrainAmount);
vec4 primaryGrain=paperGrainSample(grain_uv,uGrainDistortion*amountGate,mappedGrainAmount,uGrainSoftness);
vec4 secondaryGrain=paperGrainSample(grain_uv+vec2(173.17,-91.73),uGrainDistortion*amountGate,mappedGrainAmount,uGrainSoftness);
vec4 tertiaryGrain=paperGrainSample(grain_uv+vec2(-247.61,149.29),uGrainDistortion*amountGate,mappedGrainAmount,uGrainSoftness);
float secondaryDensity=smoothstep(0.48,0.82,mappedGrainAmount);
float tertiaryDensity=smoothstep(0.72,1.0,mappedGrainAmount);
float grainMask=areaMask*distributionMask;
float primaryOpacity=clamp(primaryGrain.a*grainMask*1.55,0.0,1.0);
float secondaryOpacity=clamp(secondaryGrain.a*grainMask*secondaryDensity*1.35,0.0,1.0);
float tertiaryOpacity=clamp(tertiaryGrain.a*grainMask*tertiaryDensity*1.20,0.0,1.0);
float grainOpacity=1.0 -(1.0-primaryOpacity)*(1.0-secondaryOpacity)*(1.0-tertiaryOpacity);
float grainWeight=primaryOpacity+secondaryOpacity+tertiaryOpacity;
vec3 grainColor=(
primaryGrain.rgb*primaryOpacity +
secondaryGrain.rgb*secondaryOpacity +
tertiaryGrain.rgb*tertiaryOpacity
)/max(grainWeight,1e-5);
vec3 paperOver=mix(light,grainColor,grainOpacity);
vec3 grainEmission=grainColor*grainOpacity;
vec3 luminousSurface=light +(vec3(1.0)- clamp(light,0.0,1.0))*grainEmission;
light=mix(paperOver,luminousSurface,grainDistribution);
}
float luminance=dot(light,vec3(0.2125,0.7154,0.0721));
light=mix(vec3(luminance),light,uSaturationX);
vec3 balanceStops=vec3(
0.45*uColorBalance.x+0.25*uColorBalance.y,
-0.25*uColorBalance.x+0.25*uColorBalance.y,
-0.25*uColorBalance.x-0.45*uColorBalance.y
);
light*=exp2(balanceStops);
if(edgeFade>0.0){
vec2 screen=fragCoord/max(iResolution.xy,vec2(1.0));
vec2 edge=min(screen,1.0-screen);
float fade=smoothstep(0.0,edgeFade,edge.x)*smoothstep(0.0,edgeFade,edge.y);
light*=fade;
}
float dither=(generateFineNoise(fragCoord+vec2(12.34,56.78))- 0.5)/128.0;
light +=vec3(dither);
float lum=clamp(max(light.r,max(light.g,light.b)),0.0,1.0);
float keyed=mix(lum,lum*lum*(3.0-2.0*lum),0.5);
float alpha=mix(keyed,1.0,uOpaque);
float bgLum=dot(uBg,vec3(0.2125,0.7154,0.0721));
float sourceGain=mix(keyed,1.0,bgLum*uOpaque);
vec3 rgb=light*sourceGain+uBg*(1.0-keyed)*uOpaque;
vec4 composite=vec4(rgb,alpha);
return composite;
}

void main(){
vec2 fragCoord=gl_FragCoord.xy+uViewOffset;
vec2 sheetCoord=fragCoord;
if(uPointer.z>0.001){
vec2 toPointer=(fragCoord-uPointer.xy)/min(iResolution.x,iResolution.y);
cfPointerFalloff=uPointer.z*exp(-dot(toPointer,toPointer)/(uPointerReach*uPointerReach));
sheetCoord=uPointer.xy +(fragCoord-uPointer.xy)*(1.0+uPointerPull*cfPointerFalloff);
}
vec2 uv;
if(uForm>0.5){
uv=cfFormUv((2.0*sheetCoord-iResolution.xy)/min(iResolution.x,iResolution.y))*uZoom;
}else{
uv=(2.0*sheetCoord-iResolution.xy)/iResolution.y*uZoom;
uv.y +=uYShift;
uv.y +=uTiltX*uv.x;
}
float loopTime=fract(LOOP_START+iTime*LOOP_RATE)*LOOP_RADIANS;
DispersionSheetResult sheet=marchDispersionSheet(uv,loopTime);
vec4 color=composeDispersionSheet(sheet,fragCoord,loopTime,uGrainDistribution,uEdgeFade);
color=clamp(color,0.0,1.0);
if(uPremultiply>0.5)color.rgb*=color.a;
cfFragColor=color;
}`
