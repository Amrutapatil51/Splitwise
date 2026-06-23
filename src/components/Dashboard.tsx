"use client";

import { useAppContext } from "../context/AppContext";
import NavigationTabs from "./NavigationTabs";
import { calculateNetBalances, simplifyDebts } from "../utils/debtMath";

export default function Dashboard() {
  const { groups, expenses, activeGroupId, setActiveGroupId, setActiveView, recordRepayment } = useAppContext();

  const group = groups.find((g) => g.id === activeGroupId);
  const groupExpenses = expenses.filter((e) => e.groupId === activeGroupId);

  if (!group) return null;

  const netBalances = calculateNetBalances(group, groupExpenses);
  const settlements = simplifyDebts(netBalances);

  // My net balance (assuming "You" is always the user)
  const myNet = netBalances["You"] || 0;

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <span className="logo-text">Expense Share</span>
        </div>
        <div className="header-actions">
          <button className="btn-done" onClick={() => setActiveView("create-group")}>
            + New Group
          </button>
        </div>
      </header>

      <NavigationTabs />

      <main className="app-content">
        <div className="dashboard-layout">
          {/* Sidebar */}
          <div className="group-sidebar">
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
              Your Groups
            </h3>
            <div className="group-list">
              {groups.map((g) => (
                <div 
                  key={g.id}
                  className={`group-item ${g.id === activeGroupId ? "active" : ""}`}
                  onClick={() => setActiveGroupId(g.id)}
                >
                  <div className="group-avatar-small">{g.avatar}</div>
                  <div className="group-info">
                    <div className="group-name">{g.name}</div>
                    <div className="group-members-count">{g.members.length} members</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Dashboard Area */}
          <div className="dashboard-main">
            <div className="dashboard-header">
              <h2 className="dashboard-title">
                {group.avatar} {group.name}
              </h2>
            </div>

            <div className="balances-row">
              <div className="balance-card">
                <div className="balance-label">Total Expenses</div>
                <div className="balance-amount">
                  ₹{groupExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </div>
              </div>
              <div className="balance-card">
                <div className="balance-label">Your Balance</div>
                <div className={`balance-amount ${myNet >= 0 ? "positive" : "negative"}`}>
                  {myNet >= 0 ? "+" : ""}₹{myNet.toFixed(2)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {myNet >= 0 ? "You are owed" : "You owe"}
                </div>
              </div>
            </div>

            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="settlements-section">
                <h3 className="section-title">Suggested Settlements</h3>
                <div className="settlement-list">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="settlement-card">
                      <div className="settlement-info">
                        <strong>{s.from}</strong> owes <strong>{s.to}</strong>
                        <div className="settlement-amount">₹{s.amount.toFixed(2)}</div>
                      </div>
                      <button 
                        className="btn-settle"
                        onClick={() => recordRepayment(group.id, s.from, s.to, s.amount)}
                      >
                        Settle Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses List */}
            <div className="expenses-section">
              <h3 className="section-title">Recent Expenses</h3>
              <div className="expense-list">
                {groupExpenses.length === 0 ? (
                  <div className="empty-state">No expenses yet. Add one to get started!</div>
                ) : (
                  groupExpenses.slice().reverse().map((exp) => (
                    <div key={exp.id} className="expense-row">
                      <div className="expense-date">
                        <div className="date-month">{new Date(exp.date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="date-day">{new Date(exp.date).getDate()}</div>
                      </div>
                      <div className="expense-details">
                        <div className="expense-title">{exp.description}</div>
                        <div className="expense-payer">
                          Paid by <strong>{exp.paidBy}</strong>
                          {exp.splitType === "equal" ? " (Split equally)" : " (Custom split)"}
                        </div>
                      </div>
                      <div className="expense-cost">
                        ₹{exp.amount.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
