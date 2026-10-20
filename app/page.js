'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMachines, useNow, live } from '../lib/hooks';
import { fmt } from '../lib/format';

const LABEL = { free: 'Free', in_use: 'In use', out_of_order: 'Out of order' };

function Board() {
  const params = useSearchParams();
  const floorParam = params.get('floor');
  const floor = floorParam && !Number.isNaN(Number(floorParam)) ? Number(floorParam) : null;

  // Always load all machines so we can show the floor chips; filter locally.
  const { machines, loading, error } = useMachines(null);
  const now = useNow();

  const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
  const shown = machines.filter((m) => floor === null || m.floor === floor);
  const byFloor = shown.reduce((acc, m) => ((acc[m.floor] ||= []).push(m), acc), {});

  const freeCount = shown.filter((m) => live(m, now).status === 'free').length;

  return (
    <>
      <h1>🧺 Hostel Laundry</h1>
      <p className="sub">
        {loading ? 'Loading…' : `${freeCount} of ${shown.length} machines free${floor !== null ? ` on floor ${floor}` : ''}`}
      </p>

      <div className="chips">
        <Link href="/" className={'chip' + (floor === null ? ' on' : '')}>All floors</Link>
        {floors.map((f) => (
          <Link key={f} href={`/?floor=${f}`} className={'chip' + (floor === f ? ' on' : '')}>
            Floor {f}
          </Link>
        ))}
      </div>

      {error && <div className="err">{error}</div>}

      {Object.keys(byFloor).map((f) => (
        <section key={f}>
          <h2>Floor {f}</h2>
          <div className="grid">
            {byFloor[f].map((m) => {
              const { status, left } = live(m, now);
              return (
                <div key={m.id}>
                  <div className="card">
                    <div className="mrow">
                      <span className="mname">{m.name}</span>
                      <span className={'badge ' + status}>{LABEL[status]}</span>
                    </div>
                    {status === 'in_use' ? (
                      <>
                        <div className="timer">{fmt(left)} <small>left</small></div>
                        {m.user_name && (
                          <div className="who">👤 {m.user_name} · Room {m.room_no}</div>
                        )}
                      </>
                    ) : (
                      <div className={'timer ' + status}>{status === 'free' ? 'Available now' : 'Not working'}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!loading && !error && shown.length === 0 && <p className="sub">No machines found.</p>}
      <p className="foot">View only. Scan the QR on a machine to start its timer.</p>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p className="sub">Loading…</p>}>
      <Board />
    </Suspense>
  );
}
