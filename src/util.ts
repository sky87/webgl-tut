export interface Demo {
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  draw: (gl: WebGLRenderingContext) => void,
  raf: boolean
}

export function setupDemo({
  setup,
  draw,
  raf = false
}: {
  raf?: boolean;
  setup?: (gl: WebGLRenderingContext) => void;
  draw?: (gl: WebGLRenderingContext) => void;
}) {
  console.log("Setting up demo");
  const global = window as any;
  let demo = global.demo;
  if (demo == null) {
    console.log("Initializing canvas");
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.id = "demo-canvas";
    canvas.width = document.body.offsetWidth;
    canvas.height = document.body.offsetHeight;
    document.body.appendChild(canvas);
    const errorLog = document.createElement("div");
    errorLog.id = "error-log";
    document.body.append(errorLog);
    
    const fitCanvas = () => {
      canvas.width = document.body.offsetWidth;
      canvas.height = document.body.offsetHeight;
      demo.draw && demo.draw(demo.gl);
    }
    window.addEventListener("resize", fitCanvas);
    
    demo = global.demo = {
      canvas,
      gl: null,
      draw: null,
      raf: false
    };
  }

  demo.gl = demo.canvas.getContext("webgl");
  setup && setup(demo.gl);
  draw && draw(demo.gl);

  demo.draw = draw;
  if (raf && !demo.raf) {
    demo.raf = true;
    requestAnimationFrame(function raf() {
      if (!demo.raf) return;
      demo.draw(demo.gl);
      requestAnimationFrame(raf);
    });
  }
}

export type Color = [number, number, number, number];

export function randomOpaqueColor(): Color {
  return [Math.random(), Math.random(), Math.random(), 1];
}

export function lerp<A extends number[]>(t, a: A, b: A): A {
  return a.map((ai, i) => (1 - t) * ai + t * b[i]) as A;
}

export interface ShaderProgram {
  id: WebGLProgram;
  attribute(name: String): number;
  uniform(name: String): WebGLUniformLocation;
}

export function compileShaderProgram(
  gl: WebGLRenderingContext,
  vertexShaderSrc: string,
  fragmentShaderSrc: string,
  attributeNames: string[],
  uniformNames: string[]
): ShaderProgram {
  const programId = gl.createProgram();
  const attributes: { [key: string]: number } = {};
  const uniforms: { [key: string]: WebGLUniformLocation } = {};

  if (vertexShaderSrc != null) {
    const vertexId = gl.createShader(gl.VERTEX_SHADER);
    compileShader(gl, vertexId, vertexShaderSrc);
    gl.attachShader(programId, vertexId);
  }
  if (fragmentShaderSrc != null) {
    const fragmentId = gl.createShader(gl.FRAGMENT_SHADER);
    compileShader(gl, fragmentId, fragmentShaderSrc);
    gl.attachShader(programId, fragmentId);
  }

  gl.linkProgram(programId);
  if (!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
    throw new Error(
      `Failed to link program: ${gl.getProgramInfoLog(programId)}`
    );
  }

  if (attributeNames) {
    attributeNames.forEach(attributeName => {
      const location = gl.getAttribLocation(programId, attributeName);
      attributes[attributeName] = location;
      if (location < 0) {
        throw new Error(`Attribute [${attributeName}] not found in shader`);
      }
    });
  }

  if (uniformNames) {
    uniformNames.forEach(uniformName => {
      const location = gl.getUniformLocation(programId, uniformName);
      uniforms[uniformName] = location;
      if (location == null) {
        console.warn(
          `Uniform [${uniformName}] not found in shader (could have been optimized away by the shader compiler)`
        );
      }
    });
  }

  return {
    id: programId,
    attribute(name: string) {
      if (!attributes.hasOwnProperty(name))
        throw new Error(
          `Attribute [${name}] not declared in compileShaderProgram`
        );
      return attributes[name];
    },
    uniform(name: string) {
      if (!uniforms.hasOwnProperty(name))
        throw new Error(
          `Uniform [${name}] not declared in compileShaderProgram`
        );
      return uniforms[name];
    }
  };
}

export function compileShader(
  gl: WebGLRenderingContext,
  shader: WebGLShader,
  source: string
) {
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const sourceLines = source.split("\n");
    const errors = gl.getShaderInfoLog(shader).split("\n");
    let buf = "Shader compilation errors:\n";
    errors.forEach(error => {
      const ematch = error.match(/^(\w+)\s*:\s*(\d+):(\d+):\s*(.*)$/);
      if (ematch == null) {
        if (/\s*/.test(error)) return;
        buf += "XX:" + error + "\n\n";
        return;
      }
      const [_1, level, _2, lineStr, msg] = ematch;
      const line = parseInt(lineStr, 10) - 1;

      buf += "\n";
      buf += sourceLines.slice(Math.max(0, line - 1), Math.min(line + 2, sourceLines.length)).
          map((sl, index) => String(index + line).padEnd(5) + "|" + sl).
          join("\n");
      buf += `\n\nLine ${lineStr}: ${msg}\n`;
    });
    throw new Error(buf);
  }
}
