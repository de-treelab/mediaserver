import { monitorEventLoopDelay } from "node:perf_hooks";
import { promises as fs } from "node:fs";

// Document/thumbnail downloads stall when the process runs out of file
// descriptors (leaked read streams) or libuv threadpool capacity (the default
// is only 4 threads, shared by every fs read and by sharp/ffmpeg). Both
// resources are process-wide, which is why an exhaustion shows up across all
// file-serving endpoints at once. This module surfaces the relevant counters so
// the trend can be watched live via /health.

// Sampling histogram of event-loop delay. Enabled once on import; cheap to keep
// running. High mean/p99 here means the event loop is being blocked (e.g. by
// synchronous work), which stalls request handling.
const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();

const nsToMs = (ns: number): number =>
  Number.isFinite(ns) ? Math.round((ns / 1e6) * 100) / 100 : 0;

/**
 * Number of open file descriptors held by this process. A steadily climbing
 * value points at an FD leak; a value spiking toward the `ulimit -n` ceiling
 * and recovering points at transient saturation. Linux-only (reads /proc) —
 * returns null on platforms without it.
 */
const getOpenFileDescriptors = async (): Promise<number | null> => {
  try {
    const entries = await fs.readdir("/proc/self/fd");
    // Subtract one for the fd opened by readdir itself.
    return Math.max(entries.length - 1, 0);
  } catch {
    return null;
  }
};

export type Diagnostics = {
  openFileDescriptors: number | null;
  threadpoolSize: number;
  activeResources: number;
  eventLoopDelayMs: {
    mean: number;
    max: number;
    p99: number;
  };
};

export const getDiagnostics = async (): Promise<Diagnostics> => ({
  openFileDescriptors: await getOpenFileDescriptors(),
  // libuv threadpool size — bump UV_THREADPOOL_SIZE if downloads stall while
  // this stays at the default of 4 under load.
  threadpoolSize: Number(process.env.UV_THREADPOOL_SIZE ?? 4),
  // Rough proxy for leaked sockets/streams/timers; should stay roughly flat.
  activeResources: process.getActiveResourcesInfo().length,
  eventLoopDelayMs: {
    mean: nsToMs(loopDelay.mean),
    max: nsToMs(loopDelay.max),
    p99: nsToMs(loopDelay.percentile(99)),
  },
});
