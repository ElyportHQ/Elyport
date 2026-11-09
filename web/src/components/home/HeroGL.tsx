"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time chrome gate. A fragment shader shades the five nested arches as polished
 * chrome tubes that reflect a pearl and holographic sky. Light and reflections follow the
 * pointer (or drift on their own), and the arches shift in depth for parallax.
 * Falls back to the SVG arches when WebGL is unavailable.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform float uHp;
uniform vec2 uPtr;

vec3 holoTint(float x) {
  vec3 pink = vec3(0.969, 0.784, 0.878);
  vec3 blue = vec3(0.749, 0.843, 1.0);
  vec3 mint = vec3(0.776, 0.961, 0.902);
  float f = fract(x);
  if (f < 0.333) return mix(pink, blue, f * 3.0);
  if (f < 0.666) return mix(blue, mint, (f - 0.333) * 3.0);
  return mix(mint, pink, (f - 0.666) * 3.0);
}

vec3 env(vec3 R) {
  float y = R.y;
  vec3 sky = mix(vec3(0.93, 0.94, 0.985), vec3(1.0), smoothstep(0.15, 0.9, y));
  vec3 holo = mix(vec3(0.97, 0.80, 0.89), vec3(0.76, 0.85, 1.0), smoothstep(-0.7, 0.0, R.x));
  holo = mix(holo, vec3(0.80, 0.965, 0.91), smoothstep(0.0, 0.75, R.x));
  vec3 ground = mix(vec3(0.60, 0.645, 0.72), vec3(0.88, 0.90, 0.93), smoothstep(-1.0, -0.15, y));
  vec3 c;
  if (y > 0.0) c = mix(holo, sky, smoothstep(0.0, 0.32, y));
  else c = mix(holo * 0.93, ground, smoothstep(0.0, -0.22, y));
  c -= 0.2 * smoothstep(0.0, -0.05, y) * (1.0 - smoothstep(-0.05, -0.28, y));
  // vertical window light: a crisp white streak running down the pillars
  c += exp(-pow((R.x - 0.42) / 0.07, 2.0)) * 0.55 + exp(-pow((R.x + 0.55) / 0.12, 2.0)) * 0.18;
  return c;
}

