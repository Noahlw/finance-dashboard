import type { Event } from "../types";
import { apiService } from "./api";

interface CacheEntry {
  expiresAt: number;
  promise: Promise<Event[]>;
}

let cached: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export function loadEvents(force = false): Promise<Event[]> {
  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  const promise = apiService.getEvents();
  cached = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise: promise.catch((err: unknown) => {
      cached = null;
      throw err;
    }),
  };
  return promise;
}

export function resetEventCache(): void {
  cached = null;
}
