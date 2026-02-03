import { useEffect, useRef } from "react";

//  Hook to manage AbortController for cancelling API requests
//  Automatically aborts on component unmount

export function useAbortController() {
  const abortControllerRef = useRef<AbortController>();

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
