import { useEffect, useState } from "react";
import type { Event } from "../types";
import { apiService } from "../services/api";

interface EventPickerProps {
  value: string | undefined;
  onChange: (eventId: string | undefined) => void;
  disabled?: boolean;
  label?: string;
  "aria-label"?: string;
  id?: string;
}

interface CacheEntry {
  promise: Promise<Event[]>;
  expiresAt: number;
}

// Per-session cache. The same picker instance, and any sibling pickers
// mounted during the same session, share this entry until it expires.
let cachedEvents: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds — same shelf life as other session reads.

async function loadEvents(force = false): Promise<Event[]> {
  if (!force && cachedEvents && cachedEvents.expiresAt > Date.now()) {
    return cachedEvents.promise;
  }
  const promise = apiService.getEvents();
  cachedEvents = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    promise: promise.catch((err) => {
      // Drop the cache on failure so a retry can run a fresh request.
      cachedEvents = null;
      throw err;
    }),
  };
  return promise;
}

export function EventPicker({
  value,
  onChange,
  disabled = false,
  label = "Event",
  "aria-label": ariaLabel,
  id = "event-picker",
}: EventPickerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadEvents()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setEvents(list);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) {
          return;
        }
        setError(err.message || "Failed to load events");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accessibleName = ariaLabel || label;

  if (loading) {
    return (
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor={id}>{label}</label>
        <div
          aria-busy="true"
          aria-label={accessibleName}
          className="loader-container"
          id={id}
          role="status"
          style={{ minHeight: "2.25rem" }}
        >
          <div className="loader" />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor={id}>{label}</label>
        <div
          aria-invalid="true"
          aria-label={accessibleName}
          className="alert error"
          id={id}
          role="alert"
        >
          {error}
        </div>
        <button
          className="secondary-btn"
          disabled={disabled}
          onClick={() => {
            setError("");
            setLoading(true);
            loadEvents(true)
              .then((list) => {
                setEvents(list);
                setLoading(false);
              })
              .catch((err: Error) => {
                setError(err.message || "Failed to load events");
                setLoading(false);
              });
          }}
          style={{ marginTop: "0.5rem" }}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor={id}>{label}</label>
        <select aria-label={accessibleName} disabled id={id} value="">
          <option value="">— No event —</option>
        </select>
        <span className="help-text">No events available yet.</span>
      </div>
    );
  }

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label htmlFor={id}>{label}</label>
      <select
        aria-label={accessibleName}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value || undefined)}
        value={value ?? ""}
      >
        <option value="">— No event —</option>
        {events.map((evt) => (
          <option key={evt.event_id} value={evt.event_id}>
            {evt.name} ({evt.semester})
          </option>
        ))}
      </select>
    </div>
  );
}
