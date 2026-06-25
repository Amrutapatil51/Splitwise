export interface Group {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  upiIds?: Record<string, string>;
}

export interface Split {
  [memberName: string]: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: "equal" | "custom";
  splits: Split;
  date: string;
}

export type ViewType = "create-group" | "dashboard" | "add-expense";

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  groupAvatar: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}
