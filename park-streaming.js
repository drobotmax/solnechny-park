// Bounded asynchronous residency for prebuilt point-cloud sectors.
(function (root) {
  'use strict';
  function decode(bytes) {
    var v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.byteLength < 16 || v.getUint32(0, true) !== 0x31504350) throw new Error('Invalid cloud header');
    var n = v.getUint32(4, true);
    if (bytes.byteLength !== 16 + n * 20) throw new Error('Invalid cloud length');
    // Copy only when a transport supplies an unaligned byte view.
    if (bytes.byteOffset % 4) return decode(bytes.slice());
    return {pos: new Float32Array(bytes.buffer, bytes.byteOffset + 16, n * 3),
      col: new Uint8Array(bytes.buffer, bytes.byteOffset + 16 + n * 12, n * 4),
      size: new Float32Array(bytes.buffer, bytes.byteOffset + 16 + n * 16, n),
      length: v.getFloat32(8, true), width: v.getFloat32(12, true)};
  }
  function Stream(entries, load, release, concurrency) {
    this.entries = entries; this.load = load; this.release = release;
    this.limit = concurrency || 2; this.resident = new Map(); this.pending = new Map();
    this.loaded=0; this.evicted=0; this.failed = new Map(); this.x = 0; this.z = 0; this.radius = 0;
  }
  Stream.prototype.distance = function (e) { return Math.hypot(e.cx-this.x,e.cz-this.z); };
  Stream.prototype.update = function (x,z,radius) {
    this.x=x; this.z=z; this.radius=radius;
    var self=this;
    this.resident.forEach(function (item,key) {
      if (self.distance(item.entry)>radius+96) {self.release(item.value);self.evicted++;self.resident.delete(key);}
    });
    this.pending.forEach(function (item) {
      if (self.distance(item.entry)>radius+96) item.controller.abort();
    });
    var wanted=this.entries.filter(function (e) {
      return self.distance(e)<=radius && !self.resident.has(e.id) && !self.pending.has(e.id) && (self.failed.get(e.id)||0)<Date.now();
    }).sort(function (a,b) {return self.distance(a)-self.distance(b);});
    while(this.pending.size<this.limit && wanted.length) this.request(wanted.shift());
  };
  Stream.prototype.request = function (entry) {
    var self=this, controller=new AbortController();
    this.pending.set(entry.id,{entry:entry,controller:controller});
    Promise.resolve().then(function () {return self.load(entry,controller.signal);}).then(function (value) {
      if (controller.signal.aborted || self.distance(entry)>self.radius+96) self.release(value);
      else {self.loaded++;self.resident.set(entry.id,{entry:entry,value:value});self.failed.delete(entry.id);}
    }).catch(function (err) {
      if (err.name!=='AbortError') self.failed.set(entry.id,Date.now()+30000);
    }).finally(function () {self.pending.delete(entry.id);});
  };
  Stream.prototype.stats = function () {
    var points=0;this.resident.forEach(function (item) {points+=item.value.n;});
    return {chunks:this.resident.size,pending:this.pending.size,failures:this.failed.size,points:points,bytes:points*20,loaded:this.loaded,evicted:this.evicted};
  };
  var api={decode:decode,Stream:Stream};
  if (typeof module!=='undefined'&&module.exports) module.exports=api;else root.ParkStreaming=api;
})(typeof window!=='undefined'?window:globalThis);
