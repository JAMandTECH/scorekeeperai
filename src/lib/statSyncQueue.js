import { base44 } from "@/api/base44Client";

// Persistent offline queue for live-scoring stat writes.
//
// Every stat write is appended to localStorage FIRST, then flushed to the
// server. If the connection drops (weak wifi in a gym, tab crash, refresh),
// nothing is lost — the queued writes survive and are retried automatically
// every few seconds and whenever the browser comes back online.
//
// Each queued item is a call to the existing `upsertPlayerStat` backend
// function, which applies stat DELTAS additively, so replaying a queued item
// after a reconnect stays correct.

const STORAGE_KEY = "sk_stat_sync_queue_v1";
const FLUSH_INTERVAL_MS = 4000;

let queue = load();
let flushing = false;
let timer = null;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // storage full / unavailable — nothing else we can do
  }
}

function notify() {
  const status = getStatus();
  listeners.forEach((cb) => {
    try { cb(status); } catch { /* ignore listener errors */ }
  });
}

export function getStatus() {
  return {
    pending: queue.length,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    flushing,
  };
}

export function subscribeStatSync(cb) {
  listeners.add(cb);
  cb(getStatus());
  return () => listeners.delete(cb);
}

// Enqueue a stat write. Returns immediately after persisting locally, then
// triggers a flush attempt. The optimistic UI in the page already reflects
// the change, so the scorekeeper never waits on the network.
export function enqueueStatWrite(payload) {
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    attempts: 0,
  });
  persist();
  notify();
  flush();
}

export async function flush() {
  if (flushing) return;
  if (queue.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  flushing = true;
  notify();

  try {
    // Process one at a time in order so additive deltas stay consistent.
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await base44.functions.invoke("upsertPlayerStat", item.payload);
        queue.shift();
        persist();
        notify();
      } catch (e) {
        // Leave the item at the head of the queue and stop; the interval /
        // online listener will retry shortly.
        item.attempts = (item.attempts || 0) + 1;
        persist();
        console.error("statSyncQueue: flush failed, will retry", e);
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}

// Start background retry + reconnect handling. Safe to call multiple times.
export function startStatSync() {
  if (typeof window === "undefined") return;
  if (!startStatSync._wired) {
    window.addEventListener("online", () => { notify(); flush(); });
    window.addEventListener("offline", () => notify());
    startStatSync._wired = true;
  }
  if (!timer) {
    timer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
  }
  flush();
}