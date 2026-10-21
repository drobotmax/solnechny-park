// Remove the baby's visible face from the bundled SPZ, including the raw
// viewer asset. The original recording remains outside this repository.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

process.chdir(path.resolve(__dirname, '..'));
const file = 'karasunsky.spz';
const raw = zlib.gunzipSync(fs.readFileSync(file));
const version = raw.readUInt32LE(4);
const count = raw.readUInt32LE(8);
const stride = (raw.length - 16) / count;
if (raw.readUInt32LE(0) !== 0x5053474e || version !== 3 || stride !== 65)
  throw new Error('Unexpected bundled SPZ layout');
if (count === 631667) { console.log('Face points already absent'); process.exit(0); }
if (count !== 632203) throw new Error('Unexpected source splat count');

const source = fs.readFileSync('park.js', 'utf8');
const context = { window: {}, Math, Map, Float32Array, Float64Array, Uint8Array,
  Uint32Array, DataView, MIN_ALPHA: 0.1 };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function extractStroller'),
  source.indexOf('  // --------------------------------------------------------------- world')), context);
vm.runInContext(fs.readFileSync('spz.js', 'utf8'), context);
const parsed = context.window.SPZ.parse(new Uint8Array(raw));
const stroller = context.extractStroller(parsed, true);
const excluded = new Uint8Array(count);
let removed = 0;
for (let i = 0; i < stroller.size.length; i++) {
  const x = stroller.pos[i * 3], y = stroller.pos[i * 3 + 1], z = stroller.pos[i * 3 + 2];
  if (!context.bundledBabyFace(x, y, z)) continue;
  excluded[stroller.sourceIndices[i]] = 1;
  removed++;
}
if (removed !== 536) throw new Error(`Expected 536 face points, found ${removed}`);

// SPZ v3 stores positions, alpha, color, scale, rotation and SH in six
// separate fixed-stride blocks. Filter each block using the same index set.
const widths = [9, 1, 3, 3, 4, 45];
const output = Buffer.alloc(16 + (count - removed) * stride);
raw.copy(output, 0, 0, 16);
output.writeUInt32LE(count - removed, 8);
let inputAt = 16, outputAt = 16;
for (const width of widths) {
  for (let i = 0; i < count; i++) {
    if (excluded[i]) continue;
    raw.copy(output, outputAt, inputAt + i * width, inputAt + (i + 1) * width);
    outputAt += width;
  }
  inputAt += count * width;
}
if (inputAt !== raw.length || outputAt !== output.length) throw new Error('SPZ block size mismatch');
fs.writeFileSync(file, zlib.gzipSync(output));
console.log(`Removed ${removed} face points; ${count - removed} splats remain`);
