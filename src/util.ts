export interface Demo {
  stop(): void;
}

export let currentDemo: Demo = null;

export function makeDemo({
  setup,
  draw,
  raf = false
}: {
  raf?: boolean;
  setup?: (gl: WebGLRenderingContext) => void;
  draw?: (gl: WebGLRenderingContext) => void;
}) {
  if (currentDemo != null) {
    currentDemo.stop();
  }

  const canvas = document.createElement("canvas");
  canvas.id = "demo-canvas";
  const gl = canvas.getContext("webgl");
  Object.assign(document.body.style, {
    margin: 0,
    height: "100%",
    overflow: "hidden"
  });
  document.body.appendChild(canvas);

  function fitCanvas() {
    canvas.width = document.body.offsetWidth;
    canvas.height = document.body.offsetHeight;
    draw && draw(gl);
  }
  window.addEventListener("resize", fitCanvas);

  setup && setup(gl);
  fitCanvas();

  let running = true;

  const demo = {
    stop() {
      console.log("Stopping old demo");
      running = false;
      canvas.remove();
      window.removeEventListener("resize", fitCanvas);
    }
  };

  if (raf && draw) {
    requestAnimationFrame(function raf() {
      if (!running) return;
      draw(gl);
      requestAnimationFrame(raf);
    });
  }

  currentDemo = demo;
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

function addLineNumbers(src: string) {
  return src
    .split("\n")
    .map((line, index) => String(index + 1).padEnd(5) + "|" + line)
    .join("\n");
}

export function compileShader(
  gl: WebGLRenderingContext,
  shader: WebGLShader,
  source: string
) {
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errors = gl.getShaderInfoLog(shader).split("\n");
    errors.forEach(error => {
      "ERROR: 0:75";
      // TODO show only the 3 lines around the error
    });
    throw new Error(
      `Shader:\n${addLineNumbers(
        source
      )}\n\ncompilation failed: ${gl.getShaderInfoLog(shader)}`
    );
  }
}
