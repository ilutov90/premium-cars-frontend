// Packs extension/mobile-bg (mobile.bg and cars.bg) into public/downloads/premium-cars-mobile-bg.zip (no
// dependencies: a plain "stored" zip), so the admin panel can offer it for download. Runs before every build (npm
// "prebuild"). Fails when a file names one of the sites' publishing or deleting controls: the extension fills in,
// the admin publishes.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "extension/mobile-bg";
const OUT_DIR = "public/downloads";
const OUT = join(OUT_DIR, "premium-cars-mobile-bg.zip");

const table = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const files = readdirSync(SRC).filter((f) => !f.startsWith(".")).sort();
const FORBIDDEN = [/publishBtn/i, /deleteoffer/i, /editcar\.php/i, /changephotoorder/i];
for (const name of files) {
  const text = readFileSync(join(SRC, name), "utf8");
  const hit = FORBIDDEN.find((re) => re.test(text));
  if (hit) throw new Error(`${name}: the extension must not touch ${hit} (the admin publishes)`);
}
const local = [];
const central = [];
let offset = 0;
for (const name of files) {
  const data = readFileSync(join(SRC, name));
  const nameBuf = Buffer.from(`mobile-bg/${name}`, "utf8");
  const crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0x0800, 6); // UTF-8 names
  header.writeUInt16LE(0, 8); // stored
  header.writeUInt32LE(0x00210000, 10); // 1980-01-01, so the zip is the same for the same files
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  local.push(header, nameBuf, data);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(0, 10);
  entry.writeUInt32LE(0x00210000, 12);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(nameBuf.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, nameBuf);
  offset += header.length + nameBuf.length + data.length;
}
const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, Buffer.concat([...local, centralBuf, end]));
console.log(`${OUT}: ${files.length} files`);
