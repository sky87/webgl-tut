import { makeDemo, randomOpaqueColor, lerp } from "./util";

makeDemo({
  draw(gl: WebGLRenderingContext) {
    // In WegGL colors are in the [0, 1] interval
    // r  g  b  a (a == 0 means transparent)
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // WebGL has multiple "buffers" that can be cleared.
    // They have different uses. The color buffer is (obviously) the one
    // that holds the colors that go to the screen
  },
});

// // Let's animate the background color to get a sense
// // of how animations are implemented in canvas:
// //  General idea: redraw everything 60 times every second
// //    using time to parametrize the things you draw
// //
// //  Example:
// //    Transition between two background colors in 1 sec
// //    and pick a new target color at random every second
// let oldColor = randomOpaqueColor(); // [Math.random(), Math.random(), Math.random(), 1]
// let newColor = randomOpaqueColor();
// let lastColorChangeMs = performance.now();
// makeDemo({
//   // Schedule a new draw every ~16 ms (= 60 fps)
//   raf: true,
//   draw(gl: WebGLRenderingContext) {
//     const nowMs = performance.now();
//     const elapsedSecs = (nowMs - lastColorChangeMs) / 1000;
//     // elapsedSecs is the number of seconds between now and the last time we changed
//     // color (see below). So elapsedSecs is always a number between 0 and 1

//     const c = lerp(elapsedSecs, oldColor, newColor);
//     // lerp = linear interpolation (defined in utils.ts)
//     //    lerp(parameter, firstArray, secondArray)
//     //    lerp(0, a, b) = a
//     //    lerp(1, a, b) = b
//     //    lerp(t, a, b) = (1 - t)*a + t*b
//     //       where * is a number, array multiplication in this sense:
//     //          t * [x1, x2, ...] := [t*x1, t*x2, ...]
//     //       in code
//     //          mul = (t, xs) => xs.map(x => t*x)

//     gl.clearColor.apply(gl, c);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     if (elapsedSecs > 1) {
//       // Change color every sec
//       lastColorChangeMs = nowMs;
//       oldColor = newColor;
//       newColor = randomOpaqueColor();
//     }
//   },
// });
// // If it is your first time dealing with this kind of things you might find these exercises useful
// //    SEIZURE WARNING
// // Exercise: What needs to change to smoothly transition between colors in 2 seconds instead of 1?
// // Exercise: What if I want the transition between colors to take a random time between 1 and 5 seconds?