void arch(int i, out float r, out float w) {
  if (i == 0) { r = 270.0; w = 34.0; }
  else if (i == 1) { r = 216.0; w = 28.0; }
  else if (i == 2) { r = 168.0; w = 22.0; }
  else if (i == 3) { r = 124.0; w = 17.0; }
  else { r = 86.0; w = 13.0; }
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 v = (px - uRes * 0.5) / uScale + vec2(720.0, 480.0);
  vec2 o = vec2(720.0, 790.0);
  float k = 1.0 + 1.8 * uHp;
  v = (v - o) / k + o;
  float aa = 1.2 / (uScale * k);

  float cover = 0.0;
  float shade = 0.0;
  vec3 col = vec3(0.0);

  for (int i = 0; i < 5; i++) {
    float r; float w;
    arch(i, r, w);
    float depth = 2.0 - float(i);
    vec2 c = vec2(720.0, 730.0) + uPtr * vec2(9.0, 5.0) * depth;
    vec2 q = v - c;
    float d; vec2 dir;
    if (q.y < 0.0) { float L = length(q); d = L - r; dir = q / max(L, 0.001); }
    else { d = abs(q.x) - r; dir = vec2(sign(q.x), 0.0); }
    float hw = w * 0.5;

    // soft contact shadow under each tube
    vec2 qs = q - vec2(0.0, 7.0);
    float ds;
    if (qs.y < 0.0) ds = length(qs) - r; else ds = abs(qs.x) - r;
    shade = max(shade, (1.0 - smoothstep(hw, hw + 16.0, abs(ds))) * 0.13);

    float a = 1.0 - smoothstep(hw - aa, hw + aa, abs(d));
    if (a > 0.0) {
      float t = clamp(d / hw, -1.0, 1.0);
      vec2 du = vec2(dir.x, -dir.y);
      vec3 N = normalize(vec3(du * t, sqrt(max(0.0, 1.0 - t * t)) + 0.02));
      vec3 R = reflect(normalize(vec3(0.0, -0.12, -1.0)), N);
      R.xy += uPtr * vec2(0.28, -0.18);
      R = normalize(R);
      vec3 L = normalize(vec3(uPtr.x * 0.9 + 0.25 * sin(uTime * 0.37), 0.55 - uPtr.y * 0.45, 0.85));
      float rl = max(dot(R, L), 0.0);
      float spec = pow(rl, 90.0) * 1.3 + pow(rl, 14.0) * 0.16;
      float sweep = exp(-pow((v.x - 720.0 - 520.0 * sin(uTime * 0.33)) / 46.0, 2.0)) * N.z * 0.32;
      vec3 c3 = env(R) * 0.93 + spec + sweep;
      c3 = mix(c3, holoTint(N.x * 0.8 + N.y * 0.4 + uTime * 0.04), 0.13 * (1.0 - N.z));
      c3 *= 0.9 + 0.1 * N.z;
      col = mix(col, clamp(c3, 0.0, 1.0), a);
      cover = max(cover, a);
    }
  }

  vec3 shadowCol = vec3(0.30, 0.34, 0.45);
  float alpha = max(cover, shade);
  vec3 outc = cover > 0.0 ? mix(shadowCol, col, cover / max(alpha, 0.0001)) : shadowCol;
  gl_FragColor = vec4(outc * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[HeroGL]", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function HeroGL() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const hero = canvas?.closest<HTMLElement>(".hero");
    if (!canvas || !hero) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      gl = null;
    }
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      scale: gl.getUniformLocation(prog, "uScale"),
      time: gl.getUniformLocation(prog, "uTime"),
      hp: gl.getUniformLocation(prog, "uHp"),
      ptr: gl.getUniformLocation(prog, "uPtr"),
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 2 : 1.5);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    };
    resize();

    const ptr = { x: 0, y: 0, tx: 0, ty: 0, last: -1e9 };
    const setPtr = (cx: number, cy: number) => {
      const rect = hero.getBoundingClientRect();
      ptr.tx = Math.max(-1, Math.min(1, ((cx - rect.left) / rect.width) * 2 - 1));
      ptr.ty = Math.max(-1, Math.min(1, ((cy - rect.top) / rect.height) * 2 - 1));
      ptr.last = performance.now();
    };
    const onMove = (e: PointerEvent) => setPtr(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => e.touches[0] && setPtr(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("resize", resize);

    const start = performance.now();
    let visible = true;
    let raf = 0;
    let shown = false;
    const frame = (now: number) => {
      raf = 0;
      const t = (now - start) / 1000;
      if (now - ptr.last > 2500) {
        ptr.tx = Math.sin(t * 0.31) * 0.55;
        ptr.ty = Math.cos(t * 0.23) * 0.3;
      }
      const ease = now - ptr.last > 2500 ? 0.02 : 0.08;
      ptr.x += (ptr.tx - ptr.x) * ease;
      ptr.y += (ptr.ty - ptr.y) * ease;
      const hp = parseFloat(hero.style.getPropertyValue("--hp") || "0") || 0;
      const scale = Math.max(w / 1440, h / 960);
      gl!.uniform2f(u.res, w, h);
      gl!.uniform1f(u.scale, scale);
      gl!.uniform1f(u.time, reduce ? 2 : t);
      gl!.uniform1f(u.hp, hp);
      gl!.uniform2f(u.ptr, reduce ? 0.2 : ptr.x, reduce ? -0.1 : ptr.y);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      if (!shown) {
        shown = true;
        hero.dataset.gl = "on";
      }
      if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    const onScroll = () => {
      if (reduce && !raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onLost = (e: Event) => {
      e.preventDefault();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      delete hero.dataset.gl;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(hero);

    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      hero.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      delete hero.dataset.gl;
    };
  }, []);

  return <canvas ref={ref} className="hero-gl" aria-hidden="true" />;
}
