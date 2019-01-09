import {
  setupDemo, randomOpaqueColor, lerp, compileShaderProgram,
  ShaderProgram
} from "./util";

const vertexShaderSrc = `
precision mediump float;

attribute vec2 position;
attribute vec3 color;

uniform float time;

varying vec3 vColor;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vColor = ((cos((time/5.0)*2.0*3.1415) + 1.0)/2.0*.8 + .2) * color;
}
`;

const fragmentShaderSrc = `
precision mediump float;

varying vec3 vColor;

void main() {
  // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  gl_FragColor = vec4(vColor, 1.0);
}
`;

let positionBuffer: WebGLBuffer;
let colorBuffer: WebGLBuffer;
let shaderProgram: ShaderProgram;
setupDemo({
  setup(gl: WebGLRenderingContext) {
    // Build the program that the GPU has to run to render our triangle
    shaderProgram = compileShaderProgram(
      gl,
      vertexShaderSrc,
      fragmentShaderSrc,
      ["position", "color"],
      ["time"]
    );

    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -0.5, -0.5,
        0.5, -0.5,
        -0.5, 0.5,

        -0.45, 0.5,
        0.55, -0.5,
        0.55, 0.5,
      ]),
      gl.STATIC_DRAW,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,

        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 1.0,
      ]),
      gl.STATIC_DRAW,
    );
  },

  raf: true,

  draw(gl: WebGLRenderingContext) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the screen
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell opengl to use the program we compiled previously
    gl.useProgram(shaderProgram.id);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
      shaderProgram.attribute("position"),
      2, gl.FLOAT, false, 0, 0
    );
    gl.enableVertexAttribArray(shaderProgram.attribute("position"));

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
      shaderProgram.attribute("color"),
      3, gl.FLOAT, false, 0, 0
    );
    gl.enableVertexAttribArray(shaderProgram.attribute("color"));

    gl.uniform1f(shaderProgram.uniform("time"), performance.now()/1000);

    // Tell opengl to draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },
});

