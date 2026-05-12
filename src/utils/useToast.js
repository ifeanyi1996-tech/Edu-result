import { useState, useCallback } from "react";

// ─── useToast Hook ───────────────────────────────────────────────────────────
// Returns { toasts, toast } where toast(message, type) adds a notification.

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return { toasts, toast };
}
