"use client";

import { AppProvider, useAppContext } from "../context/AppContext";
import CreateGroup from "../components/CreateGroup";
import Dashboard from "../components/Dashboard";
import AddExpense from "../components/AddExpense";

function AppRenderer() {
  const { activeView, groups, setActiveView } = useAppContext();

  // Force create-group view if no groups exist
  if (groups.length === 0 && activeView !== "create-group") {
    setActiveView("create-group");
    return null; // Will re-render immediately
  }

  switch (activeView) {
    case "create-group":
      return <CreateGroup />;
    case "dashboard":
      return <Dashboard />;
    case "add-expense":
      return <AddExpense />;
    default:
      return <CreateGroup />;
  }
}

export default function Home() {
  return (
    <AppProvider>
      <AppRenderer />
    </AppProvider>
  );
}
