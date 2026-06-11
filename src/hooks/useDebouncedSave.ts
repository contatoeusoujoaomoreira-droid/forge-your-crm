import { useEffect, useRef, useState } from "react";

/** Debounced auto-save: chama saver(value) após `delay`ms sem alterações. */
export function useDebouncedSave<T>(value: T, saver: (v: T) => Promise<void> | void, delay = 400) {
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try { setSaving(true); await saver(value); }
      finally { setSaving(false); }
    }, delay);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  return { saving };
}
