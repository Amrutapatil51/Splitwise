"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Mail, Check, X, Clock } from "lucide-react";

export default function PendingInvitations() {
  const { pendingInvitations, respondToInvitation, refreshPendingInvitations } = useAppContext();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (pendingInvitations.length === 0) return null;

  const visibleInvitations = pendingInvitations.filter((inv) => !dismissedIds.has(inv.id));
  if (visibleInvitations.length === 0) return null;

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    try {
      const result = await respondToInvitation(inviteId, accept);
      if (result.success) {
        setDismissedIds((prev) => new Set([...prev, inviteId]));
        await refreshPendingInvitations();
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div style={{
      padding: "12px 16px",
      background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))",
      borderBottom: "1px solid rgba(99,102,241,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{
          width: "24px", height: "24px", borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Mail size={12} color="white" />
        </div>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
          Pending Invitations ({visibleInvitations.length})
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {visibleInvitations.map((inv) => {
          const isResponding = respondingId === inv.id;
          return (
            <div
              key={inv.id}
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "10px 14px",
                border: "1px solid rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>{inv.groupAvatar}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                    {inv.groupName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={10} />
                    Invited to join this group
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => handleRespond(inv.id, true)}
                  disabled={isResponding}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "6px 12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none", borderRadius: "8px", cursor: "pointer",
                    fontSize: "12px", fontWeight: 600, color: "white",
                    opacity: isResponding ? 0.7 : 1,
                    transition: "opacity 0.2s"
                  }}
                >
                  <Check size={12} />
                  {isResponding ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => handleRespond(inv.id, false)}
                  disabled={isResponding}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "6px 12px",
                    background: "none",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px", cursor: "pointer",
                    fontSize: "12px", fontWeight: 600,
                    color: "var(--text-muted)",
                    opacity: isResponding ? 0.7 : 1,
                    transition: "opacity 0.2s"
                  }}
                >
                  <X size={12} />
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
