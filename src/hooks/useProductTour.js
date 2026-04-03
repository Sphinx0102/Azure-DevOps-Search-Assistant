import { useCallback, useEffect, useRef, useState } from "react";
import { CURRENT_TOUR_VERSION, TOUR_STORAGE_KEY } from "../data/tourConfig";

const REQUIRED_TOUR_SELECTORS = [
  '[data-tour="search-input"]',
  '[data-tour="search-type"]',
  '[data-tour="generate-button"]',
  '[data-tour="results-panel"]',
  '[data-tour="copy-query"]',
];

function getStoredTourVersion() {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistTourVersion() {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, CURRENT_TOUR_VERSION);
  } catch {
    // no-op
  }
}

function areTourTargetsReady() {
  return REQUIRED_TOUR_SELECTORS.every((selector) =>
    Boolean(document.querySelector(selector))
  );
}

export function useProductTour() {
  const [run, setRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const intervalRef = useRef(null);

  const clearStartInterval = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const scheduleStart = useCallback(() => {
    clearStartInterval();
    setRun(false);

    let attempts = 0;
    intervalRef.current = window.setInterval(() => {
      attempts += 1;
      const ready = areTourTargetsReady();

      if (ready || attempts >= 20) {
        clearStartInterval();
        setTourKey((prev) => prev + 1);
        setRun(true);
      }
    }, 100);
  }, [clearStartInterval]);

  useEffect(() => {
    const storedVersion = getStoredTourVersion();
    if (storedVersion !== CURRENT_TOUR_VERSION) {
      scheduleStart();
    }

    return () => {
      clearStartInterval();
    };
  }, [scheduleStart, clearStartInterval]);

  const startTour = useCallback(() => {
    scheduleStart();
  }, [scheduleStart]);

  const finishTour = useCallback(() => {
    persistTourVersion();
    setRun(false);
  }, []);

  return {
    run,
    tourKey,
    startTour,
    finishTour,
  };
}
