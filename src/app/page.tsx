"use client";

import { useState } from "react";
import { AppProvider, useAppContext } from "../context/AppContext";
import CreateGroup from "../components/CreateGroup";
import Dashboard from "../components/Dashboard";
import AddExpense from "../components/AddExpense";
import SettleUpModal from "../components/SettleUpModal";
import PendingInvitations from "../components/PendingInvitations";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '24px',
        padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px' }}>💸</div>
        <div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800, marginBottom: '12px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Expense Share
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '380px' }}>
            Split expenses with friends, roommates, and more. Sign in to get started.
          </p>
        </div>
        <SignInButton mode="modal">
          <button className="btn-done primary" style={{ padding: '14px 36px', fontSize: '16px' }}>
            Sign In to Continue
          </button>
        </SignInButton>
      </div>
    );
  }

  return <>{children}</>;
}

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { groups, activeGroupId, setActiveGroupId, activeView, setActiveView, dbConfigured } = useAppContext();
  const { isLoaded, userId } = useAuth();
  const [showSettleUp, setShowSettleUp] = useState(false);

  // Only show settle up if there's an active group
  const canSettleUp = !!activeGroupId && groups.length > 0;

  return (
    <div id="app-container">
      {/* Persistent Left Sidebar */}
      <aside className="global-sidebar">
        <div style={{ padding: '0 16px', marginBottom: '24px' }}>
          {isLoaded && userId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserButton />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>My Account</span>
            </div>
          )}
        </div>

        {!dbConfigured && (
          <div style={{
            margin: '0 16px 16px',
            padding: '10px 12px',
            background: 'rgba(255, 165, 0, 0.1)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            ⚠️ <strong>Offline mode</strong> — Data saved locally. Connect Neon DB to sync across devices.
          </div>
        )}

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            Home
          </button>
          <button
            className={`sidebar-link ${activeView === "add-expense" ? "active" : ""}`}
            onClick={() => setActiveView("add-expense")}
          >
            New expense
          </button>
          <button
            className={`sidebar-link ${activeView === "create-group" ? "active" : ""}`}
            onClick={() => setActiveView("create-group")}
          >
            New group
          </button>
          <button
            className="sidebar-link"
            onClick={() => canSettleUp && setShowSettleUp(true)}
            style={{ opacity: canSettleUp ? 1 : 0.4, cursor: canSettleUp ? 'pointer' : 'not-allowed' }}
            title={canSettleUp ? "Settle up balances" : "Select a group first"}
          >
            Settle up
          </button>
        </nav>

        {groups.length > 0 && (
          <div className="sidebar-groups">
            <h3 className="sidebar-section-title">Your groups</h3>
            <div className="group-list">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className={`group-item ${g.id === activeGroupId && activeView === "dashboard" ? "active" : ""}`}
                  onClick={() => {
                    setActiveGroupId(g.id);
                    setActiveView("dashboard");
                  }}
                >
                  <div className="group-avatar-small">{g.avatar}</div>
                  <div className="group-info">
                    <div className="group-name">{g.name}</div>
                    <div className="group-balance">View details</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <PendingInvitations />
        {children}
      </main>

      {/* Settle Up Modal */}
      {showSettleUp && (
        <SettleUpModal onClose={() => setShowSettleUp(false)} />
      )}
    </div>
  );
}

function AppRenderer() {
  const { activeView, groups, setActiveView, isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading your groups...</p>
      </div>
    );
  }

  if (groups.length === 0 && activeView !== "create-group") {
    setActiveView("create-group");
    return null;
  }

  if (groups.length === 0) {
    return (
      <div id="app-container">
        <main className="main-content" style={{ paddingLeft: 0, marginLeft: 0 }}>
          <CreateGroup />
        </main>
      </div>
    );
  }

  switch (activeView) {
    case "create-group":
      return (
        <SidebarLayout>
          <CreateGroup />
        </SidebarLayout>
      );
    case "dashboard":
      return (
        <SidebarLayout>
          <Dashboard />
        </SidebarLayout>
      );
    case "add-expense":
      return (
        <SidebarLayout>
          <AddExpense />
        </SidebarLayout>
      );
    default:
      return (
        <SidebarLayout>
          <Dashboard />
        </SidebarLayout>
      );
  }
}

export default function Home() {
  return (
    <AuthGate>
      <AppProvider>
        <AppRenderer />
      </AppProvider>
    </AuthGate>
  );
}
