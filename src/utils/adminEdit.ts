export type AdminEdit = {
  userId: string;
  password: string;
  updatedAt: number;
};

const STORAGE_KEY = 'cow_admin_edit_v1';

const DEFAULT_EDIT: AdminEdit = {
  userId: 'admin',
  password: 'admin1234',
  updatedAt: Date.now(),
};

export function loadAdminEdit(): AdminEdit {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EDIT;
    const parsed = JSON.parse(raw) as Partial<AdminEdit>;
    if (!parsed.userId || !parsed.password) return DEFAULT_EDIT;
    return {
      userId: parsed.userId,
      password: parsed.password,
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return DEFAULT_EDIT;
  }
}

export function saveAdminEdit(next: AdminEdit) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function verifyAdminEdit(userId: string, password: string) {
  const stored = loadAdminEdit();
  return stored.userId === userId && stored.password === password;
}
