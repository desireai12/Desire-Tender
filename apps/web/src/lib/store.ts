import { UserProfile, Project, PermissionType, UserStatus, DepartmentRole } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// Default Seed Users (Ensures users never vanish and no domain shows 0 users)
export const DEFAULT_SEED_USERS: UserProfile[] = [
  {
    id: 'usr-101',
    employee_id: 'EMP001',
    full_name: 'Ankit Purohit',
    email: 'ankit.purohit@desireenergy.com',
    phone: '9829012345',
    role: 'Administrator',
    department: 'Admin',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
    registered_at: '2026-08-01 09:00:00',
    last_login: '2026-08-08 10:15:00'
  },
  {
    id: 'usr-102',
    employee_id: 'EMP002',
    full_name: 'Deepak Khandelwal',
    email: 'deepak.khandelwal@desireenergy.com',
    phone: '9829023456',
    role: 'Sr Estimator',
    department: 'Estimation Team',
    status: 'Active',
    permissions: ['eligibility', 'cost_estimation'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC'],
    registered_at: '2026-08-02 11:30:00',
    last_login: '2026-08-08 09:45:00'
  },
  {
    id: 'usr-103',
    employee_id: 'EMP003',
    full_name: 'Suresh Sharma',
    email: 'suresh.sharma@desireenergy.com',
    phone: '9829034567',
    role: 'Chief Engineer',
    department: 'Engineering',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis'],
    assigned_projects: ['SOLAR', 'RHDS', 'STP'],
    registered_at: '2026-08-03 14:00:00',
    last_login: '2026-08-07 16:20:00'
  },
  {
    id: 'usr-104',
    employee_id: 'EMP004',
    full_name: 'Vikas Verma',
    email: 'vikas.verma@desireenergy.com',
    phone: '9829045678',
    role: 'Tender Head',
    department: 'Tender Team',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
    registered_at: '2026-08-04 10:10:00',
    last_login: '2026-08-08 08:30:00'
  }
];

export const DEFAULT_SEED_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Jal Jeevan Mission (JJM) Rural Water Supply',
    type: 'RHDS',
    client: 'PHED Rajasthan',
    description: 'Rural water supply distribution schemes across 100,000+ villages under Jal Jeevan Mission.',
    ai_instructions: 'Focus on HDPE/DI pipeline specs (PN-10/16), OHSR reservoir capacity, and 10-year O&M compliance.',
    knowledge_sources: ['Company Profile', 'PHED Certificates', 'Water Historical BOQs', 'SOPs'],
    status: 'Active',
    created_at: '2026-08-01 10:00:00'
  },
  {
    id: 'proj-2',
    name: 'PM-Kusum Component-B Solar Pump Scheme',
    type: 'KUSUM',
    client: 'REDA / RRECL',
    description: 'Implementation of off-grid solar water pumping systems for agricultural electrification.',
    ai_instructions: 'Verify REDA empanelment, Sunaquator RMS 4G telemetry controllers, and solar pump specs.',
    knowledge_sources: ['Company Profile', 'Solar Certificates', 'REDA Guidelines', 'Solar Historical BOQs'],
    status: 'Active',
    created_at: '2026-08-02 11:30:00'
  },
  {
    id: 'proj-3',
    name: 'Solar Utility Scale Photovoltaic EPC Projects',
    type: 'SOLAR',
    client: 'NTPC / SECI',
    description: 'Utility scale ground-mounted solar power plants and grid interconnection infrastructure.',
    ai_instructions: 'Verify PV module wattages, inverter efficiency (>98.5%), and Class-A electrical license.',
    knowledge_sources: ['Company Profile', 'Solar Certificates', 'Solar Historical BOQs', 'Competitor Data'],
    status: 'Active',
    created_at: '2026-08-03 14:15:00'
  }
];

// --- STORAGE HELPER FUNCTIONS ---

