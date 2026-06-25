"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { UserPlus, X } from "lucide-react";

interface AddMemberModalProps {
  onClose: () => void;
}

export default function AddMemberModal({ onClose }: AddMemberModalProps) {
  const { groups, activeGroupId, updateGroupMembers } = useAppContext();
  const [newMember, setNewMember] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = groups.find((g) => g.id === activeGroupId);
  if (!group) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMember.trim();
    if (!trimmed) return;

    if (group.members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setError("This member is already in the group!");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updatedMembers = [...group.members, trimmed];
      await updateGroupMembers(group.id, updatedMembers);
      setNewMember("");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to add member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">👥 Add Group Member</h2>
          <button className="modal-close" onClick={onClose} title="Close">×</button>
        </div>

        <div className="modal-body">
          {/* Group details */}
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
                Current members: {group.members.join(", ")}
              </div>
            </div>
          </div>

          <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-member-input">Member Name</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="new-member-input"
                  type="text"
                  className="add-member-input"
                  placeholder="Enter name (e.g. John)"
                  value={newMember}
                  onChange={(e) => {
                    setNewMember(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "14px",
                    fontFamily: "inherit"
                  }}
                />
                <button
                  type="submit"
                  className="btn-done"
                  disabled={isSubmitting || !newMember.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    whiteSpace: "nowrap"
                  }}
                >
                  <UserPlus size={16} />
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "13px", margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "8px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
                Current Members ({group.members.length})
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {group.members.map((member) => (
                  <div
                    key={member}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      background: "rgba(0,0,0,0.04)",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-main)"
                    }}
                  >
                    <span>{member}</span>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
