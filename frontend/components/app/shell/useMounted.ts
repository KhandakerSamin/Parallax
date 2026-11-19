import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True after hydration: the theme is only known in the browser. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
