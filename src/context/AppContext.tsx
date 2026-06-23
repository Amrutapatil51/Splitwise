"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Group, Expense, ViewType } from "../types";

interface AppContextProps {
  groups: Group[];
  expenses: Expense[];
  activeGroupId: string | null;
  activeView: ViewType;
  
  addGroup: (group: Group) => void;
  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  recordRepayment: (groupId: string, debtor: string, creditor: string, amount: number) => void;
  
  setActiveGroupId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("create-group");
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from local storage on init
  useEffect(() => {
    const savedState = localStorage.getItem("splitwisely_state");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGroups(parsed.groups || []);
        setExpenses(parsed.expenses || []);
        
        if (parsed.groups && parsed.groups.length > 0) {
          setActiveGroupId(parsed.groups[0].id);
          setActiveView("dashboard");
        }
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Sync to local storage when state changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("splitwisely_state", JSON.stringify({ groups, expenses }));
    }
  }, [groups, expenses, isInitialized]);

  const addGroup = (group: Group) => {
    setGroups((prev) => [...prev, group]);
    setActiveGroupId(group.id);
    setActiveView("dashboard");
  };

  const addExpense = (expense: Expense) => {
    setExpenses((prev) => [...prev, expense]);
    setActiveGroupId(expense.groupId);
    setActiveView("dashboard");
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const recordRepayment = (groupId: string, debtor: string, creditor: string, amount: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const splits: Record<string, number> = {};
    group.members.forEach((m) => (splits[m] = 0));
    // The debtor pays the creditor, so in the expense record:
    // Payer: debtor
    // Split owed: creditor owes the amount to the debtor to balance it.
    splits[creditor] = amount;

    const repayment: Expense = {
      id: "exp_" + Date.now(),
      groupId,
      description: `Settled: ${debtor} paid ${creditor}`,
      amount,
      paidBy: debtor,
      splitType: "custom",
      splits,
      date: new Date().toISOString(),
    };

    setExpenses((prev) => [...prev, repayment]);
  };

  if (!isInitialized) {
    return null; // prevent hydration mismatch
  }

  return (
    <AppContext.Provider
      value={{
        groups,
        expenses,
        activeGroupId,
        activeView,
        addGroup,
        addExpense,
        deleteExpense,
        recordRepayment,
        setActiveGroupId,
        setActiveView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
