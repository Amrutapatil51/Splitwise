import { Expense, Group, Transaction } from "../types";

export function calculateNetBalances(group: Group, expenses: Expense[]): Record<string, number> {
  const nets: Record<string, number> = {};
  
  group.members.forEach((member) => {
    nets[member] = 0.0;
  });

  expenses.forEach((exp) => {
    const amount = exp.amount;
    const payer = exp.paidBy;

    if (nets[payer] === undefined) nets[payer] = 0.0;

    // Distribute owed amounts
    for (const [member, share] of Object.entries(exp.splits)) {
      if (nets[member] !== undefined) {
        nets[member] -= share;
      }
    }
    
    // Add paid amount to payer
    nets[payer] += amount;
  });

  return nets;
}

export function simplifyDebts(nets: Record<string, number>): Transaction[] {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, net] of Object.entries(nets)) {
    if (net < -0.01) {
      debtors.push({ name, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ name, amount: net });
    }
  }

  // Sort descending to greedily match largest debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settleAmount > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return transactions;
}
