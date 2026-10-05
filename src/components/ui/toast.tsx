"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/i18n/language-context";

export type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };
type ToastContextValue = { toast: (kind: ToastKind, message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { language } = useLanguage();
  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts(current => current.filter(item => item.id !== id));
  }, []);
  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts(current => [...current.slice(-4), { id, kind, message }]);
    if (kind !== "error") timers.current.set(id, window.setTimeout(() => dismiss(id), 4600));
  }, [dismiss]);
  useEffect(() => {
    const activeTimers = timers.current;
    return () => { activeTimers.forEach(timer => window.clearTimeout(timer)); activeTimers.clear(); };
  }, []);
  const context = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={context}>
    {children}
    <ToastList toasts={toasts} dismiss={dismiss} dismissLabel={language === "bn" ? "বিজ্ঞপ্তি বন্ধ করুন" : "Dismiss notification"} />
  </ToastContext.Provider>;
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToasts requires ToastProvider");
  return context;
}

function ToastList({ toasts, dismiss, dismissLabel }: { toasts: ToastItem[]; dismiss: (id: number) => void; dismissLabel: string }) {
  return <div className="toast-region">
    {toasts.map(item => <div className={`toast ${item.kind}`} role={item.kind === "error" ? "alert" : "status"} key={item.id}>
      <span aria-hidden className="toast-mark">{item.kind === "success" ? "✓" : item.kind === "error" ? "!" : "i"}</span>
      <p>{item.message}</p><button type="button" onClick={() => dismiss(item.id)} aria-label={dismissLabel}>×</button>
    </div>)}
  </div>;
}
