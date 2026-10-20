// Farthest-first habitat sampling keeps population quotas spread over the map.
(function (root) {
  'use strict';
  function order(sites, start) {
    var pending = sites.map(function (site) { return { site: site, distance: Infinity }; });
    var result = [], point = { x: start[0], z: start[1] };
    while (pending.length && result.length < 128) {
      var best = 0;
      pending.forEach(function (entry, i) {
        var dx = entry.site.x - point.x, dz = entry.site.z - point.z;
        entry.distance = Math.min(entry.distance, dx * dx + dz * dz);
        if (result.length ? entry.distance > pending[best].distance : entry.distance < pending[best].distance) best = i;
      });
      point = pending.splice(best, 1)[0].site;
      result.push(point);
    }
    return result.concat(pending.map(function (entry) { return entry.site; }));
  }
  var api = { order: order };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HabitatSites = api;
})(typeof window !== 'undefined' ? window : globalThis);
