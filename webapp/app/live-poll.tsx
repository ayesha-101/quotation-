"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Phase 5 real-time: the lightest option that needs no extra dependency
// and no client-side data store. router.refresh() re-runs the current
// route's server components against fresh database rows and reconciles the
// result into the existing DOM — so the dashboard KPIs, the activity feed,
// and the Pending Invoices queue update in place without a full reload.
//
// It pauses while the tab is hidden (no point polling Neon for a dashboard
// nobody is looking at) and refreshes once immediately on becoming
// visible again, so a tab left in the background shows current data the
// moment it's focused rather than waiting out one more interval.
export default function LivePoll({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer !== null) return;
      timer = setInterval(() => router.refresh(), intervalMs);
    }
    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
