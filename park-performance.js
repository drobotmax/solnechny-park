// Conservative sphere culling and distance-based point density.
(function (root) {
  'use strict';
  function visible(view, x, y, z, radius, fov, aspect, far) {
    var cx = view[0]*x + view[4]*y + view[8]*z + view[12];
    var cy = view[1]*x + view[5]*y + view[9]*z + view[13];
    var depth = -(view[2]*x + view[6]*y + view[10]*z + view[14]);
    if (depth + radius < 0.08 || depth - radius > far) return false;
    var ty = Math.tan(fov/2), tx = ty*aspect;
    return Math.abs(cx) <= depth*tx + radius*Math.sqrt(1+tx*tx) &&
      Math.abs(cy) <= depth*ty + radius*Math.sqrt(1+ty*ty);
  }
  function stride(distance) { return distance > 120 ? 4 : distance > 65 ? 2 : 1; }
  var api = {visible: visible, stride: stride};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ParkPerformance = api;
})(typeof window !== 'undefined' ? window : globalThis);
