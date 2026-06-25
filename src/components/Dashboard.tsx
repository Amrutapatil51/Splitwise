"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { calculateNetBalances } from "../utils/debtMath";
import { Search, Trash2, Users, UserPlus } from "lucide-react";
import AddMemberModal from "./AddMemberModal";

export default function Dashboard() {
  const { groups, expenses, activeGroupId, deleteExpense, deleteGroup, setActiveView } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState("All");
  const [expenseFilter, setExpenseFilter] = useState("All expenses");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const group = groups.find((g) => g.id === activeGroupId);

  if (!group) return null;

  // Group expenses
  const groupExpenses = expenses.filter((e) => e.groupId === activeGroupId);

  // Calculate balances
  const netBalances = calculateNetBalances(group, groupExpenses);

  // Filter expenses
  const filteredExpenses = groupExpenses
    .filter((exp) => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      const isSettlement = exp.description.startsWith("Settled:");
      
      let matchesFilter = true;
      if (expenseFilter === "Outstanding") {
        matchesFilter = !isSettlement;
      } else if (expenseFilter === "Settled up") {
        matchesFilter = isSettlement;
      }
      
      return matchesSearch && matchesFilter;
    })
    .reverse();

  // Filter members based on activeSubTab
  const displayedMembers = group.members
    .filter((m) => m !== "You")
    .filter((member) => {
      const net = netBalances[member] || 0;
      if (activeSubTab === "You owe") return net > 0;
      if (activeSubTab === "You paid") return net < 0;
      if (activeSubTab === "Settled up") return net === 0;
      return true; // "All"
    });

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    await deleteExpense(id);
    setDeletingId(null);
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Delete group "${group.name}" and all its expenses? This cannot be undone.`)) return;
    await deleteGroup(group.id);
  };

  return (
    <>
      <div className="dashboard-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className="dashboard-title">
              <span style={{ marginRight: "10px" }}>{group.avatar}</span>
              {group.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              <Users size={14} />
              <span>{group.members.join(", ")}</span>
              <button
                onClick={() => setShowAddMemberModal(true)}
                title="Add member"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginLeft: "8px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <UserPlus size={12} />
                Add Member
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-done"
              style={{ padding: "8px 16px", fontSize: "13px" }}
              onClick={() => setActiveView("add-expense")}
            >
              + Add expense
            </button>
            <button
              onClick={handleDeleteGroup}
              title="Delete group"
              style={{
                background: "none",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="sub-tabs" style={{ marginTop: "16px" }}>
          {["All", "You owe", "You paid", "Settled up"].map((tab) => (
            <button
              key={tab}
              className={`sub-tab ${activeSubTab === tab ? "active" : ""}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-body">
        {/* Search */}
        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search expenses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Balances Section */}
        <h3 className="section-title">Balances</h3>
        <div className="balances-list">
          {displayedMembers.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No members match this filter.</p>
          ) : (
            displayedMembers.map((member) => {
              const net = netBalances[member] || 0;
              const oweText =
                net > 0
                  ? `You owe ₹${Math.abs(net).toFixed(2)}`
                  : net < 0
                  ? `Owes you ₹${Math.abs(net).toFixed(2)}`
                  : "All settled up ✓";

              return (
                <div key={member} className="balance-item">
                  <div className="avatar-circle">{member.charAt(0).toUpperCase()}</div>
                  <div className="balance-info">
                    <span className="balance-name">{member}</span>
                    <span
                      className="balance-desc"
                      style={{
                        color:
                          net > 0
                            ? "var(--danger)"
                            : net < 0
                            ? "var(--success)"
                            : "var(--text-muted)",
                      }}
                    >
                      {oweText}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Expenses Section */}
        <h3 className="section-title" style={{ marginTop: "28px" }}>Expenses</h3>

        <div className="expense-filters">
          {["All expenses", "Outstanding", "Settled up"].map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${expenseFilter === filter ? "active" : ""}`}
              onClick={() => setExpenseFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="expenses-grid">
          {filteredExpenses.length === 0 ? (
            <div
              className="empty-state"
              style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div>
              <p style={{ color: "var(--text-muted)" }}>No expenses yet. Add one to get started!</p>
            </div>
          ) : (
            filteredExpenses.map((exp) => (
              <div key={exp.id} className="expense-card">
                <div className="expense-icon">📝</div>
                <div className="expense-content">
                  <span className="expense-title">{exp.description}</span>
                  <span className="expense-meta">
                    ₹{exp.amount.toFixed(2)} •{" "}
                    {exp.paidBy === "You" ? "You paid" : `${exp.paidBy} paid`}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  disabled={deletingId === exp.id}
                  title="Delete expense"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                    opacity: deletingId === exp.id ? 0.4 : 1,
                    transition: "color 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--danger)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {showAddMemberModal && (
        <AddMemberModal onClose={() => setShowAddMemberModal(false)} />
      )}
    </>
  );
}
