// Run with Node and sharp installed; generated icons are committed for hosting.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const directory = path.resolve(__dirname, '../dist/icons');

async function png(source, name, size) {
  return sharp(path.join(directory, source), { density: 3072 })
    .resize(size, size).png().toFile(path.join(directory, name));
}

async function main() {
  for (const size of [16, 32, 48, 192, 512]) {
    await png('favicon.svg', `icon-${size}.png`, size);
  }
  await png('app-icon.svg', 'apple-touch-icon.png', 180);
  for (const size of [512, 1024]) {
    await png('app-icon.svg', `maskable-${size}.png`, size);
  }
  // ICO supports PNG frames, preserving each small size at native resolution.
  const frames = await Promise.all([16, 32, 48].map(size =>
    fs.readFile(path.join(directory, `icon-${size}.png`))));
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = [16, 32, 48][index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await fs.writeFile(path.join(directory, 'favicon.ico'), Buffer.concat([header, ...frames]));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
