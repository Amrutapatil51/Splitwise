"use client";

import { useAppContext } from "../context/AppContext";

export default function NavigationTabs() {
  const { activeView, setActiveView } = useAppContext();

  return (
    <div className="nav-tabs">
      <button 
        className={`nav-tab ${activeView === "dashboard" ? "active" : ""}`}
        onClick={() => setActiveView("dashboard")}
      >
        Dashboard
      </button>
      <button 
        className={`nav-tab ${activeView === "add-expense" ? "active" : ""}`}
        onClick={() => setActiveView("add-expense")}
      >
        Add Expense
      </button>
    </div>
  );
}
