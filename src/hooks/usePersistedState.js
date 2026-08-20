import { useEffect, useState } from "react";

// Character id from the hash route. Safe to read once at module scope:
// switching characters always goes through a full page reload.
const CID = (window.location.hash.match(/^#\/char\/([a-z0-9-]+)/) || [])[1] ?? "";
const PREFIX = `sheet:${CID}:`;
const API_URL = `/api/state?c=${CID}`;
const FLUSH_DELAY_MS = 800;
const PERIODIC_SAVE_MS = 20_000; // save at most every 20s as a safety net

// Module-level so the ~20 fields share one fetch and one debounced save.
let remoteHydrated = false;
let remoteStatePromise = null;
let flushTimer = null;
let lastFlushedAt = 0;

function getAllLocalState() {
  const all = {};
  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i);
    if (fullKey?.startsWith(PREFIX)) {
      try {
        all[fullKey.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(fullKey));
      } catch {
        // skip unparseable entries
      }
    }
  }
  return all;
}

export function fetchRemoteState() {
  if (!remoteStatePromise) {
    remoteStatePromise = fetch(API_URL, { headers: { "Cache-Control": "no-cache" } })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => {
        // Allow retry on next call if the initial load fails.
        remoteStatePromise = null;
        return {};
      })
      .then((data) => {
        remoteHydrated = true;
        return data;
      });
  }
  return remoteStatePromise;
}

// keepalive=true is needed only for unload events; regular debounce flushes
// use a normal fetch so they aren't subject to the 64KB keepalive body limit.
function sendState(keepalive = false) {
  if (!remoteHydrated) return;
  lastFlushedAt = Date.now();
  fetch(API_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...(keepalive ? { keepalive: true } : {}),
    body: JSON.stringify(getAllLocalState()),
  }).catch(() => {});
}

function flushNow() {
  if (!remoteHydrated) return;
  clearTimeout(flushTimer);
  sendState(true); // keepalive for unload reliability
}

function scheduleRemoteFlush() {
  if (!remoteHydrated) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => sendState(false), FLUSH_DELAY_MS);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);

  // Periodic save: catches changes that slipped through debounce/unload.
  setInterval(() => {
    if (remoteHydrated && Date.now() - lastFlushedAt >= PERIODIC_SAVE_MS) {
      sendState(false);
    }
  }, PERIODIC_SAVE_MS);
}

export function usePersistedState(key, defaultValue) {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    fetchRemoteState().then((remote) => {
      if (Object.prototype.hasOwnProperty.call(remote, key)) {
        setValue(remote[key]);
      }
    });
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing, quota) — state still works in-memory
    }
    scheduleRemoteFlush();
  }, [storageKey, value]);

  return [value, setValue];
}
