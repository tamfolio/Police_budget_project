import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const GO_MAP: Record<string, string> = {
  h: "/",
  a: "/aie",
  f: "/fund-inflows",
  e: "/expenditures",
  d: "/distributions",
  r: "/reports",
  s: "/reports/sla",
  c: "/reports/compare",
  u: "/admin/users",
};

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useGlobalHotkeys({
  onOpenPalette, onShowShortcuts, onNewRecord,
}: { onOpenPalette: () => void; onShowShortcuts: () => void; onNewRecord?: () => void }) {
  const navigate = useNavigate();
  const gPressedAt = useRef<number>(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+K — palette (works even in inputs)
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpenPalette();
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;

      if (e.key === "/") { e.preventDefault(); onOpenPalette(); return; }
      if (e.key === "?") { e.preventDefault(); onShowShortcuts(); return; }
      if (e.key === "n" && onNewRecord) { e.preventDefault(); onNewRecord(); return; }

      if (e.key === "g") { gPressedAt.current = Date.now(); return; }
      // Two-key "g X" chord — within 1.2s of g
      if (Date.now() - gPressedAt.current < 1200) {
        const dest = GO_MAP[e.key.toLowerCase()];
        if (dest) { e.preventDefault(); gPressedAt.current = 0; navigate(dest); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onOpenPalette, onShowShortcuts, onNewRecord]);
}