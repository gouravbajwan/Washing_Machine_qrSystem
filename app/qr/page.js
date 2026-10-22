'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useMachines } from '../../lib/hooks';
import { floorLabel } from '../../lib/format';

// Printable QR codes: one per machine + one per floor + one for all floors.
export default function QrSheet() {
  const { machines, loading, error } = useMachines(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!machines.length) return;
    const origin = window.location.origin;
    const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
    const list = [
      ...floors.map((f) => ({ key: 'floor-' + f, title: `${floorLabel(f)} availability`, sub: 'Master QR', url: `${origin}/?floor=${f}` })),
      { key: 'all', title: 'All floors', sub: 'Master QR', url: `${origin}/` },
      ...machines.map((m) => ({ key: m.id, title: m.name, sub: `${floorLabel(m.floor)} · machine QR`, url: `${origin}/machine/${m.id}` })),
    ];
    Promise.all(list.map(async (i) => ({ ...i, img: await QRCode.toDataURL(i.url, { width: 400, margin: 2 }) }))).then(setItems);
  }, [machines]);

  return (
    <>
      <h1>QR codes</h1>
      <p className="sub noprint">Print this page (Ctrl/Cmd+P). Stick each machine QR on its machine and the floor QRs near the stairs/lift.</p>
      {loading && <p className="sub">Loading…</p>}
      {error && <div className="err">{error}</div>}
      <div className="qrgrid">
        {items.map((i) => (
          <div className="card qrcard" key={i.key}>
            <img src={i.img} alt={i.url} />
            <div className="mname">{i.title}</div>
            <div className="sub">{i.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
