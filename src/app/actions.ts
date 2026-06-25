'use server';

import { neon } from '@neondatabase/serverless';
import { auth, currentUser } from '@clerk/nextjs/server';
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
  let userEmail: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
    const user = await currentUser();
    userEmail = user?.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return { groups: [], error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId) return { groups: [], error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { groups: [], error: 'DB_NOT_CONFIGURED' };

  try {
    // Try the full query including accepted invitations
    const groups = await sql`
      SELECT id, name, avatar, members, upi_ids as "upiIds"
      FROM groups
      WHERE user_id = ${userId}
         OR (
           SELECT EXISTS (
             SELECT 1 FROM invitations 
             WHERE invitations.group_id = groups.id 
               AND invitations.email = ${userEmail} 
               AND invitations.status = 'accepted'
           )
         )
      ORDER BY created_at DESC
    `;
    return { groups };
  } catch (error: any) {
    // If invitations table doesn't exist yet, fall back to owner-only query
    if (error?.message?.includes('relation "invitations" does not exist') || error?.code === '42P01') {
      try {
        const groups = await sql`
          SELECT id, name, avatar, members, upi_ids as "upiIds"
          FROM groups
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;
        return { groups };
      } catch (fallbackError) {
        console.error('Error fetching groups (fallback):', fallbackError);
        return { groups: [], error: 'Failed to fetch groups' };
      }
    }
    console.error('Error fetching groups:', error);
    return { groups: [], error: 'Failed to fetch groups' };
  }
}

export async function createGroup(name: string, avatar: string, memberEmails: string[]) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
    const user = await currentUser();
    userEmail = user?.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId || !userEmail) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    const groupId = 'group_' + Date.now();
    const allMembers = Array.from(new Set([userEmail, ...memberEmails]));
    
    await sql`
      INSERT INTO groups (id, name, avatar, members, upi_ids, user_id)
      VALUES (${groupId}, ${name}, ${avatar}, ${JSON.stringify(allMembers)}, '{}', ${userId})
    `;

    // Write invitations for the other invited members
    for (const email of memberEmails) {
      if (email.trim() && email.trim() !== userEmail) {
        const inviteId = 'invite_' + Math.random().toString(36).substr(2, 9);
        await sql`
          INSERT INTO invitations (id, group_id, email, status)
          VALUES (${inviteId}, ${groupId}, ${email.trim()}, 'pending')
        `;
      }
    }

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
    await sql`
      UPDATE groups
      SET upi_ids = (
        SELECT COALESCE(jsonb_object_agg(key, value), '{}')
        FROM jsonb_each(upi_ids)
        WHERE key = ANY(${members}::text[])
      )
      WHERE id = ${groupId} AND user_id = ${userId}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating group members:', error);
    return { success: false, error: 'Failed to update members' };
  }
}

export async function updateMemberUpiId(
  groupId: string,
  memberName: string,
  upiId: string
): Promise<{ success: boolean; error?: string }> {
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
      SET upi_ids = jsonb_set(COALESCE(upi_ids, '{}'), ${`{${memberName}}`}::text[], ${JSON.stringify(upiId)}::jsonb)
      WHERE id = ${groupId} AND user_id = ${userId}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating UPI ID:', error);
    return { success: false, error: 'Failed to update UPI ID' };
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

export async function inviteMember(groupId: string, email: string) {
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
    const groupResult = await sql`SELECT members FROM groups WHERE id = ${groupId}`;
    if (groupResult.length === 0) return { success: false, error: 'Group not found' };
    const members = Array.isArray(groupResult[0].members) ? groupResult[0].members : JSON.parse(groupResult[0].members);
    if (members.includes(email)) return { success: false, error: 'User is already a member' };

    const inviteResult = await sql`
      SELECT id FROM invitations 
      WHERE group_id = ${groupId} AND email = ${email} AND status = 'pending'
    `;
    if (inviteResult.length > 0) return { success: false, error: 'Invitation already pending' };

    const inviteId = 'invite_' + Math.random().toString(36).substr(2, 9);
    await sql`
      INSERT INTO invitations (id, group_id, email, status)
      VALUES (${inviteId}, ${groupId}, ${email}, 'pending')
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error inviting member:', error);
    return { success: false, error: 'Failed to invite member' };
  }
}

export async function getPendingInvitations() {
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
    const user = await currentUser();
    userEmail = user?.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return { invitations: [], error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId || !userEmail) return { invitations: [], error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { invitations: [], error: 'DB_NOT_CONFIGURED' };

  try {
    const invitations = await sql`
      SELECT i.id, i.group_id as "groupId", i.email, i.status, i.created_at as "createdAt",
             g.name as "groupName", g.avatar as "groupAvatar"
      FROM invitations i
      JOIN groups g ON i.group_id = g.id
      WHERE i.email = ${userEmail} AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    return { invitations };
  } catch (error: any) {
    // Gracefully handle missing table — just return empty, no UI error
    if (error?.message?.includes('relation "invitations" does not exist') || error?.code === '42P01') {
      return { invitations: [] };
    }
    console.error('Error fetching pending invitations:', error);
    return { invitations: [], error: 'Failed to fetch invitations' };
  }
}

export async function respondToInvitation(inviteId: string, accept: boolean) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
    const user = await currentUser();
    userEmail = user?.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return { success: false, error: 'DB_NOT_CONFIGURED' };
  }
  if (!userId || !userEmail) return { success: false, error: 'Not authenticated' };

  const sql = getSql();
  if (!sql) return { success: false, error: 'DB_NOT_CONFIGURED' };

  try {
    const inviteResult = await sql`
      SELECT group_id, email FROM invitations 
      WHERE id = ${inviteId} AND email = ${userEmail} AND status = 'pending'
    `;
    if (inviteResult.length === 0) return { success: false, error: 'Invitation not found' };
    const { group_id: groupId } = inviteResult[0];

    const status = accept ? 'accepted' : 'declined';

    await sql`
      UPDATE invitations 
      SET status = ${status} 
      WHERE id = ${inviteId}
    `;

    if (accept) {
      const groupResult = await sql`SELECT members FROM groups WHERE id = ${groupId}`;
      if (groupResult.length > 0) {
        const members = Array.isArray(groupResult[0].members) ? groupResult[0].members : JSON.parse(groupResult[0].members);
        const updatedMembers = Array.from(new Set([...members, userEmail]));
        
        await sql`
          UPDATE groups 
          SET members = ${JSON.stringify(updatedMembers)} 
          WHERE id = ${groupId}
        `;
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error responding to invitation:', error);
    return { success: false, error: 'Failed to respond to invitation' };
  }
}
