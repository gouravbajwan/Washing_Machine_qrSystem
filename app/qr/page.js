'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useMachines } from '../../lib/hooks';
import { floorLabel } from '../../lib/format';
import Sprite from '../../components/Sprite';

// Printable QR codes: one per machine + one per floor + one for the board.
export default function QrSheet() {
  const { machines, loading, error } = useMachines(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!machines.length) return;
    const origin = window.location.origin;
    const floors = [...new Set(machines.map((m) => m.floor))].sort((a, b) => a - b);
    const list = [
      ...floors.map((f) => ({ key: 'floor-' + f, title: `${floorLabel(f)} board`, sub: 'Master QR', url: `${origin}/?floor=${f}` })),
      { key: 'all', title: 'Laundry board', sub: 'Master QR', url: `${origin}/` },
      ...machines.map((m) => ({ key: m.id, title: m.name, sub: `${floorLabel(m.floor)} · machine QR`, url: `${origin}/machine/${m.id}` })),
    ];
    Promise.all(list.map(async (i) => ({ ...i, img: await QRCode.toDataURL(i.url, { width: 400, margin: 2 }) }))).then(setItems);
  }, [machines]);

  return (
    <div className="plain">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Sprite mood="float" size={56} />
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.05 }}>QR codes</h1>
          <p className="noprint" style={{ marginTop: 4, color: 'var(--ink-2)', fontSize: 15, fontWeight: 500 }}>Print this page (Ctrl/Cmd+P). Stick each machine QR on its machine and the floor QRs where people pass by.</p>
        </div>
      </div>
      {loading && <p style={{ marginTop: 20, color: 'var(--ink-2)' }}>Loading…</p>}
      {error && <p role="alert" style={{ marginTop: 20, color: 'var(--err-ink)' }}>{error}</p>}
      <div style={{ marginTop: 24, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {items.map((i) => (
          <div key={i.key} style={{ breakInside: 'avoid', textAlign: 'center', background: 'var(--surface)', borderRadius: 26, padding: 16, boxShadow: 'var(--shadow)', border: '1px solid var(--line)' }}>
            <img src={i.img} alt={i.url} style={{ width: '100%', maxWidth: 200, borderRadius: 12, background: '#fff' }} />
            <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700 }}>{i.title}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{i.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
