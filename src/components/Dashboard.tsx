"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { calculateNetBalances, simplifyDebts } from "../utils/debtMath";
import { Search, Trash2, Users, UserPlus } from "lucide-react";
import AddMemberModal from "./AddMemberModal";
import { buildUpiUri } from "../utils/payment";
import QrModal from "./QrModal";

export default function Dashboard() {
  const { groups, expenses, activeGroupId, deleteExpense, deleteGroup, setActiveView, updateMemberUpiId, recordRepayment } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState("All");
  const [expenseFilter, setExpenseFilter] = useState("All expenses");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // UPI / QR state
  const [upiFormMember, setUpiFormMember] = useState<string | null>(null);
  const [upiInput, setUpiInput] = useState("");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiError, setUpiError] = useState("");
  const [qrModal, setQrModal] = useState<{
    upiUri: string;
    amount: number;
    payeeName: string;
  } | null>(null);

  const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

  const handleGenerateQr = (creditorName: string, netBalance: number) => {
    const upiId = group?.upiIds?.[creditorName];

    if (upiId) {
      const uri = buildUpiUri(upiId, creditorName, Math.abs(netBalance), `Splitwisely: ${group.name}`);
      setQrModal({ upiUri: uri, amount: Math.abs(netBalance), payeeName: creditorName });
    } else {
      setUpiFormMember(creditorName);
      setUpiInput("");
      setUpiError("");
    }
  };

  const handleUpiSubmit = async (creditorName: string, netBalance: number) => {
    if (!UPI_REGEX.test(upiInput.trim())) {
      setUpiError("Enter a valid UPI ID (e.g. name@upi)");
      return;
    }

    setUpiSaving(true);
    setUpiError("");
    const result = await updateMemberUpiId(group!.id, creditorName, upiInput.trim());

    if (!result.success) {
      setUpiError(result.error ?? "Failed to save UPI ID. Try again.");
      setUpiSaving(false);
      return;
    }

    const uri = buildUpiUri(upiInput.trim(), creditorName, Math.abs(netBalance), `Splitwisely: ${group!.name}`);
    setQrModal({ upiUri: uri, amount: Math.abs(netBalance), payeeName: creditorName });

    setUpiFormMember(null);
    setUpiInput("");
    setUpiSaving(false);
  };

  const group = groups.find((g) => g.id === activeGroupId);

  if (!group) return null;

  // Group expenses
  const groupExpenses = expenses.filter((e) => e.groupId === activeGroupId);

  // Calculate balances
  const netBalances = calculateNetBalances(group, groupExpenses);
  const simplifiedTransactions = simplifyDebts(netBalances);

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
    .map((member) => {
      const debtorTx = simplifiedTransactions.find((t) => t.from === member);
      const youOweTx = simplifiedTransactions.find((t) => t.from === "You" && t.to === member);

      let oweText = "All settled up ✓";
      let netRelation = 0;

      if (youOweTx) {
        oweText = `You owe ₹${youOweTx.amount.toFixed(2)}`;
        netRelation = youOweTx.amount;
      } else if (debtorTx) {
        if (debtorTx.to === "You") {
          oweText = `Owes you ₹${debtorTx.amount.toFixed(2)}`;
          netRelation = -debtorTx.amount;
        } else {
          oweText = `Owes ₹${debtorTx.amount.toFixed(2)} to ${debtorTx.to}`;
          netRelation = 0;
        }
      } else if ((netBalances[member] || 0) > 0.01) {
        oweText = `Gets back ₹${netBalances[member].toFixed(2)}`;
        netRelation = 0;
      }

      return { member, oweText, netRelation };
    })
    .filter(({ netRelation }) => {
      if (activeSubTab === "You owe") return netRelation > 0;
      if (activeSubTab === "You paid") return netRelation < 0;
      if (activeSubTab === "Settled up") return netRelation === 0;
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
            displayedMembers.map(({ member, oweText, netRelation }) => {
              return (
                <div key={member} className="balance-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="avatar-circle">{member.charAt(0).toUpperCase()}</div>
                    <div className="balance-info">
                      <span className="balance-name">{member}</span>
                      <span
                        className="balance-desc"
                        style={{
                          color:
                            netRelation > 0
                              ? "var(--danger)"
                              : netRelation < 0
                              ? "var(--success)"
                              : "var(--text-muted)",
                        }}
                      >
                        {oweText}
                      </span>
                    </div>
                  </div>

                  {/* Generate QR button — only shown when you owe this person (netRelation > 0) */}
                  {netRelation > 0 && upiFormMember !== member && (
                    <button
                      className="btn-done"
                      style={{ padding: '6px 14px', fontSize: '12px', marginLeft: 'auto' }}
                      onClick={() => handleGenerateQr(member, netRelation)}
                    >
                      Generate QR
                    </button>
                  )}

                  {/* Inline UPI form — shown when this member's form is open */}
                  {upiFormMember === member && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto', maxWidth: '240px' }}>
                      <input
                        type="text"
                        placeholder="e.g. name@upi"
                        value={upiInput}
                        onChange={(e) => setUpiInput(e.target.value)}
                        disabled={upiSaving}
                        autoFocus
                        style={{
                          padding: "6px 10px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "12px",
                          fontFamily: "inherit"
                        }}
                      />
                      {upiError && (
                        <span style={{ color: 'var(--danger)', fontSize: '11px' }}>{upiError}</span>
                      )}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: "flex-end" }}>
                        <button
                          className="btn-done"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => handleUpiSubmit(member, netRelation)}
                          disabled={upiSaving}
                        >
                          {upiSaving ? 'Saving…' : 'Save & QR'}
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
                          onClick={() => { setUpiFormMember(null); setUpiError(""); }}
                          disabled={upiSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
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
      {qrModal && (
        <QrModal
          upiUri={qrModal.upiUri}
          amount={qrModal.amount}
          payeeName={qrModal.payeeName}
          onClose={() => setQrModal(null)}
          onSettle={async (refNo) => {
            await recordRepayment(group!.id, "You", qrModal.payeeName, qrModal.amount, refNo);
          }}
        />
      )}
    </>
  );
}
