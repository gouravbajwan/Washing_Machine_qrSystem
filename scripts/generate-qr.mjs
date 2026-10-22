// Generates printable QR code PNGs.
//   node scripts/generate-qr.mjs https://your-app.vercel.app
//
// Output:
//   qr-codes/master/    -> master-all-floors.png + master-floor-<n>.png (master-ground-floor.png for floor 0)
//   qr-codes/machines/  -> one PNG per washing machine (<machine-id>.png)
//
// Machines are read from your Supabase project, using the values in .env.local
// (or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment).

import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/generate-qr.mjs https://your-app.vercel.app');
  process.exit(1);
}

// Read .env.local if present
const env = { ...process.env };
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Machines come from Supabase; if that is unreachable, fall back to scripts/machines.json
let machines = [];
try {
  if (!SB_URL || !SB_KEY) throw new Error('Supabase env vars missing');
  const res = await fetch(`${SB_URL}/rest/v1/machines?select=id,name,floor&order=floor,name`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase returned ${res.status}`);
  machines = await res.json();
  console.log(`Loaded ${machines.length} machines from Supabase`);
} catch (e) {
  console.warn(`Could not load machines from Supabase (${e.message}). Using scripts/machines.json`);
  machines = JSON.parse(fs.readFileSync(path.join('scripts', 'machines.json'), 'utf8'));
}
if (!machines.length) {
  console.error('No machines found.');
  process.exit(1);
}

const masterDir = path.join('qr-codes', 'master');
const machineDir = path.join('qr-codes', 'machines');
fs.mkdirSync(masterDir, { recursive: true });
fs.mkdirSync(machineDir, { recursive: true });

const opts = { width: 800, margin: 3, errorCorrectionLevel: 'M' };

await QRCode.toFile(path.join(masterDir, 'master-all-floors.png'), `${base}/`, opts);
const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
for (const f of floors) {
  await QRCode.toFile(path.join(masterDir, `master-${f === 0 ? 'ground-floor' : 'floor-' + f}.png`), `${base}/?floor=${f}`, opts);
}
for (const m of machines) {
  await QRCode.toFile(path.join(machineDir, `${m.id}.png`), `${base}/machine/${m.id}`, opts);
}

console.log(`Done. ${floors.length + 1} master QR(s) in ${masterDir}, ${machines.length} machine QR(s) in ${machineDir}`);
