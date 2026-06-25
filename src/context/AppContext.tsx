"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useTransition } from "react";
import { Group, Expense, ViewType } from "../types";
import * as Actions from "../app/actions";

interface AppContextProps {
  groups: Group[];
  expenses: Expense[];
  activeGroupId: string | null;
  activeView: ViewType;
  isLoading: boolean;
  dbConfigured: boolean;

  addGroup: (group: Group) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  updateGroupMembers: (groupId: string, newMembers: string[]) => Promise<void>;
  recordRepayment: (groupId: string, debtor: string, creditor: string, amount: number) => Promise<void>;
  refreshExpenses: (groupId: string) => Promise<void>;

  setActiveGroupId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// ─── localStorage helpers (fallback when DB not configured) ──────────────────
const LS_KEY = "splitwisely_state";

function loadFromLS(): { groups: Group[]; expenses: Expense[] } {
  if (typeof window === "undefined") return { groups: [], expenses: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { groups: [], expenses: [] };
}

function saveToLS(groups: Group[], expenses: Expense[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify({ groups, expenses }));
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("create-group");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [, startTransition] = useTransition();

  // ── Bootstrap: load groups from DB or localStorage ─────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const result = await Actions.getGroups();

        if (result.error === "DB_NOT_CONFIGURED") {
          // Fall back to localStorage
          setDbConfigured(false);
          const ls = loadFromLS();
          setGroups(ls.groups);
          setExpenses(ls.expenses);
          if (ls.groups.length > 0) {
            setActiveGroupId(ls.groups[0].id);
            setActiveView("dashboard");
          }
        } else {
          setDbConfigured(true);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: Group[] = (result.groups as any[]).map((g: any) => ({
            id: g.id,
            name: g.name,
            avatar: g.avatar,
            members: Array.isArray(g.members) ? g.members : JSON.parse(g.members),
          }));
          setGroups(mapped);
          if (mapped.length > 0) {
            setActiveGroupId(mapped[0].id);
            setActiveView("dashboard");
          }
        }
      } catch (err) {
        console.error("Init error, falling back to localStorage:", err);
        setDbConfigured(false);
        const ls = loadFromLS();
        setGroups(ls.groups);
        setExpenses(ls.expenses);
        if (ls.groups.length > 0) {
          setActiveGroupId(ls.groups[0].id);
          setActiveView("dashboard");
        }
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ── Sync localStorage when in fallback mode ──────────────────────────────
  useEffect(() => {
    if (isInitialized && !dbConfigured) {
      saveToLS(groups, expenses);
    }
  }, [groups, expenses, isInitialized, dbConfigured]);

  // ── Refresh expenses for active group from DB ────────────────────────────
  const refreshExpenses = useCallback(async (groupId: string) => {
    if (!dbConfigured) return;
    try {
      const result = await Actions.getExpenses(groupId);
      if (!result.error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Expense[] = (result.expenses as any[]).map((e: any) => ({
          id: e.id,
          groupId: groupId,
          description: e.description,
          amount: parseFloat(e.amount),
          paidBy: e.paid_by,
          splitType: e.split_type as "equal" | "custom",
          splits: typeof e.splits === "object" ? e.splits : JSON.parse(e.splits),
          date: e.date,
        }));
        setExpenses((prev) => {
          const otherGroupExpenses = prev.filter((e) => e.groupId !== groupId);
          return [...otherGroupExpenses, ...mapped];
        });
      }
    } catch (err) {
      console.error("Error refreshing expenses:", err);
    }
  }, [dbConfigured]);

  // Auto-load expenses when active group changes
  useEffect(() => {
    if (activeGroupId && dbConfigured && isInitialized) {
      refreshExpenses(activeGroupId);
    }
  }, [activeGroupId, dbConfigured, isInitialized, refreshExpenses]);

  // ── CRUD Methods ──────────────────────────────────────────────────────────

  const addGroup = useCallback(async (group: Group) => {
    if (dbConfigured) {
      const result = await Actions.createGroup(group.name, group.avatar, group.members);
      if (!result.success) {
        console.error("Failed to save group to DB:", result.error);
        // Still add locally so the UI doesn't break
      }
      // Use the server-assigned ID if available
      const finalGroup = result.groupId ? { ...group, id: result.groupId } : group;
      setGroups((prev) => [finalGroup, ...prev]);
      setActiveGroupId(finalGroup.id);
    } else {
      setGroups((prev) => [group, ...prev]);
      setActiveGroupId(group.id);
    }
    setActiveView("dashboard");
  }, [dbConfigured]);

  const addExpense = useCallback(async (expense: Expense) => {
    if (dbConfigured) {
      const result = await Actions.addExpense({
        groupId: expense.groupId,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        splitType: expense.splitType,
        splits: expense.splits,
      });
      if (!result.success) {
        console.error("Failed to save expense to DB:", result.error);
      }
      const finalExpense = result.expenseId ? { ...expense, id: result.expenseId } : expense;
      setExpenses((prev) => [finalExpense, ...prev]);
    } else {
      setExpenses((prev) => [expense, ...prev]);
    }
    setActiveGroupId(expense.groupId);
    setActiveView("dashboard");
  }, [dbConfigured]);

  const deleteExpense = useCallback(async (id: string) => {
    if (dbConfigured) {
      startTransition(async () => {
        await Actions.deleteExpense(id);
      });
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, [dbConfigured]);

  const deleteGroup = useCallback(async (id: string) => {
    if (dbConfigured) {
      startTransition(async () => {
        await Actions.deleteGroup(id);
      });
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setExpenses((prev) => prev.filter((e) => e.groupId !== id));
    setActiveGroupId(null);
    setActiveView("create-group");
  }, [dbConfigured]);

  const recordRepayment = useCallback(async (
    groupId: string,
    debtor: string,
    creditor: string,
    amount: number
  ) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const splits: Record<string, number> = {};
    group.members.forEach((m) => (splits[m] = 0));
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

    await addExpense(repayment);
  }, [groups, addExpense]);

  const updateGroupMembers = useCallback(async (groupId: string, newMembers: string[]) => {
    if (dbConfigured) {
      const result = await Actions.updateGroupMembers(groupId, newMembers);
      if (!result.success) {
        console.error("Failed to update group members in DB:", result.error);
      }
    }
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: newMembers } : g))
    );
  }, [dbConfigured]);

  if (!isInitialized) return null;

  return (
    <AppContext.Provider
      value={{
        groups,
        expenses,
        activeGroupId,
        activeView,
        isLoading,
        dbConfigured,
        addGroup,
        addExpense,
        deleteExpense,
        deleteGroup,
        updateGroupMembers,
        recordRepayment,
        refreshExpenses,
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
