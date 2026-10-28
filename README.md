# Washing Machine QR System

Hostel laundry tracker. Scan the QR on a machine → enter name + room → start a countdown.
Scan a master QR → see which machines are free on your floor, with live timers.

Stack: Next.js (App Router) · Supabase (Postgres + Realtime) · Vercel.

## Pages
| URL | Purpose |
|---|---|
| `/machine/<id>` | QR on each machine: start timer (name + room) or mark free |
| `/` | Master view, all floors |
| `/?floor=3` | Master view for one floor (put this QR on that floor) |
| `/qr` | Printable sheet of every QR code |

## Setup
1. **Supabase**: create a project → SQL Editor → paste & run `supabase/schema.sql` (edit the example machines at the bottom first).
2. Project Settings → API: copy the **Project URL** and **anon public key**.
3. Local: `cp .env.example .env.local`, fill in both values, `npm install`, `npm run dev`.
4. **Vercel**: import this GitHub repo → add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) → Deploy.
5. Open `https://<your-app>.vercel.app/qr` and print the QR codes.

## Data
Who used which machine (name, room, start, end) is stored in the `usage_log` table.
The full history is not readable with the public key (view it in Supabase → Table Editor). The master board does show the name and room of whoever is using a machine right now.

## Notes
- Anyone with a machine's QR can mark it free (trust-based, fine for a hostel).
- Broken machines: anyone can report one from its QR page (with a reason) and mark it working again. Run `supabase/migration_report.sql` once to enable this. Manual override: `update machines set status='out_of_order', ooo_reason='Water leak' where id='f3-w2';`
- Add a machine: `insert into machines (id,name,floor) values ('f3-w3','Washer 3',3);` then reprint `/qr`.

## Wash reminders (push notifications)
Alerts at ~5 min left, ~2 min left and when the wash is done. Works with the phone locked.
Also shows an in-page banner + beep/vibration while the machine page is open (backup).

One-time setup:
1. Generate keys on your PC: `npm run vapid` (prints a public and a private key).
2. Vercel > Settings > Environment Variables: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = the public key (also add it to `.env.local`). Redeploy.
3. Supabase > SQL Editor: run `supabase/migration_notifications.sql`.
4. Supabase > Edge Functions > Deploy a new function named `send-reminders` (via the editor), paste `supabase/functions/send-reminders/index.ts`, deploy.
5. Supabase > Edge Functions > Secrets: add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (e.g. `mailto:you@example.com`).

Notes: Android works straight from Chrome. iPhones must first use Share > Add to Home Screen and enable reminders
inside the installed app (`/reminders` page), then start washes using the same name and room number.
Reminders are matched to the person by device and by name + room number.

## Owner QR (add/remove floors and machines)
1. Run `supabase/migration_admin.sql` once in the Supabase SQL Editor.
2. Run `npm run owner-qr -- https://your-app.vercel.app`. It saves `owner-qr/owner-qr.png` (git-ignored) and prints one SQL line; run that line in Supabase.
3. Scan the owner QR with your phone to open `/admin`. Keep the QR private. Running step 2 again makes a new secret and the old QR stops working.
