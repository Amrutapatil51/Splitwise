'use server';

import { neon } from '@neondatabase/serverless';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Helper to gracefully fail if the environment variable isn't set yet
const getSql = () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
    return null; // Database not configured yet
  }
  return neon(process.env.DATABASE_URL);
};

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function getGroups() {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { groups: [], error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { groups: [], error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { groups: [], error: 'DB_NOT_CONFIGURED' };

  try {
    const groups = await sql`
      SELECT id, name, avatar, members
      FROM groups
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return { groups };
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { groups: [], error: 'Failed to fetch groups' };
  }
}

export async function createGroup(name: string, avatar: string, members: string[]) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    const groupId = 'group_' + Date.now();
    await sql`
      INSERT INTO groups (id, name, avatar, members, user_id)
      VALUES (${groupId}, ${name}, ${avatar}, ${JSON.stringify(members)}, ${userId})
    `;
    revalidatePath('/');
    return { success: true, groupId };
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, error: 'Failed to create group' };
  }
}

export async function updateGroupMembers(groupId: string, members: string[]) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    await sql`
      UPDATE groups
      SET members = ${JSON.stringify(members)}
      WHERE id = ${groupId} AND user_id = ${userId}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating group members:', error);
    return { success: false, error: 'Failed to update members' };
  }
}


export async function deleteGroup(groupId: string) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    await sql`DELETE FROM expenses WHERE group_id = ${groupId}`;
    await sql`DELETE FROM groups WHERE id = ${groupId} AND user_id = ${userId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: 'Failed to delete group' };
  }
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(groupId: string) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { expenses: [], error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { expenses: [], error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { expenses: [], error: 'DB_NOT_CONFIGURED' };

  try {
    const expenses = await sql`
      SELECT id, amount, description, paid_by, split_type, splits, created_at as date
      FROM expenses
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;
    return { expenses };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return { expenses: [], error: 'Failed to fetch expenses' };
  }
}

export async function addExpense(data: {
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: 'equal' | 'custom';
  splits: Record<string, number>;
}) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    const expenseId = 'exp_' + Date.now();
    await sql`
      INSERT INTO expenses (id, group_id, description, amount, paid_by, split_type, splits)
      VALUES (
        ${expenseId},
        ${data.groupId},
        ${data.description},
        ${data.amount},
        ${data.paidBy},
        ${data.splitType},
        ${JSON.stringify(data.splits)}
      )
    `;
    revalidatePath('/');
    return { success: true, expenseId };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false, error: 'Failed to add expense' };
  }
}

export async function deleteExpense(expenseId: string) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    await sql`DELETE FROM expenses WHERE id = ${expenseId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}

export async function recordRepayment(data: {
  groupId: string;
  debtor: string;
  creditor: string;
  amount: number;
  members: string[];
}) {
  const splits: Record<string, number> = {};
  data.members.forEach((m) => (splits[m] = 0));
  splits[data.creditor] = data.amount;

  return addExpense({
    groupId: data.groupId,
    description: `Settled: ${data.debtor} paid ${data.creditor}`,
    amount: data.amount,
    paidBy: data.debtor,
    splitType: 'custom',
    splits,
  });
}
