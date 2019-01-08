/**
 * This is an example of the flexibility afforded by shaders.
 * Here the GPU is rendering two triangles froming a rectangle that fills the entire page.
 * Inside this rectangle the fragment shader is raytracing a scene using a technique
 * called ray marching.
 * 
 * If you are interested I suggest the following page for a general introduction:
 *   http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
 * and Inigo Quilez website for more articles on this topic and others on procedural graphics
 *   https://iquilezles.org/www/index.htm
 */

import {
  setupDemo,
  randomOpaqueColor,
  lerp,
  compileShaderProgram,
  ShaderProgram
} from "./util";

const vertexShaderSrc = `
precision highp float;

attribute vec2 position;
varying vec2 vScreenUV;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vScreenUV = (position + vec2(1, 1))/2.0;
}
`;

const fragmentShaderSrc = `
precision highp float;

varying vec2 vScreenUV;

uniform float aspectRatio;
uniform float time;

const float EPSILON = .00001;
const float MAX_DISTANCE = 1000.0;
const int MAX_STEPS = 1000;
const float PI = 3.141592653589793;

vec3 debugOut = vec3(-123456, 0, 0);

// Camera definition
vec3 lookFrom = vec3(5, 2, -4);
vec3 lookAt = vec3(0, 0, 0);
vec3 cameraUp = vec3(0, 1, 0);
float fovDeg = 40.0;

struct Ray {
  vec3 o;
  vec3 d;
};

struct Intersection {
  Ray ray;
  float distance;
  vec3 point;
};

const Intersection NO_INTERSECTION = Intersection(Ray(vec3(0), vec3(0)), -1.0, vec3(0));

mat3 rot3(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  
  return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  
              oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  
              oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c           );
}

float sdSphere(vec3 p, vec3 center, float radius) {
  return length(p - center) - radius;
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
    + min(max(d.x,max(d.y,d.z)),0.0);
}

float sdCylinder(vec3 p, vec3 dir, float radius) {
  vec3 nd = normalize(dir);
  return length(p - dot(nd, p)*nd) - radius;
}

float sdPlane(vec3 p, vec3 q, vec3 n) {
  return dot(normalize(n), p - q);
}

float sdSub(float da, float db) {
  return max(da, -db);
}

float sdInt(float da, float db) {
  return max(da, db);
}

float sdUnion(float da, float db) {
  return min(da, db);
}

float sdScene(vec3 p) {
  vec3 op = p;
  float t = time/6.0;
  float d;

  {
    p = rot3(vec3(1, 1, 0), -t*2.0*PI) * p;

    d = sdSphere(p, vec3(0), 1.0);
    
    d = sdInt(d, sdBox(p, vec3(.8, .8, .8)));

    d = sdSub(d, sdCylinder(p, vec3(1., 0, 0), .5));
    d = sdSub(d, sdCylinder(p, vec3(0, 1., 0), .5));
    d = sdSub(d, sdCylinder(p, vec3(0, 0, 1.), .5));
    
    d = sdSub(d, sdCylinder(p, vec3( 1.,  1., 1.), .1));
    d = sdSub(d, sdCylinder(p, vec3( 1., -1., 1.), .1));
    d = sdSub(d, sdCylinder(p, vec3(-1.,  1., 1.), .1));
    d = sdSub(d, sdCylinder(p, vec3(-1., -1., 1.), .1));
    
    d = sdSub(d, sdSphere(p, vec3(0), .85));

    float k = time/4.0;
    float ir = .3 + .2 * cos(time/7.0*2.0*PI);

    d = sdUnion(d, sdSphere(p, vec3(1.0 + .4*sin(k*2.0*PI), 0, 0), ir));
    d = sdUnion(d, sdSphere(p, vec3(-1.0 + .4*sin(k*2.0*PI + PI), 0, 0), ir));
    d = sdUnion(d, sdSphere(p, vec3(0, 1.0 + .4*sin(k*2.0*PI), 0), ir));
    d = sdUnion(d, sdSphere(p, vec3(0, -1.0 + .4*sin(k*2.0*PI + PI), 0), ir));
    d = sdUnion(d, sdSphere(p, vec3(0, 0, 1.0 + .4*sin(k*2.0*PI)), ir));
    d = sdUnion(d, sdSphere(p, vec3(0, 0, -1.0 + .4*sin(k*2.0*PI + PI)), ir));

    p = op;
  }

  d = sdUnion(d, sdPlane(p, vec3(0, -1.8, 0), vec3(0, 1, 0)));
  d = sdUnion(d, sdPlane(p, vec3(-8, 0, 0), vec3(1, 0, 0)));
  d = sdUnion(d, sdPlane(p, vec3(0, 0, 8), vec3(0, 0, -1)));
  
  return d;
}

vec3 sdSceneGrad(vec3 p) {
  const float e = 0.00001;
  float dp = sdScene(p);
  return vec3(
    sdScene(p + vec3(e, 0, 0)) - dp,
    sdScene(p + vec3(0, e, 0)) - dp,
    sdScene(p + vec3(0, 0, e)) - dp
  ) / e;
}

Ray cameraRay(vec2 screenUV) {
  // TODO pass in lookFrom, lowerLeftCorner, horizontal and vertical as uniforms instead of
  // computing the camera frame for every pixel
  float fov = fovDeg * PI/180.0;
  float halfHeight = tan(fov/2.0);
  float halfWidth = aspectRatio*halfHeight;
  vec3 w = normalize(lookAt - lookFrom);
  vec3 u = cross(normalize(cameraUp), w);
  vec3 v = cross(w, u);
  vec3 lowerLeftCorner = lookFrom + w - halfWidth*u - halfHeight*v;
  vec3 horizontal = 2.0*halfWidth*u;
  vec3 vertical = 2.0*halfHeight*v;
  return Ray(
    lookFrom, 
    (lowerLeftCorner + screenUV.x*horizontal + screenUV.y*vertical) - lookFrom
  );
}

Intersection rayMarch(Ray r) {
  r.d = normalize(r.d);
  float distanceFromOrigin = 0.0;
  for (int s = 0; s < MAX_STEPS; s++) {
    vec3 p = r.o + distanceFromOrigin*r.d;
    float distance = sdScene(p);
    if (distance < EPSILON) return Intersection(
      r, distanceFromOrigin, p
    );
    distanceFromOrigin += distance;
    if (distanceFromOrigin >= MAX_DISTANCE) return NO_INTERSECTION;
  }

  return NO_INTERSECTION;
}

float shadowMarch(Ray ray, float k, float lightDist) {
  float res = 1.0;
  float t = 0.01;
  for(int i = 0; i < MAX_STEPS; i++) {
    float h = sdScene(ray.o + ray.d*t);
    if (h < EPSILON)
      return 0.0;
    res = min(res, k*h/t);
    t += h;
    if (t > lightDist) break;
  }
  return res;
}

void main() {
  Intersection i = rayMarch(cameraRay(vScreenUV));
  if (i.distance < 0.0) {
    gl_FragColor = vec4(0, 0, 0, 1);
  }
  else {
    vec3 pointLight = vec3(3, 2, -5);

    pointLight = vec3(2.0*cos(time*PI), 2, 2.0*sin(time*PI));
    vec3 sphereColor = vec3(.8, .7, .7);
    vec3 lightDir = normalize(pointLight - i.point);
    float lightDist = length(pointLight - i.point);

    vec3 n = normalize(sdSceneGrad(i.point));

    float ka = 0.1;
    float kd = .8;
    float kr = 1.0;
    float shining = 20.0;

    float ks = shadowMarch(Ray(i.point, lightDir), 60.0, lightDist)*.7 + .3;

    float light =
      ks * (
        ka +
        kd*clamp(dot(n, lightDir), 0.0, 1.0) + 
        kr*pow(clamp(dot(n, normalize(lightDir - i.ray.d)), 0.0, 1.0), shining)
      )
    ;
    gl_FragColor = vec4(sphereColor * light, 1);
  }

  if (debugOut.x != -123456.0)
    gl_FragColor = vec4(debugOut, 1);
}
`;

let triangleVertexBuffer: WebGLBuffer;
let shaderProgram: ShaderProgram;
setupDemo({
  raf: true,
  setup(gl: WebGLRenderingContext) {
    // Build the program that the GPU has to run to render our triangle
    shaderProgram = compileShaderProgram(
      gl,
      vertexShaderSrc,
      fragmentShaderSrc,
      ["position"],
      ["aspectRatio", "time"]
    );

    // Tell opengl we need a buffer to store the vertices of the triangle
    triangleVertexBuffer = gl.createBuffer();

    // Send the triangle vertices to opengl
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 
         1, -1, 
        -1,  1, 
      
        -1,  1,
         1, -1, 
         1,  1
      ]),
      gl.STATIC_DRAW
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
    gl.uniform1f(
      shaderProgram.uniform("aspectRatio"),
      gl.canvas.width / gl.canvas.height
    );
    gl.uniform1f(shaderProgram.uniform("time"), performance.now() / 1000);
    gl.vertexAttribPointer(
      shaderProgram.attribute("position"),
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.attribute("position"));

    // Tell opengl to draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
});
