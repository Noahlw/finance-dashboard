import { useEffect, useState } from "react";
import "./App.css";
import BudgetRequestsView from "./BudgetRequestsView";
import ClaimsView from "./ClaimsView";
import DashboardView from "./DashboardView";
import FinanceAccountsView from "./FinanceAccountsView";
import MembersView from "./MembersView";
import PayoutsView from "./PayoutsView";
import ReportsView from "./ReportsView";
import ReviewDashboard from "./ReviewDashboard";
import { apiService } from "./services/api";
import type {
  BudgetLine,
  Member,
  SessionInfo,
  SessionResponse,
  WorkspaceView,
} from "./types";

const VIEW_LABELS: Record<WorkspaceView, string> = {
  "budget-requests": "Budget Requests",
  claims: "Claims",
  income: "Income",
  members: "Members",
  payouts: "Payouts",
  reports: "Reports",
  review: "Review",
};

function SessionLoading() {
  return (
    <div className="session-loading">
      <div className="loader" />
      <p>Verifying access...</p>
    </div>
  );
}

function AccessDenied({ reason, role }: { reason: string; role?: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    inactive_user: {
      description:
        "Your account is currently inactive. Contact a Treasurer to reactivate.",
      title: "Account Inactive",
    },
    no_session: {
      description:
        "Please sign in with your Google account to access the Finance Workspace.",
      title: "Not Signed In",
    },
    unauthorized_role: {
      description: `Your role (${role || "unknown"}) does not have access to this workspace. Only Committee and Treasurer accounts are allowed.`,
      title: "Insufficient Permissions",
    },
    unknown_user: {
      description:
        "Your Google account is not recognized. Contact a Treasurer to be added.",
      title: "Access Denied",
    },
  };
  const msg = messages[reason] || {
    description: "You do not have permission to access this workspace.",
    title: "Access Denied",
  };

  return (
    <div className="access-denied">
      <div className="access-denied-card">
        <div className="access-denied-icon">!</div>
        <h1>{msg.title}</h1>
        <p>{msg.description}</p>
      </div>
    </div>
  );
}

function PlaceholderView({ view }: { view: WorkspaceView }) {
  return (
    <div className="view-container">
      <section className="glass-card placeholder-card">
        <h2>{VIEW_LABELS[view]}</h2>
        <p className="placeholder-text">This view is coming soon.</p>
      </section>
    </div>
  );
}

function WorkspaceShell({ session }: { session: SessionInfo }) {
  const initialView =
    (window.location.hash?.replace("#", "") as WorkspaceView) ||
    session.views[0];
  const [activeView, setActiveView] = useState<WorkspaceView>(
    session.views.includes(initialView) ? initialView : session.views[0]
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    apiService
      .getMembers()
      .then(setMembers)
      .catch((err: Error) => setWorkspaceError(err.message));
    apiService
      .getMyClaims()
      .then((res) => setBudgetLines(res.budgetLines || []))
      .catch((err: Error) => setWorkspaceError(err.message));
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const v = window.location.hash.replace("#", "") as WorkspaceView;
      if (v && session.views.includes(v)) {
        setActiveView(v);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [session.views]);

  const renderView = () => {
    switch (activeView) {
      case "claims":
        return <ClaimsView budgetLines={budgetLines} members={members} />;
      case "members":
        return <MembersView />;
      case "budget-requests":
        return <BudgetRequestsView role={session.role} />;
      case "review":
        return (
          <>
            <DashboardView role={session.role} />
            <ReviewDashboard members={members} role={session.role} />
          </>
        );
      case "income":
        return <FinanceAccountsView role={session.role} />;
      case "payouts":
        return <PayoutsView role={session.role} />;
      case "reports":
        return <ReportsView role={session.role} />;
      default:
        return <PlaceholderView view={activeView} />;
    }
  };

  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="workspace-header-left">
          <h1 className="workspace-title">Finance Workspace</h1>
        </div>
        <div className="workspace-header-right">
          <span className="workspace-user">
            <span className="workspace-user-name">{session.display_name}</span>
            <span
              className={`workspace-role role-${session.role.toLowerCase()}`}
            >
              {session.role}
            </span>
          </span>
        </div>
      </header>

      <div className="workspace-body">
        <nav className="workspace-sidebar">
          {session.views.map((v) => (
            <button
              className={`sidebar-item ${activeView === v ? "active" : ""}`}
              key={v}
              onClick={() => {
                setActiveView(v);
                window.location.hash = v;
              }}
            >
              <span className="sidebar-icon">{getViewIcon(v)}</span>
              <span className="sidebar-label">{VIEW_LABELS[v]}</span>
            </button>
          ))}
        </nav>

        <main className="workspace-content">
          {workspaceError && (
            <div className="alert error">Workspace error: {workspaceError}</div>
          )}
          {renderView()}
        </main>
      </div>

      <nav className="workspace-bottom-nav">
        {session.views.map((v) => (
          <button
            className={`bottom-nav-item ${activeView === v ? "active" : ""}`}
            key={v}
            onClick={() => setActiveView(v)}
          >
            <span className="bottom-nav-icon">{getViewIcon(v)}</span>
            <span className="bottom-nav-label">{VIEW_LABELS[v]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function getViewIcon(view: WorkspaceView): string {
  switch (view) {
    case "review":
      return "\u{270F}\u{FE0F}";
    case "claims":
      return "\u{1F4B0}";
    case "members":
      return "\u{1F465}";
    case "budget-requests":
      return "\u{1F4CB}";
    case "income":
      return "\u{1F4B5}";
    case "payouts":
      return "\u{1F4B8}";
    case "reports":
      return "\u{1F4CA}";
  }
}

export default function App() {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    apiService.resolveSession().then(setSession);
  }, []);

  if (!session) {
    return <SessionLoading />;
  }
  if (!session.allowed) {
    return <AccessDenied reason={session.reason} role={session.role} />;
  }
  return <WorkspaceShell session={session} />;
}
