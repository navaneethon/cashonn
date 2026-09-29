import { useEffect, useState } from "react";

/**
 * The app's single definition of the mobile/narrow layout, matching the <1024px switch used
 * in App.tsx, Toolbar and LedgerTable.
 *
 * Kept reactive: the phone layout has to react to a rotation or a window resize, not just to
 * the value at first render. The same query string is used by `isNarrowViewport()`.
 */
export const NARROW_QUERY = "(max-width: 1023px)";

export function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches;
}

export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(isNarrowViewport);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}
