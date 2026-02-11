import { useEffect, useRef } from "react";


export function useAbortController() {
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const getSignal = () => abortControllerRef.current?.signal;

  const abort = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
  };

  const isAborted = () => abortControllerRef.current?.signal.aborted ?? false;

  return { getSignal, abort, isAborted };
}
