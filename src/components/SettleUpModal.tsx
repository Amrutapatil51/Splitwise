"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { calculateNetBalances, simplifyDebts } from "../utils/debtMath";
import { CheckCircle } from "lucide-react";

interface SettleUpModalProps {
  onClose: () => void;
}

export default function SettleUpModal({ onClose }: SettleUpModalProps) {
  const { groups, expenses, activeGroupId, recordRepayment } = useAppContext();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settled, setSettled] = useState<Set<string>>(new Set());

  const group = groups.find((g) => g.id === activeGroupId);
  if (!group) return null;

  const groupExpenses = expenses.filter((e) => e.groupId === activeGroupId);
  const netBalances = calculateNetBalances(group, groupExpenses);
  const transactions = simplifyDebts(netBalances).filter(
    (t) => !settled.has(`${t.from}-${t.to}`)
  );

  const handleSettle = async (from: string, to: string, amount: number) => {
    const key = `${from}-${to}`;
    setSettlingId(key);
    await recordRepayment(group.id, from, to, amount);
    setSettled((prev) => new Set([...prev, key]));
    setSettlingId(null);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">💸 Settle Up</h2>
          <button className="modal-close" onClick={onClose} title="Close">×</button>
        </div>

        <div className="modal-body">
          {/* Group info */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", background: "#f9fafb",
            borderRadius: "var(--radius-md)", marginBottom: "20px",
            border: "1px solid var(--border-color)"
          }}>
            <span style={{ fontSize: "24px" }}>{group.avatar}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{group.name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {group.members.join(", ")}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="settle-all-clear">
              <CheckCircle size={48} color="var(--success)" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-main)", marginBottom: "6px" }}>
                All settled up! 🎉
              </p>
              <p style={{ fontSize: "13px" }}>No outstanding balances in this group.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Here's who owes what. Click <strong>Mark Paid</strong> to record a payment.
              </p>

              {transactions.map((t) => {
                const key = `${t.from}-${t.to}`;
                const isSettling = settlingId === key;
                return (
                  <div key={key} className="settle-transaction">
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--danger-light)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "16px", flexShrink: 0
                    }}>
                      {t.from.charAt(0).toUpperCase()}
                    </div>

                    <div className="settle-transaction-text">
                      <span style={{ fontWeight: 600 }}>{t.from}</span>
                      <span style={{ color: "var(--text-muted)" }}> owes </span>
                      <span style={{ fontWeight: 600 }}>{t.to}</span>
                      <div className="settle-amount">₹{t.amount.toFixed(2)}</div>
                    </div>

                    <button
                      className="settle-btn"
                      disabled={isSettling}
                      onClick={() => handleSettle(t.from, t.to, t.amount)}
                      style={{ opacity: isSettling ? 0.6 : 1 }}
                    >
                      {isSettling ? "Saving..." : "Mark Paid"}
                    </button>
                  </div>
                );
              })}

              <p style={{
                fontSize: "12px", color: "var(--text-muted)",
                marginTop: "16px", textAlign: "center"
              }}>
                Marking paid records a repayment expense in this group.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
