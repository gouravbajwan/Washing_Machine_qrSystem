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
- Mark a machine broken: `update machines set status='out_of_order' where id='f3-w2';`
- Add a machine: `insert into machines (id,name,floor) values ('f3-w3','Washer 3',3);` then reprint `/qr`.
