import { useCallback, useEffect, useMemo, useState } from "react";
import { askForConfirmation, showNotice } from "./components/AccessibleDialog";
import { apiService } from "./services/api";
import type {
  CorrectEventPayload,
  EditEventPayload,
  Event,
  EventPayload,
  Member,
  SessionRole,
} from "./types";

interface EventsViewProps {
  role: SessionRole;
}

const SEMESTER_OPTIONS = ["SEM A", "SEM B", "SUMMER"] as const;
type Semester = (typeof SEMESTER_OPTIONS)[number];

type EventDialog =
  | { mode: "create" }
  | { mode: "edit"; event: Event }
  | { mode: "correct"; event: Event }
  | { mode: "close"; event: Event };
type EventDialogMode = EventDialog["mode"];

const INITIAL_FORM = {
  name: "",
  owner_user_id: "",
  semester: "SEM A" as Semester,
};

export default function EventsView({ role }: EventsViewProps) {
  const isTreasurer = role === "TREASURER";
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<EventDialog | null>(null);
  const [formName, setFormName] = useState(INITIAL_FORM.name);
  const [formSemester, setFormSemester] = useState<Semester>(
    INITIAL_FORM.semester
  );
  const [formOwnerUserId, setFormOwnerUserId] = useState(
    INITIAL_FORM.owner_user_id
  );
  const [closeReason, setCloseReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    apiService
      .getEvents()
      .then((list) => {
        setEvents(list);
        setError("");
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load events");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    apiService
      .getMembers()
      .then((list) => setMembers(list))
      .catch((err: Error) => {
        // Non-fatal — owner select will simply be empty.
        setError(err.message || "Failed to load members");
      });
  }, [load]);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const semesterCmp = a.semester.localeCompare(b.semester);
        if (semesterCmp !== 0) {
          return semesterCmp;
        }
        return a.name.localeCompare(b.name);
      }),
    [events]
  );

  const resetForm = () => {
    setFormName(INITIAL_FORM.name);
    setFormSemester(INITIAL_FORM.semester);
    setFormOwnerUserId(INITIAL_FORM.owner_user_id);
    setCloseReason("");
  };

  const openCreate = () => {
    resetForm();
    setDialog({ mode: "create" });
  };

  const openEdit = (event: Event) => {
    setFormName(event.name);
    setFormSemester(event.semester as Semester);
    setFormOwnerUserId(event.owner_user_id || "");
    setDialog({ mode: "edit", event });
  };

  const openCorrect = (event: Event) => {
    setFormName(event.name);
    setFormSemester(event.semester as Semester);
    setFormOwnerUserId(event.owner_user_id || "");
    setDialog({ mode: "correct", event });
  };

  const openClose = (event: Event) => {
    setCloseReason("");
    setDialog({ mode: "close", event });
  };

  const closeDialog = () => {
    if (submitting) {
      return;
    }
    setDialog(null);
    resetForm();
  };

  const submitCreate = async () => {
    const name = formName.trim();
    const owner = formOwnerUserId.trim();
    if (!name) {
      showNotice("Event name is required.");
      return;
    }
    if (!owner) {
      showNotice("Owner is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createEvent({
        name,
        owner_user_id: owner,
        semester: formSemester,
      } satisfies EventPayload);
      setDialog(null);
      resetForm();
      load();
    } catch (err: unknown) {
      showNotice(getErrorMessage(err, "Failed to create event"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!dialog || dialog.mode !== "edit") {
      return;
    }
    const name = formName.trim();
    const owner = formOwnerUserId.trim();
    if (!name) {
      showNotice("Event name is required.");
      return;
    }
    if (!owner) {
      showNotice("Owner is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiService.editEvent({
        event_id: dialog.event.event_id,
        name,
        owner_user_id: owner,
        semester: formSemester,
      } satisfies EditEventPayload);
      setDialog(null);
      resetForm();
      load();
    } catch (err: unknown) {
      showNotice(getErrorMessage(err, "Failed to update event"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCorrect = async () => {
    if (!dialog || dialog.mode !== "correct") {
      return;
    }
    const name = formName.trim();
    const owner = formOwnerUserId.trim();
    if (!name) {
      showNotice("Event name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiService.correctEvent({
        event_id: dialog.event.event_id,
        name,
        owner_user_id: owner,
        semester: formSemester,
      } satisfies CorrectEventPayload);
      setDialog(null);
      resetForm();
      load();
    } catch (err: unknown) {
      showNotice(getErrorMessage(err, "Failed to correct event"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitClose = async () => {
    if (!dialog || dialog.mode !== "close") {
      return;
    }
    const reason = closeReason.trim();
    if (!reason) {
      showNotice("A reason is required to close an event.");
      return;
    }
    if (
      !(await askForConfirmation(
        `Close ${dialog.event.name}? This cannot be undone.`
      ))
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await apiService.closeEvent({
        event_id: dialog.event.event_id,
        reason,
      });
      setDialog(null);
      resetForm();
      load();
    } catch (err: unknown) {
      showNotice(getErrorMessage(err, "Failed to close event"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) {
      return;
    }
    if (dialog.mode === "close") {
      submitClose();
    } else if (dialog.mode === "create") {
      submitCreate();
    } else if (dialog.mode === "edit") {
      submitEdit();
    } else {
      submitCorrect();
    }
  };

  const renderDialog = () => {
    if (!dialog) {
      return null;
    }

    let title = "Event";
    if (dialog.mode === "close") {
      title = `Close ${dialog.event.name}`;
    } else if (dialog.mode === "correct") {
      title = `Correct ${dialog.event.name}`;
    } else if (dialog.mode === "edit") {
      title = `Edit ${dialog.event.name}`;
    } else {
      title = "New Event";
    }

    const isClose = dialog.mode === "close";

    return (
      <div className="modal-backdrop" role="presentation">
        <div
          aria-labelledby="events-dialog-title"
          aria-modal="true"
          className="modal-content glass-card"
          role="dialog"
        >
          <h2 id="events-dialog-title">{title}</h2>
          <form onSubmit={handleDialogSubmit}>
            {!isClose && (
              <>
                <div className="form-group">
                  <label htmlFor="event-name">Event Name</label>
                  <input
                    id="event-name"
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    type="text"
                    value={formName}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="event-semester">Semester</label>
                  <select
                    id="event-semester"
                    onChange={(e) =>
                      setFormSemester(e.target.value as Semester)
                    }
                    value={formSemester}
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="event-owner">Owner</label>
                  <select
                    id="event-owner"
                    onChange={(e) => setFormOwnerUserId(e.target.value)}
                    required
                    value={formOwnerUserId}
                  >
                    <option value="">— Select owner —</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {isClose && (
              <div className="form-group">
                <label htmlFor="event-close-reason">
                  Reason for closing (required)
                </label>
                <textarea
                  id="event-close-reason"
                  onChange={(e) => setCloseReason(e.target.value)}
                  required
                  rows={3}
                  value={closeReason}
                />
                <span className="help-text">
                  Closing is permanent. The reason is recorded in the audit log.
                </span>
              </div>
            )}
            <div className="modal-actions">
              <button
                className="secondary-btn"
                disabled={submitting}
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className={isClose ? "danger-btn" : "primary-btn"}
                disabled={submitting}
                type="submit"
              >
                {submitButtonLabel(submitting, isClose, dialog.mode)}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const dialogMode: EventDialogMode | null = dialog ? dialog.mode : null;

  return (
    <div className="view-container">
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <section className="glass-card">
        <div className="card-header">
          <h2>Events</h2>
          <button
            className="primary-btn"
            disabled={dialogMode === "create"}
            onClick={openCreate}
            type="button"
          >
            + New Event
          </button>
        </div>
        <p className="help-text">
          Events group related Claims and Budget Requests. Committee members
          create and edit OPEN events; Treasurers can correct any event and
          close it with a recorded reason.
        </p>

        {loading ? (
          <div className="loader-container" role="status">
            <div className="loader" />
            <p>Loading events...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">No events yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Closed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((event) => {
                  const isClosed = event.status === "CLOSED";
                  const canEditOpen = !isClosed && !isTreasurer;
                  const showEdit = !isClosed && !isTreasurer;
                  const showCorrect = isTreasurer;
                  const showClose = isTreasurer && !isClosed;
                  return (
                    <tr key={event.event_id}>
                      <td className="mono">{event.event_id}</td>
                      <td>{event.name}</td>
                      <td>{event.semester}</td>
                      <td>
                        <span
                          className={`badge status-${event.status.toLowerCase()}`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="mono">{event.owner_user_id}</td>
                      <td>
                        {event.closed_at
                          ? new Date(event.closed_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {!showEdit && !showCorrect && !showClose && (
                          <span className="muted-text">No actions</span>
                        )}
                        {showEdit && (
                          <button
                            className="secondary-btn edit-btn"
                            disabled={!canEditOpen}
                            onClick={() => openEdit(event)}
                            title={
                              canEditOpen
                                ? "Edit this OPEN event"
                                : "Only OPEN events can be edited"
                            }
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                        {showCorrect && (
                          <button
                            className="secondary-btn"
                            onClick={() => openCorrect(event)}
                            type="button"
                          >
                            Correct
                          </button>
                        )}
                        {showClose && (
                          <button
                            className="danger-btn"
                            onClick={() => openClose(event)}
                            type="button"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {renderDialog()}
    </div>
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

function submitButtonLabel(
  submitting: boolean,
  isClose: boolean,
  mode: EventDialogMode
): string {
  if (submitting) {
    return "Working...";
  }
  if (isClose) {
    return "Close Event";
  }
  if (mode === "create") {
    return "Create Event";
  }
  return "Save";
}
