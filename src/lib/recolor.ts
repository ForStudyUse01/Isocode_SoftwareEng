export type PhotoMeta = {
  src: string;
  mask: string;
  width: number;
  height: number;
  lm: number;
  paint: string;
  box: [number, number, number, number];
};

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D uImg;
uniform sampler2D uMask;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uProg;
uniform float uLm;
uniform vec4 uBox;
uniform vec3 uGlow;

// Keeps the photo's own light and shadow, replaces only the paint colour.
vec3 paintAs(vec3 photo, vec3 target) {
  float lum = dot(photo, vec3(0.299, 0.587, 0.114));
  float shade = clamp(lum / uLm, 0.0, 2.4);
  vec3 col = target * pow(shade, 0.92);
  float spec = smoothstep(1.2, 2.0, shade);
  col = mix(col, vec3(lum) + target * 0.12, spec * 0.6);
  return clamp(col, 0.0, 1.0);
}

void main() {
  vec3 photo = texture(uImg, uv).rgb;
  float m = texture(uMask, uv).r;
  float yn = clamp((uv.y - uBox.y) / (uBox.w - uBox.y), 0.0, 1.0);
  float band = floor(yn * 3.999);
  float front = (uv.x - uBox.x) / (uBox.z - uBox.x);
  float p = uProg * 1.62 - band * 0.18;
  float reveal = uProg >= 1.0 ? 1.0 : smoothstep(front, front + 0.04, p);
  vec3 painted = mix(paintAs(photo, uFrom), paintAs(photo, uTo), reveal);
  vec3 c = mix(photo, painted, m);
  if (uProg < 1.0) {
    float edge = exp(-pow((p - front - 0.02) * 20.0, 2.0)) * step(0.001, p);
    float rows = 0.6 + 0.4 * step(0.5, fract(uv.y * 70.0));
    c += uGlow * edge * rows * 1.1 * m;
    float sx = uBox.x + (uProg * 1.62 - 0.02) * (uBox.z - uBox.x);
    float inside = step(uBox.y - 0.04, uv.y) * step(uv.y, uBox.w + 0.04);
    c += uGlow * exp(-pow((uv.x - sx) * 34.0, 2.0)) * inside * 0.5;
  }
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export class Recolorer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private textures: WebGLTexture[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private meta: PhotoMeta | null = null;

  constructor(readonly canvas: HTMLCanvasElement, keepBuffer = false) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: keepBuffer, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("program link failed");
    this.program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const name of ["uImg", "uMask", "uFrom", "uTo", "uProg", "uLm", "uBox", "uGlow"]) this.uniforms[name] = gl.getUniformLocation(program, name);
  }

  private upload(image: HTMLImageElement, unit: number) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.push(tex);
    gl.uniform1i(this.uniforms[unit === 0 ? "uImg" : "uMask"], unit);
  }

  async load(meta: PhotoMeta) {
    const [img, mask] = await Promise.all([loadImage(meta.src), loadImage(meta.mask)]);
    this.textures.forEach((t) => this.gl.deleteTexture(t));
    this.textures = [];
    this.upload(img, 0);
    this.upload(mask, 1);
    this.meta = meta;
  }

  resize(width: number, height: number) {
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(from: string, to: string, progress: number) {
    const gl = this.gl;
    const m = this.meta;
    if (!m) return;
    gl.uniform3fv(this.uniforms.uFrom, hexToRgb(from));
    gl.uniform3fv(this.uniforms.uTo, hexToRgb(to));
    gl.uniform1f(this.uniforms.uProg, progress);
    gl.uniform1f(this.uniforms.uLm, m.lm);
    gl.uniform4f(this.uniforms.uBox, m.box[0], m.box[1], m.box[2], m.box[3]);
    gl.uniform3f(this.uniforms.uGlow, 0.5, 0.91, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    this.textures.forEach((t) => this.gl.deleteTexture(t));
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

let shared: Recolorer | null = null;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string>>();

// One hidden WebGL context renders every static card image and hands back a small JPEG.
// Jobs run one at a time because they share the same textures.
export function renderStatic(meta: PhotoMeta, hex: string, width = 880): Promise<string> {
  const key = `${meta.src}|${hex}|${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = queue.then(async () => {
    shared ??= new Recolorer(document.createElement("canvas"), true);
    await shared.load(meta);
    shared.resize(width, (width * meta.height) / meta.width);
    shared.draw(hex, hex, 1);
    return shared.canvas.toDataURL("image/jpeg", 0.88);
  });
  queue = job.catch(() => undefined);
  cache.set(key, job);
  return job;
}
