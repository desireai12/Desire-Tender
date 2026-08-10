import { UserProfile, Project, PermissionType, UserStatus, DepartmentRole } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// Initial seed accounts (Only used as fallback if local storage is completely uninitialized and database is offline)
const INITIAL_USERS: UserProfile[] = [];

const INITIAL_PROJECTS: Project[] = [];

// --- STORAGE HELPER FUNCTIONS ---

export function getStoredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('DESIRE_SYSTEM_USERS');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveUser(user: UserProfile): UserProfile[] {
  const users = getStoredUsers();
  const existingIdx = users.findIndex(u => u.employee_id === user.employee_id || u.id === user.id);
  
  let updatedUsers: UserProfile[];
  if (existingIdx >= 0) {
    updatedUsers = users.map((u, idx) => idx === existingIdx ? { ...u, ...user } : u);
  } else {
    updatedUsers = [user, ...users];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('DESIRE_SYSTEM_USERS', JSON.stringify(updatedUsers));
  }

  // Supabase Sync
  if (isSupabaseConfigured && supabase) {
    Promise.resolve(supabase.from('users').upsert({
      employee_id: user.employee_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      password_hash: user.password || 'desire@2026',
      role: user.role,
      department: user.department,
      status: user.status,
      permissions: user.permissions,
      assigned_projects: user.assigned_projects
    })).catch(() => null);
  }

  return updatedUsers;
}

export function updateUserStatus(userId: string, status: UserStatus, department?: DepartmentRole): UserProfile[] {
  const users = getStoredUsers();
  let targetEmp = userId;
  const updatedUsers = users.map(u => {
    if (u.id === userId || u.employee_id === userId) {
      targetEmp = u.employee_id;
      const perms: PermissionType[] = status === 'Active'
        ? ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision']
        : ['eligibility'];
      return { 
        ...u, 
        status, 
        department: department || u.department,
        permissions: u.permissions.length > 1 ? u.permissions : perms
      };
    }
    return u;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('DESIRE_SYSTEM_USERS', JSON.stringify(updatedUsers));
  }

  // Supabase Live Sync
  if (isSupabaseConfigured && supabase) {
    Promise.resolve(
      supabase.from('users').update({ status, department }).eq('employee_id', targetEmp)
    ).catch(() => null);
  }

  return updatedUsers;
}

export function updateUserPermissions(userId: string, permissions: PermissionType[], department?: DepartmentRole): UserProfile[] {
  const users = getStoredUsers();
  let targetEmp = userId;
  const updatedUsers = users.map(u => {
    if (u.id === userId || u.employee_id === userId) {
      targetEmp = u.employee_id;
      return { 
        ...u, 
        permissions,
        department: department || u.department
      };
    }
    return u;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('DESIRE_SYSTEM_USERS', JSON.stringify(updatedUsers));
  }

  // Supabase Live Sync
  if (isSupabaseConfigured && supabase) {
    Promise.resolve(
      supabase.from('users').update({ permissions, department }).eq('employee_id', targetEmp)
    ).catch(() => null);
  }

  return updatedUsers;
}

// --- ADMIN PASSWORD MANAGEMENT ---

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return 'AquaAdmin@2026#DES';
  return localStorage.getItem('DESIRE_ADMIN_PWD') || 'AquaAdmin@2026#DES';
}

export function getAdminMustChangePassword(): boolean {
  if (typeof window === 'undefined') return true;
  const flag = localStorage.getItem('DESIRE_ADMIN_MUST_CHANGE');
  if (flag === 'false') return false;
  return true;
}

export function saveAdminPassword(newPassword: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('DESIRE_ADMIN_PWD', newPassword);
    localStorage.setItem('DESIRE_ADMIN_MUST_CHANGE', 'false');
  }

  if (isSupabaseConfigured && supabase) {
    Promise.resolve(
      supabase.from('credentials').upsert({
        provider: 'ADMIN_ACCOUNT',
        key_type: 'Admin Password',
        encrypted_key: newPassword,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      })
    ).catch(() => null);
  }
}

// --- PROJECTS STORAGE ---

export function getStoredProjects(): Project[] {
  if (typeof window === 'undefined') return INITIAL_PROJECTS;
  try {
    const raw = localStorage.getItem('DESIRE_SYSTEM_PROJECTS');
    if (!raw) {
      localStorage.setItem('DESIRE_SYSTEM_PROJECTS', JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PROJECTS;
  }
}

export function saveProject(project: Project): Project[] {
  const projects = getStoredProjects();
  const updated = [project, ...projects];
  if (typeof window !== 'undefined') {
    localStorage.setItem('DESIRE_SYSTEM_PROJECTS', JSON.stringify(updated));
  }
  return updated;
}
