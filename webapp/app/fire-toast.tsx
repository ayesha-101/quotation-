"use client";

import { useEffect } from "react";
import { useToast } from "./toast-provider";

// Fires a toast once on mount — used on server-rendered pages that need to
// surface a one-off message after a redirect (e.g. ?created=1), where a
// plain useEffect in the page itself isn't an option (it's a server
// component). Renders nothing.
export default function FireToast({ message, kind }: { message: string; kind?: "success" | "error" | "info" }) {
  const { show } = useToast();
  useEffect(() => {
    show(message, kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