export function getStoredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_SEED_USERS;
  try {
    const raw = localStorage.getItem('DESIRE_SYSTEM_USERS');
    const userMap = new Map<string, UserProfile>();
    DEFAULT_SEED_USERS.forEach(u => userMap.set(u.employee_id, u));
    
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(u => userMap.set(u.employee_id, u));
      }
    } else {
      localStorage.setItem('DESIRE_SYSTEM_USERS', JSON.stringify(DEFAULT_SEED_USERS));
    }
    return Array.from(userMap.values());
  } catch (e) {
    return DEFAULT_SEED_USERS;
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

  // Supabase Sync — Match on employee_id to prevent UUID primary key type errors
  if (isSupabaseConfigured && supabase) {
    const payload: any = {
      employee_id: user.employee_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role || 'User',
      department: user.department || 'Tender Team',
      status: user.status || 'Pending',
      permissions: user.permissions || ['eligibility'],
      assigned_projects: user.assigned_projects || ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP']
    };
    if (user.password && user.password.trim() !== '') {
      payload.password_hash = user.password.trim();
    }
    Promise.resolve(supabase.from('users').upsert(payload, { onConflict: 'employee_id' })).catch(() => null);
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
  if (typeof window === 'undefined') return 'admin@1234';
  return localStorage.getItem('DESIRE_ADMIN_PWD') || 'admin@1234';
}

export function getAdminMustChangePassword(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = localStorage.getItem('DESIRE_ADMIN_MUST_CHANGE');
  if (flag === 'true') return true;
  return false;
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
  if (typeof window === 'undefined') return DEFAULT_SEED_PROJECTS;
  try {
    const raw = localStorage.getItem('DESIRE_SYSTEM_PROJECTS');
    if (!raw) {
      localStorage.setItem('DESIRE_SYSTEM_PROJECTS', JSON.stringify(DEFAULT_SEED_PROJECTS));
      return DEFAULT_SEED_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    const projMap = new Map<string, Project>();
    DEFAULT_SEED_PROJECTS.forEach(p => projMap.set(p.id, p));
    if (Array.isArray(parsed)) {
      parsed.forEach(p => projMap.set(p.id, p));
    }
    return Array.from(projMap.values());
  } catch (e) {
    return DEFAULT_SEED_PROJECTS;
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

// --- PERSISTENT AUTHENTICATION SESSION MANAGEMENT ---

export function saveUserSession(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const sessionData = {
      user,
      login_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    localStorage.setItem('DESIRE_ACTIVE_USER_SESSION', JSON.stringify(sessionData));
    document.cookie = `desire_user_session=${encodeURIComponent(user.employee_id)}; path=/; max-age=604800; SameSite=Lax`;
  } catch (e) {}
}

export function getActiveUserSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('DESIRE_ACTIVE_USER_SESSION');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.user) return null;
    if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
      clearUserSession();
      return null;
    }
    return parsed.user;
  } catch (e) {
    return null;
  }
}

export function clearUserSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('DESIRE_ACTIVE_USER_SESSION');
    document.cookie = `desire_user_session=; path=/; max-age=0`;
  } catch (e) {}
}

export function saveAdminSession(adminData: any): void {
  if (typeof window === 'undefined') return;
  try {
    const sessionData = {
      admin: adminData,
      login_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    localStorage.setItem('DESIRE_ACTIVE_ADMIN_SESSION', JSON.stringify(sessionData));
    document.cookie = `desire_admin_session=true; path=/; max-age=86400; SameSite=Lax`;
  } catch (e) {}
}

export function getActiveAdminSession(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('DESIRE_ACTIVE_ADMIN_SESSION');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.admin) return null;
    if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
      clearAdminSession();
      return null;
    }
    return parsed.admin;
  } catch (e) {
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('DESIRE_ACTIVE_ADMIN_SESSION');
    document.cookie = `desire_admin_session=; path=/; max-age=0`;
  } catch (e) {}
}
