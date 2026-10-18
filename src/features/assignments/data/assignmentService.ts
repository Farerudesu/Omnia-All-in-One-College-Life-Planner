import type { Assignment } from '@/types';
import {
  assignments,
  setAssignments,
  genId,
  notify,
  getClient,
  ownedRow,
  mutateTable,
  assignmentRow,
  refreshTable,
  activeUserId,
} from '@/lib/dataStore';

// ─── Assignments ───
export function getAssignments(): Assignment[] {
  return assignments;
}

export async function addAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment> {
  const newAssignment = { ...assignment, id: genId() };
  const { error } = await getClient().from('assignments').insert(ownedRow(assignmentRow(assignment)));
  if (error) throw error;
  await refreshTable('assignments');
  return newAssignment;
}

export function updateAssignment(id: string, data: Partial<Assignment>): void {
  setAssignments(
    assignments.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, ...data };
      if ('courseId' in data) {
        if (data.courseId) {
          if (!data.category || data.category === 'personal' || data.category === 'other') {
            updated.category = 'classes';
          }
        } else {
          if (!data.category || data.category === 'classes') {
            updated.category = 'personal';
          }
        }
      }
      return updated;
    })
  );
  notify();
  void mutateTable('assignments', () => getClient().from('assignments').update(assignmentRow(data)).eq('id', id).eq('user_id', activeUserId));
}

export async function deleteAssignment(id: string): Promise<Assignment | null> {
  const existing = assignments.find((a) => a.id === id);
  if (!existing) return null;

  setAssignments(assignments.filter((a) => a.id !== id));
  unpinAssignment(id);
  notify();

  try {
    const res = await mutateTable('assignments', () =>
      getClient().from('assignments').delete().eq('id', id).eq('user_id', activeUserId)
    );
    if (!res.success) {
      setAssignments([...assignments, existing]);
      notify();
      throw new Error(res.error || 'Gagal menghapus tugas');
    }
    return existing;
  } catch (err) {
    if (!assignments.some((a) => a.id === id)) {
      setAssignments([...assignments, existing]);
      notify();
    }
    throw err;
  }
}

export async function restoreAssignment(assignment: Assignment): Promise<Assignment> {
  if (!assignments.some((a) => a.id === assignment.id)) {
    setAssignments([...assignments, assignment]);
    notify();
  }
  const { error } = await getClient().from('assignments').insert(ownedRow(assignmentRow(assignment)));
  if (error) {
    setAssignments(assignments.filter((a) => a.id !== assignment.id));
    notify();
    throw error;
  }
  await refreshTable('assignments');
  return assignment;
}

// ─── Pinned Items Management ───
let pinnedAssignmentIds: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_pinned_assignments');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

let dismissedAutoPins: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_dismissed_auto_pins');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

export function getPinnedAssignmentIds(): string[] {
  return pinnedAssignmentIds;
}

export function isAssignmentPinned(id: string): boolean {
  return pinnedAssignmentIds.includes(id);
}

export function pinAssignment(id: string): void {
  if (!pinnedAssignmentIds.includes(id)) {
    pinnedAssignmentIds = [...pinnedAssignmentIds, id];
    localStorage.setItem('omnia_pinned_assignments', JSON.stringify(pinnedAssignmentIds));
    dismissedAutoPins = dismissedAutoPins.filter((dId) => dId !== id);
    localStorage.setItem('omnia_dismissed_auto_pins', JSON.stringify(dismissedAutoPins));
    notify();
  }
}

export function unpinAssignment(id: string): void {
  pinnedAssignmentIds = pinnedAssignmentIds.filter((item) => item !== id);
  localStorage.setItem('omnia_pinned_assignments', JSON.stringify(pinnedAssignmentIds));
  if (!dismissedAutoPins.includes(id)) {
    dismissedAutoPins = [...dismissedAutoPins, id];
    localStorage.setItem('omnia_dismissed_auto_pins', JSON.stringify(dismissedAutoPins));
  }
  notify();
}

export function togglePinAssignment(id: string): boolean {
  if (isAssignmentPinned(id)) {
    unpinAssignment(id);
    return false;
  } else {
    pinAssignment(id);
    return true;
  }
}

export function getDismissedAutoPins(): string[] {
  return dismissedAutoPins;
}

export function resetDismissedAutoPins(): void {
  dismissedAutoPins = [];
  localStorage.removeItem('omnia_dismissed_auto_pins');
  notify();
}

export function getPinnedAssignments(): { assignment: Assignment; isManual: boolean }[] {
  const manualIds = pinnedAssignmentIds;
  const activeAssignments = assignments.filter((a) => a.status !== 'done');

  if (manualIds.length > 0) {
    const manualList = manualIds
      .map((id) => activeAssignments.find((a) => a.id === id))
      .filter((a): a is Assignment => !!a)
      .map((a) => ({ assignment: a, isManual: true }));
    if (manualList.length > 0) return manualList;
  }

  const dismissed = dismissedAutoPins;
  const sorted = [...activeAssignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const autoCandidate = sorted.find((a) => !dismissed.includes(a.id));

  if (autoCandidate) {
    return [{ assignment: autoCandidate, isManual: false }];
  }
  return [];
}
