"use client";

import { useState } from "react";
import { Camera, ChevronRight, Plus, ArrowLeft } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const AVATAR_OPTIONS = [
  "🏠", "✈️", "🍔", "🍻", "🚗", "🎮", 
  "🍿", "⛺", "🍕", "💡", "🛍️", "🏋️"
];

export default function CreateGroup() {
  const { addGroup, groups, setActiveView } = useAppContext();
  
  const [groupName, setGroupName] = useState("");
  
  // State for members
  const [invitedMembers, setInvitedMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  
  // State for avatar
  const [selectedAvatar, setSelectedAvatar] = useState("🏠");
  const [showAvatarDrawer, setShowAvatarDrawer] = useState(false);

  const handleAddMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;
    
    if (invitedMembers.includes(name)) {
      alert("This member is already added!");
      return;
    }
    
    setInvitedMembers([...invitedMembers, name]);
    setNewMemberName("");
  };

  const handleRemoveMember = (nameToRemove: string) => {
    setInvitedMembers(invitedMembers.filter((name) => name !== nameToRemove));
  };

  const handleDone = () => {
    const allMembers = ["You", ...invitedMembers];
    addGroup({
      id: "group_" + Date.now(),
      name: groupName.trim(),
      avatar: selectedAvatar,
      members: allMembers,
    });
  };

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          {groups.length > 0 && (
            <button 
              onClick={() => setActiveView("dashboard")} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '8px', color: 'var(--text-main)' }}
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="logo-icon"></div>
          <span className="logo-text">Expense Share</span>
        </div>
        <div className="header-actions">
          <button 
            className="btn-done" 
            disabled={!groupName.trim()}
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </header>

      <main className="app-content">
        <section className="view-panel active">
          <div className="create-group-container">
            <h1 className="page-title">Create a group</h1>
            <p className="page-subtitle">Split expenses with friends, roommates, and more.</p>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" htmlFor="input-group-name">Group name</label>
              <input 
                type="text" 
                id="input-group-name" 
                className="group-name-input" 
                placeholder="Enter group name" 
                autoComplete="off"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Invite Members Row */}
            <div 
              className="interactive-row" 
              onClick={() => setShowInviteDrawer(!showInviteDrawer)}
            >
              <div className="row-left">
                <div className="icon-box">
                  <Plus size={18} />
                </div>
                <span className="row-title">Invite members</span>
              </div>
              <div className="row-right">
                <span style={{ fontSize: '13px', marginRight: '8px', fontWeight: 500 }}>
                  {invitedMembers.length > 0 && `${invitedMembers.length} member${invitedMembers.length > 1 ? 's' : ''}`}
                </span>
                <ChevronRight size={18} strokeWidth={2.5} />
              </div>
            </div>

            {/* Invite Members Expandable Drawer */}
            {showInviteDrawer && (
              <div className="sub-panel" style={{ display: 'block' }}>
                <div className="member-chip-container">
                  {invitedMembers.map((member) => (
                    <div key={member} className="member-chip">
                      <span>{member}</span>
                      <button 
                        type="button" 
                        className="member-chip-remove" 
                        onClick={() => handleRemoveMember(member)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                
                <form className="add-member-form" onSubmit={handleAddMember}>
                  <input 
                    type="text" 
                    className="add-member-input" 
                    placeholder="Friend's name (e.g. Alice)" 
                    autoComplete="off"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <button type="submit" className="btn-add-member">Add</button>
                </form>
              </div>
            )}

            {/* Group Avatar Row */}
            <div 
              className="interactive-row" 
              onClick={() => setShowAvatarDrawer(!showAvatarDrawer)}
            >
              <div className="row-left">
                <div className="icon-box">
                  {selectedAvatar ? (
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{selectedAvatar}</span>
                  ) : (
                    <Camera size={18} />
                  )}
                </div>
                <span className="row-title">Group avatar</span>
              </div>
              <div className="row-right">
                <ChevronRight size={18} strokeWidth={2.5} />
              </div>
            </div>

            {/* Group Avatar Selection Panel */}
            {showAvatarDrawer && (
              <div className="sub-panel" style={{ display: 'block' }}>
                <div className="avatar-grid">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <div 
                      key={emoji}
                      className={`avatar-option ${selectedAvatar === emoji ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedAvatar(emoji);
                        setShowAvatarDrawer(false);
                      }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="info-text">You can add up to 100 members</p>
          </div>
        </section>
      </main>
    </>
  );
}
