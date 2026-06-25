"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Split } from "../types";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AddExpense() {
  const { groups, activeGroupId, addExpense, setActiveView } = useAppContext();
  
  const group = groups.find((g) => g.id === activeGroupId);

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [paidBy, setPaidBy] = useState("You");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!group) return null;

  const handleCustomSplitChange = (member: string, val: string) => {
    setCustomSplits({ ...customSplits, [member]: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    
    if (!description.trim() || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid description and amount.");
      return;
    }

    const finalSplits: Split = {};

    if (splitType === "equal") {
      const share = amount / group.members.length;
      group.members.forEach((m) => {
        finalSplits[m] = share;
      });
    } else {
      let totalCustom = 0;
      for (const m of group.members) {
        const val = parseFloat(customSplits[m] || "0");
        finalSplits[m] = isNaN(val) ? 0 : val;
        totalCustom += finalSplits[m];
      }

      if (Math.abs(totalCustom - amount) > 0.01) {
        alert(`Custom splits total ₹${totalCustom.toFixed(2)}, but the expense is ₹${amount.toFixed(2)}. Please correct the amounts.`);
        return;
      }
    }

    setIsSubmitting(true);
    await addExpense({
      id: "exp_" + Date.now(),
      groupId: group.id,
      description: description.trim(),
      amount,
      paidBy,
      splitType,
      splits: finalSplits,
      date: new Date().toISOString(),
    });
    setIsSubmitting(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          <button
            onClick={() => setActiveView('dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '8px', color: 'var(--text-main)' }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="logo-icon"></div>
          <span className="logo-text">Add Expense</span>
        </div>
      </header>

      <main className="app-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
        <div className="add-expense-container" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="page-title" style={{ marginBottom: '24px' }}>Add an expense</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Description</label>
              <input 
                type="text" 
                className="group-name-input" 
                placeholder="e.g. Dinner at Mario's" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)', fontSize: '16px' }}>₹</span>
                <input 
                  type="number" 
                  className="group-name-input" 
                  style={{ paddingLeft: '32px' }}
                  placeholder="0.00" 
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Paid by</label>
              <select 
                className="group-name-input"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {group.members.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Split type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className={`btn-done ${splitType === 'equal' ? '' : 'inactive'}`}
                  style={{ opacity: splitType === 'equal' ? 1 : 0.5 }}
                  onClick={() => setSplitType('equal')}
                >
                  Equally
                </button>
                <button 
                  type="button" 
                  className={`btn-done ${splitType === 'custom' ? '' : 'inactive'}`}
                  style={{ opacity: splitType === 'custom' ? 1 : 0.5 }}
                  onClick={() => setSplitType('custom')}
                >
                  Unequally
                </button>
              </div>
            </div>

            {splitType === "custom" && (
              <div className="sub-panel" style={{ display: 'block', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Enter exact amounts</h4>
                {group.members.map((m) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{m}</span>
                    <input 
                      type="number" 
                      className="add-member-input" 
                      style={{ width: '100px', textAlign: 'right' }}
                      placeholder="0.00" 
                      step="0.01"
                      min="0"
                      value={customSplits[m] || ""}
                      onChange={(e) => handleCustomSplitChange(m, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="btn-done" style={{ width: '100%', marginTop: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
