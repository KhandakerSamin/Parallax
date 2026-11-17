"use client";

import { useCallback, useEffect, useState } from "react";

export type Loadable<T> =
  | { status: "loading" }
  | { status: "error"; message: string; code: number }
  | { status: "ready"; data: T };

type WithStatus = { message: string; status: number };

function isApiError(err: unknown): err is WithStatus {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err &&
    typeof (err as WithStatus).status === "number"
  );
}

/** Load data once (and again on `reload`), tracking loading and error states. */
export function useLoad<T>(load: () => Promise<T>, fallbackMessage: string) {
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: isApiError(err) ? err.message : fallbackMessage,
          code: isApiError(err) ? err.status : 0,
        });
      });
    return () => {
      cancelled = true;
    };
    // `load` is expected to be stable (module function or useCallback).
  }, [load, fallbackMessage, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload, setState };
}
