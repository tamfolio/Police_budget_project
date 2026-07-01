import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Reads `?focus=<id>` from the URL and, once the matching element with
 * `data-focus-id="<id>"` appears in the DOM, scrolls it into view and applies
 * a temporary highlight via the `.audit-focus-highlight` class.
 *
 * Pass any data dependencies (e.g. the rows array) so the effect re-runs after
 * async data loads.
 */
export function useFocusRow(deps: ReadonlyArray<unknown> = []) {
  const [params] = useSearchParams();
  const focusId = params.get("focus");

  useEffect(() => {
    if (!focusId) return;
    let attempts = 0;
    const max = 30; // ~6s
    const timer = window.setInterval(() => {
      attempts++;
      const el = document.querySelector(
        `[data-focus-id="${CSS.escape(focusId)}"]`,
      ) as HTMLElement | null;
      if (el) {
        window.clearInterval(timer);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("audit-focus-highlight");
        window.setTimeout(() => el.classList.remove("audit-focus-highlight"), 4500);
      } else if (attempts >= max) {
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, ...deps]);

  return focusId;
}