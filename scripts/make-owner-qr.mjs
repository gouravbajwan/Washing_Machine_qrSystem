// Creates the OWNER QR code (opens /admin to add/remove floors and machines).
//   npm run owner-qr -- https://your-app.vercel.app
//
// It makes a new random secret, saves the QR image in owner-qr/owner-qr.png and prints one SQL line.
// Run that SQL line in Supabase > SQL Editor to switch the new secret on.
// Keep the QR private. Running this again makes a NEW secret and the old QR stops working.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: npm run owner-qr -- https://your-app.vercel.app');
  process.exit(1);
}
const secret = crypto.randomBytes(24).toString('base64url');
const hash = crypto.createHash('sha256').update(secret, 'utf8').digest('hex');
const sql = `insert into app_settings (key, value) values ('owner_secret_hash', '${hash}')\n  on conflict (key) do update set value = excluded.value;\n`;

const dir = 'owner-qr';
fs.mkdirSync(dir, { recursive: true });
// the secret sits after "#" so it is never sent to the server or written to logs
await QRCode.toFile(path.join(dir, 'owner-qr.png'), `${base}/admin#k=${secret}`, { width: 800, margin: 3, errorCorrectionLevel: 'M' });
fs.writeFileSync(path.join(dir, 'set-owner-secret.sql'), sql);

console.log('\nOwner QR saved: owner-qr/owner-qr.png  (keep it private)');
console.log('\nNow run this in Supabase > SQL Editor (also saved in owner-qr/set-owner-secret.sql):\n');
console.log(sql);
