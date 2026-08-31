"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

export function useToasts() {
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);
  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, kind, message }]);
    if (kind !== "error") timers.current.set(id, window.setTimeout(() => dismiss(id), 4600));
  }, [dismiss]);
  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);
  return { toasts, toast, dismiss };
}

export function ToastRegion({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return <div className="toast-region" aria-live="polite" aria-atomic="false">
    {toasts.map((item) => <div className={`toast ${item.kind}`} role={item.kind === "error" ? "alert" : "status"} key={item.id}>
      <span aria-hidden className="toast-mark">{item.kind === "success" ? "✓" : item.kind === "error" ? "!" : "i"}</span>
      <p>{item.message}</p>
      <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">×</button>
    </div>)}
  </div>;
}
