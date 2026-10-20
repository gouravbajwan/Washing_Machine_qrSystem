'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, isConfigured } from './supabase';

// Ticks every second so countdowns re-render.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Loads machines (optionally one floor), live-updates via Supabase realtime,
// and polls as a fallback. Each machine gets a local `endsAt` deadline.
export function useMachines(floor = null) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isConfigured) {
      setError('Supabase is not configured (missing environment variables).');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('get_machines', { p_floor: floor });
    if (error) {
      setError(error.message);
    } else {
      const t = Date.now();
      setError(null);
      setMachines(data.map((m) => ({ ...m, endsAt: t + m.seconds_left * 1000 })));
    }
    setLoading(false);
  }, [floor]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 20000);
    const channel = isConfigured
      ? supabase
          .channel('machines-' + (floor ?? 'all'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, refresh)
          .subscribe()
      : null;
    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh, floor]);

  return { machines, loading, error, refresh };
}

// Effective status/seconds-left for a machine given the current time.
export function live(machine, now) {
  if (machine.status === 'in_use') {
    const left = Math.ceil((machine.endsAt - now) / 1000);
    if (left > 0) return { status: 'in_use', left };
    return { status: 'free', left: 0 };
  }
  return { status: machine.status, left: 0 };
}
