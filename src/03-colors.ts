import {
  setupDemo, randomOpaqueColor, lerp, compileShaderProgram,
  ShaderProgram
} from "./util";

const vertexShaderSrc = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSrc = `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

let triangleVertexBuffer: WebGLBuffer;
let shaderProgram: ShaderProgram;
setupDemo({
  setup(gl: WebGLRenderingContext) {
    // Build the program that the GPU has to run to render our triangle
    shaderProgram = compileShaderProgram(
      gl,
      vertexShaderSrc,
      fragmentShaderSrc,
      ["position"],
      []
    );

    // Tell opengl we need a buffer to store the vertices of the triangle
    triangleVertexBuffer = gl.createBuffer();

    // Send the triangle vertices to opengl
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
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
  },

  draw(gl: WebGLRenderingContext) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the screen
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell opengl to use the program we compiled previously
    gl.useProgram(shaderProgram.id);

    // Bind the buffer to the position attribute in the vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
    gl.vertexAttribPointer(
      shaderProgram.attribute("position"),
      2, gl.FLOAT, false, 0, 0
    );
    gl.enableVertexAttribArray(shaderProgram.attribute("position"));

    // Tell opengl to draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },
});

