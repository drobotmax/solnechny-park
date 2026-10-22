// Procedural daylight and tree shade; no external textures or render targets.
(function (root) {
  'use strict';
  const glsl = `
    const vec3 SUN = normalize(vec3(-.45,.82,-.32));
    float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float skyNoise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),
        mix(skyHash(i+vec2(0,1)),skyHash(i+vec2(1,1)),f.x),f.y);
    }
    vec3 daylightSky(vec3 ray,float time){
      float elevation=max(ray.y,0.);
      vec3 c=mix(vec3(.76,.83,.87),vec3(.23,.48,.75),pow(elevation,.55));
      float sun=max(dot(ray,SUN),0.);
      c+=vec3(1.,.82,.55)*(.10*pow(sun,12.)+.65*pow(sun,900.));
      vec2 p=ray.xz/(elevation+.28)*2.1+vec2(time*.0015,0.);
      float cloud=.57*skyNoise(p)+.28*skyNoise(p*2.03)+.15*skyNoise(p*4.07);
      float cover=smoothstep(.55,.76,cloud)*smoothstep(.01,.16,elevation);
      return mix(c,vec3(.94,.95,.94),cover*.76);
    }
  `;
  const skyVS = `#version 300 es
    out vec2 vScreen;
    void main(){
      vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
      vScreen=p*2.-1.;gl_Position=vec4(vScreen,1.,1.);
    }
  `;
  const skyFS = `#version 300 es
    precision highp float;
    in vec2 vScreen;
    uniform vec3 uForward,uRight,uUp;
    uniform float uAspect,uTanFov,uTime;
    out vec4 o;
    ${glsl}
    // The shared palette stage is appended before main by the renderer.
  `;

  // A deterministic leaf cluster with clear space between leaves. Mipmaps turn
  // those gaps into coverage at distance, avoiding a repeating screen-space grid.
  function foliageMask(size = 128) {
    const data = new Uint8Array(size * size * 2);
    let seed = 4721;
    const random = () => {
      seed = Math.imul(seed, 1664525) + 1013904223 | 0;
      return (seed >>> 0) / 4294967296;
    };
    for (let i = 0; i < 180; i++) {
      const radius = Math.sqrt(random()) * size * .39, angle = random() * Math.PI * 2;
      const cx = size * .5 + Math.cos(angle) * radius, cy = size * .5 + Math.sin(angle) * radius;
      const a = random() * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const length = size * (.035 + random() * .045), width = length * (.35 + random() * .2);
      const light = .62 + random() * .38;
      for (let y = Math.max(0, Math.floor(cy - length)); y <= Math.min(size - 1, Math.ceil(cy + length)); y++) {
        for (let x = Math.max(0, Math.floor(cx - length)); x <= Math.min(size - 1, Math.ceil(cx + length)); x++) {
          const dx = x + .5 - cx, dy = y + .5 - cy;
          const u = (dx * ca + dy * sa) / length, v = (-dx * sa + dy * ca) / width;
          const distance = u * u + v * v;
          if (distance >= 1) continue;
          const alpha = Math.min(1, (1 - distance) * 8);
          const at = (y * size + x) * 2;
          if (alpha * 255 < data[at]) continue;
          data[at] = Math.round(alpha * 255);
          data[at + 1] = Math.round(255 * light * (Math.abs(v) < .08 ? .78 : 1));
        }
      }
    }
    return {width: size, height: size, data};
  }

  // Store maximum canopy occlusion, rather than stacking thousands of shadows
  // into black. One metre of shade follows the same coordinates as the map.
  function shadowMap(park, trees, size = 1536) {
    const width = size, height = Math.max(1, Math.round(size * park.h / park.w));
    const data = new Uint8Array(width * height);
    const sx = width / (park.w * park.mpp), sz = height / (park.h * park.mpp);
    for (const [x, z, h, crown] of trees) {
      const cx = (x + .45 / .82 * h * .65 - park.x0) * sx;
      const cz = (z + .32 / .82 * h * .65 - park.z0) * sz;
      const rx = (crown * .95 + h * .06) * sx, rz = crown * .95 * sz;
      for (let iy = Math.max(0, Math.floor(cz - rz)); iy <= Math.min(height - 1, Math.ceil(cz + rz)); iy++) {
        for (let ix = Math.max(0, Math.floor(cx - rx)); ix <= Math.min(width - 1, Math.ceil(cx + rx)); ix++) {
          const r = Math.hypot((ix + .5 - cx) / rx, (iy + .5 - cz) / rz);
          if (r >= 1) continue;
          const edge = Math.max(0, Math.min(1, (1 - r) / .38));
          const shade = Math.round(190 * edge * edge * (3 - 2 * edge));
          const i = iy * width + ix;
          data[i] = Math.max(data[i], shade);
        }
      }
    }
    return {width, height, data};
  }
  const api = {glsl, skyVS, skyFS, foliageMask, shadowMap};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ParkAtmosphere = api;
})(typeof window !== 'undefined' ? window : globalThis);
