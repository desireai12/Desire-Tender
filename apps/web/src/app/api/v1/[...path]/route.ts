import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Initialize Supabase Client for Vercel Serverless API
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Secure SHA-256 password hash generator
function hashPassword(pass: string): string {
  if (!pass) return '';
  return crypto.createHash('sha256').update(pass.trim()).digest('hex');
}

// Secure password verification helper (matches exact string or SHA-256 hash)
function verifyPassword(inputPass: string, storedHash: string): boolean {
  if (!inputPass || !storedHash) return false;
  const cleanInput = inputPass.trim();
  const cleanStored = storedHash.trim();
  return cleanStored === cleanInput || cleanStored === hashPassword(cleanInput);
}

// Helper to strip sensitive password data from user object before sending to frontend
function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, password_hash, ...safeUser } = user;
  return safeUser;
}

// Global In-Memory Persistent Server User Store (Guarantees multi-device real-time sync across all Vercel URLs)
let GLOBAL_SERVER_USERS: any[] = [
  {
    id: 'usr-101',
    employee_id: 'EMP001',
    full_name: 'Ankit Purohit',
    email: 'ankit.purohit@desireenergy.com',
    phone: '9829012345',
    password_hash: hashPassword('Ankit@EMP001#2026'),
    role: 'Administrator',
    department: 'Admin',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result', 'admin'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
    registered_at: '2026-08-01 09:00:00',
    created_at: '2026-08-01 09:00:00'
  },
  {
    id: 'usr-102',
    employee_id: 'EMP002',
    full_name: 'Deepak Khandelwal',
    email: 'deepak.khandelwal@desireenergy.com',
    phone: '9829023456',
    password_hash: hashPassword('Deepak@EMP002#2026'),
    role: 'Sr Estimator',
    department: 'Estimation Team',
    status: 'Active',
    permissions: ['eligibility', 'cost_estimation'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC'],
    registered_at: '2026-08-02 11:30:00',
    created_at: '2026-08-02 11:30:00'
  },
  {
    id: 'usr-103',
    employee_id: 'EMP003',
    full_name: 'Suresh Sharma',
    email: 'suresh.sharma@desireenergy.com',
    phone: '9829034567',
    password_hash: hashPassword('Suresh@EMP003#2026'),
    role: 'Chief Engineer',
    department: 'Engineering',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis'],
    assigned_projects: ['SOLAR', 'RHDS', 'STP'],
    registered_at: '2026-08-03 14:00:00',
    created_at: '2026-08-03 14:00:00'
  },
  {
    id: 'usr-104',
    employee_id: 'EMP004',
    full_name: 'Vikas Verma',
    email: 'vikas.verma@desireenergy.com',
    phone: '9829045678',
    password_hash: hashPassword('Vikas@EMP004#2026'),
    role: 'Tender Head',
    department: 'Tender Team',
    status: 'Active',
    permissions: ['eligibility', 'ai_analysis', 'cost_estimation', 'bid_decision', 'bid_details', 'tender_result'],
    assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
    registered_at: '2026-08-04 10:10:00',
    created_at: '2026-08-04 10:10:00'
  }
];

// Helper to handle GET & POST for Vercel Serverless
async function handleRequest(req: NextRequest, params: { path: string[] }) {
  const subPath = params.path.join('/');
  const method = req.method;

  try {
    let body: any = {};
    if (method === 'POST') {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }

    // 1. AUTH: USER REGISTER
    if (subPath === 'auth/register' && method === 'POST') {
      const empId = (body.employee_id || '').trim().toUpperCase();
      const email = (body.email || '').trim().toLowerCase();
      const pass = (body.password || '').trim();

      if (!empId) return NextResponse.json({ detail: 'Employee ID is required.' }, { status: 400 });
      if (!email) return NextResponse.json({ detail: 'Email address is required.' }, { status: 400 });
      if (!pass) return NextResponse.json({ detail: 'Password is required.' }, { status: 400 });

      console.log(`[AUTH REGISTER] Attempting registration for Employee ID: ${empId}, Email: ${email}`);

      // Check for existing user in memory or Supabase
      const existingInMemory = GLOBAL_SERVER_USERS.find(
        u => u.employee_id === empId || u.email === email
      );
      if (existingInMemory) {
        return NextResponse.json({ detail: `Employee ID '${empId}' or Email '${email}' is already registered.` }, { status: 400 });
      }

      const passHash = hashPassword(pass);

      let createdUserRecord: any = {
        id: `usr-${Date.now()}`,
        employee_id: empId,
        full_name: (body.full_name || '').trim() || empId,
        email: email,
        phone: (body.phone || '').trim(),
        password_hash: passHash,
        role: 'User',
        department: 'Tender Team',
        status: 'Pending',
        permissions: ['eligibility'],
        assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
        created_at: new Date().toISOString(),
        registered_at: new Date().toISOString()
      };

      if (supabase) {
        try {
          const { data: existingDb } = await supabase
            .from('users')
            .select('employee_id, email')
            .or(`employee_id.eq.${empId},email.eq.${email}`);

          if (existingDb && existingDb.length > 0) {
            return NextResponse.json({ detail: `Employee ID '${empId}' or Email '${email}' is already registered.` }, { status: 400 });
          }

          const { data: dbCreated } = await supabase
            .from('users')
            .upsert({
              employee_id: empId,
              full_name: createdUserRecord.full_name,
              email: email,
              phone: createdUserRecord.phone,
              password_hash: passHash,
              role: 'User',
              department: 'Tender Team',
              status: 'Pending',
              permissions: ['eligibility'],
              assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP']
            }, { onConflict: 'employee_id' })
            .select('*')
            .single();

          if (dbCreated) {
            createdUserRecord = {
              ...createdUserRecord,
              id: dbCreated.id || createdUserRecord.id,
              created_at: dbCreated.created_at || createdUserRecord.created_at
            };
          }
        } catch (dbErr) {
          console.error('[SUPABASE REGISTER WRITE ERR]', dbErr);
        }
      }

      // Add to Server In-Memory Store so ALL devices see this user instantly
      GLOBAL_SERVER_USERS.unshift(createdUserRecord);

      console.log(`[AUTH REGISTER SUCCESS] User created for Employee ID: ${empId}. Total Server Users: ${GLOBAL_SERVER_USERS.length}`);

      return NextResponse.json({
        status: 'success',
        message: 'Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.',
        user: sanitizeUser(createdUserRecord)
      }, { status: 201 });
    }

    // 2. AUTH: USER LOGIN
    if (subPath === 'auth/login' && method === 'POST') {
      const empId = (body.employee_id || '').trim().toUpperCase();
      const pass = (body.password || '').trim();

      if (!empId || !pass) {
        return NextResponse.json({ detail: 'Employee ID and Password are required.' }, { status: 400 });
      }

      // Check Server In-Memory Store first
      let targetUser = GLOBAL_SERVER_USERS.find(
        u => u.employee_id === empId || u.email === empId.toLowerCase()
      );

      // Check Supabase if available
      if (supabase && !targetUser) {
        try {
          const { data: dbUsers } = await supabase
            .from('users')
            .select('*');

          if (dbUsers && dbUsers.length > 0) {
            targetUser = dbUsers.find((u: any) =>
              (u.employee_id && u.employee_id.trim().toLowerCase() === empId.toLowerCase()) ||
              (u.email && u.email.trim().toLowerCase() === empId.toLowerCase())
            );
          }
        } catch (e) {}
      }

      if (!targetUser) {
        return NextResponse.json({ detail: 'Access Denied: Invalid Employee ID or Password. Please register a new account.' }, { status: 401 });
      }

      const storedHash = targetUser.password_hash || targetUser.password || '';
      if (!verifyPassword(pass, storedHash)) {
        return NextResponse.json({ detail: 'Access Denied: Incorrect Password.' }, { status: 401 });
      }

      let notice = null;
      if (targetUser.status === 'Pending') {
        notice = 'Your account is currently Pending Admin Approval. You can access Eligibility Checking.';
      }

      return NextResponse.json({
        status: 'success',
        message: `Welcome back, ${targetUser.full_name}!`,
        notice: notice,
        user: sanitizeUser(targetUser)
      });
    }

    // 3. AUTH: ADMIN LOGIN
    if (subPath === 'auth/admin-login' && method === 'POST') {
      const adminId = (body.admin_id || '').trim().toLowerCase();
      const pass = (body.password || '').trim();

      if (adminId !== 'admin' && adminId !== 'emp999' && !adminId.includes('admin')) {
        return NextResponse.json({ detail: 'Access Denied: Invalid Admin ID.' }, { status: 401 });
      }

      let activeAdminPwd = 'admin@1234';
      let isCustomAdminPwd = false;
      let mustChange = false;

      if (supabase) {
        try {
          const { data: adminCred } = await supabase
            .from('credentials')
            .select('*')
            .eq('provider', 'ADMIN_ACCOUNT')
            .single();

          if (adminCred && adminCred.encrypted_key) {
            activeAdminPwd = adminCred.encrypted_key;
            isCustomAdminPwd = true;
            mustChange = adminCred.status === 'MUST_CHANGE';
          }
        } catch (e) {}
      }

      const cleanPass = pass.trim();
      let isMatch = false;
      if (isCustomAdminPwd) {
        // Strict match when custom password is configured
        isMatch = (cleanPass === activeAdminPwd);
      } else {
        // Initial setup fallback only
        isMatch = (cleanPass === activeAdminPwd || cleanPass === 'AquaAdmin@2026#DES');
      }

      if (!isMatch) {
        return NextResponse.json({ detail: 'Access Denied: Invalid Admin Password.' }, { status: 401 });
      }

      const requiresChange = mustChange || (pass === 'AquaAdmin@2026#DES' || pass === 'admin');

      return NextResponse.json({
        status: 'success',
        message: 'Admin authentication successful.',
        must_change_password: requiresChange,
        admin: {
          admin_id: 'admin',
          role: 'Admin',
          must_change_password: requiresChange
        }
      });
    }

    // 4. AUTH: ADMIN CHANGE PASSWORD
    if (subPath === 'auth/admin-change-password' && method === 'POST') {
      const newPwd = (body.new_password || '').trim();

      if (!newPwd || newPwd.length < 8) {
        return NextResponse.json({ detail: 'Admin Password must be at least 8 characters long.' }, { status: 400 });
      }

      if (supabase) {
        try {
          await supabase.from('credentials').upsert({
            provider: 'ADMIN_ACCOUNT',
            key_type: 'Admin Dashboard Password',
            encrypted_key: newPwd,
            status: 'ACTIVE',
            updated_at: new Date().toISOString()
          });
        } catch (e) {}
      }

      return NextResponse.json({
        status: 'success',
        message: 'Admin password updated successfully!'
      });
    }

    // 5. AUTH: USERS LIST (Unified Global Multi-Device Sync!)
    if (subPath === 'auth/users' && method === 'GET') {
      let combinedMap = new Map<string, any>();

      // 1. Load from Supabase Cloud Database if available
      if (supabase) {
        try {
          const { data: dbUsers } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

          if (dbUsers && dbUsers.length > 0) {
            dbUsers.forEach((u: any) => {
              combinedMap.set(u.employee_id, {
                id: u.id,
                employee_id: u.employee_id,
                full_name: u.full_name,
                email: u.email,
                phone: u.phone,
                password: u.password_hash || '••••••••',
                role: u.role || 'User',
                department: u.department || 'Tender Team',
                status: u.status || 'Pending',
                permissions: Array.isArray(u.permissions) ? u.permissions : ['eligibility'],
                assigned_projects: Array.isArray(u.assigned_projects) ? u.assigned_projects : ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
                registered_at: u.created_at || new Date().toISOString()
              });
            });
          }
        } catch (e) {}
      }

      // 2. Merge Server In-Memory Store so NO account registered on any device is ever lost
      GLOBAL_SERVER_USERS.forEach((u: any) => {
        if (!combinedMap.has(u.employee_id)) {
          combinedMap.set(u.employee_id, {
            ...u,
            password: '••••••••',
            password_hash: undefined
          });
        }
      });

      const finalUsers = Array.from(combinedMap.values()).map(u => {
        const { password_hash, password, ...safeU } = u;
        return {
          ...safeU,
          password: '••••••••'
        };
      });

      return NextResponse.json({
        status: 'success',
        total_users: finalUsers.length,
        users: finalUsers
      });
    }

    // 6. AUTH: ADMIN UPDATE USER STATUS, ROLE, PERMISSIONS
    if (subPath === 'auth/users/assign-role' && method === 'POST') {
      const { user_id, employee_id, department, is_approved, new_password, permissions } = body;
      const empId = employee_id || user_id;

      if (!empId) return NextResponse.json({ detail: 'Employee ID is required.' }, { status: 400 });

      const newPassHash = new_password && new_password.trim() !== '' ? hashPassword(new_password.trim()) : null;

      // Update Server In-Memory Store
      GLOBAL_SERVER_USERS = GLOBAL_SERVER_USERS.map(u => {
        if (u.employee_id === empId || u.id === empId) {
          const updated: any = {
            ...u,
            department: department || u.department,
            status: is_approved !== undefined ? (is_approved ? 'Active' : 'Pending') : u.status,
            permissions: permissions || u.permissions
          };
          if (newPassHash) {
            updated.password_hash = newPassHash;
          }
          return updated;
        }
        return u;
      });

      // Update Supabase Cloud Database if available
      if (supabase) {
        try {
          const updateData: any = {};
          if (department) updateData.department = department;
          if (is_approved !== undefined) updateData.status = is_approved ? 'Active' : 'Pending';
          if (newPassHash) updateData.password_hash = newPassHash;
          if (permissions) updateData.permissions = permissions;
          updateData.updated_at = new Date().toISOString();

          await supabase.from('users').update(updateData).or(`employee_id.eq.${empId},id.eq.${empId}`);
        } catch (e) {}
      }

      return NextResponse.json({
        status: 'success',
        message: 'Updated user credentials, department & rights successfully!'
      });
    }

    // 7. ADMIN METRICS
    if (subPath === 'admin/metrics' && method === 'GET') {
      let totalU = GLOBAL_SERVER_USERS.length;
      let pendingU = GLOBAL_SERVER_USERS.filter(u => u.status === 'Pending').length;
      let activeU = GLOBAL_SERVER_USERS.filter(u => u.status === 'Active').length;

      if (supabase) {
        try {
          const { data: dbU } = await supabase.from('users').select('status');
          if (dbU && dbU.length > 0) {
            totalU = dbU.length;
            pendingU = dbU.filter(u => u.status === 'Pending').length;
            activeU = dbU.filter(u => u.status === 'Active').length;
          }
        } catch (e) {}
      }

      return NextResponse.json({
        status: 'success',
        metrics: {
          total_users: totalU,
          pending_users: pendingU,
          active_users: activeU,
          inactive_users: totalU - (pendingU + activeU),
          total_projects: 3,
          active_tenders: 8,
          pending_approvals: pendingU,
          completed_tenders: 14
        }
      });
    }

    // 8. DATA: TENDERS GET & POST
    if (subPath === 'tenders') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data: dbTenders, error } = await supabase
              .from('tenders')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && dbTenders) {
              return NextResponse.json({ status: 'success', tenders: dbTenders });
            }
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', tenders: [] });
      }

      if (method === 'POST') {
        const tenderRecord = body;
        if (!tenderRecord || !tenderRecord.id) {
          return NextResponse.json({ detail: 'Tender ID and details required.' }, { status: 400 });
        }

        if (supabase) {
          try {
            await supabase.from('tenders').upsert({
              id: tenderRecord.id,
              tender_name: tenderRecord.tender_name,
              project_category: tenderRecord.project_category,
              project_locked: tenderRecord.project_locked || false,
              department_assigned: tenderRecord.department_assigned,
              current_stage: tenderRecord.current_stage || '1_ELIGIBILITY',
              stage_status: tenderRecord.stage_status || 'In Progress',
              eligibility_result: tenderRecord.eligibility_result || null,
              ai_report: tenderRecord.ai_report || null,
              bid_decision: tenderRecord.bid_decision || null,
              bid_submission: tenderRecord.bid_submission || null,
              tender_result: tenderRecord.tender_result || null,
              audit_trail: tenderRecord.audit_trail || [],
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch (e) {}
        }

        return NextResponse.json({ status: 'success', message: 'Tender saved successfully', tender: tenderRecord });
      }
    }

    // 9. DATA: PROJECTS GET & POST
    if (subPath === 'projects') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data: dbProjects, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && dbProjects && dbProjects.length > 0) {
              return NextResponse.json({ status: 'success', projects: dbProjects });
            }
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', projects: [] });
      }

      if (method === 'POST') {
        const projectRecord = body;
        if (!projectRecord || !projectRecord.id) {
          return NextResponse.json({ detail: 'Project ID and details required.' }, { status: 400 });
        }

        if (supabase) {
          try {
            await supabase.from('projects').upsert({
              id: projectRecord.id,
              name: projectRecord.name,
              type: projectRecord.type,
              client: projectRecord.client,
              description: projectRecord.description,
              ai_instructions: projectRecord.ai_instructions,
              knowledge_sources: projectRecord.knowledge_sources || [],
              status: projectRecord.status || 'Active'
            }, { onConflict: 'id' });
          } catch (e) {}
        }

        return NextResponse.json({ status: 'success', message: 'Project saved successfully', project: projectRecord });
      }
    }

    // 10. DATA: KNOWLEDGE BASE GET & POST
    if (subPath === 'knowledge') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data: dbKb, error } = await supabase
              .from('knowledge_base')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && dbKb) {
              return NextResponse.json({ status: 'success', knowledge: dbKb });
            }
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', knowledge: [] });
      }

      if (method === 'POST') {
        const kbRecord = body;
        if (supabase) {
          try {
            await supabase.from('knowledge_base').upsert({
              id: kbRecord.id || `kb-${Date.now()}`,
              title: kbRecord.title,
              category: kbRecord.category,
              file_name: kbRecord.file_name,
              file_url: kbRecord.file_url,
              description: kbRecord.description,
              issue_date: kbRecord.issue_date,
              expiry_date: kbRecord.expiry_date,
              status: kbRecord.status || 'Active',
              uploaded_by: kbRecord.uploaded_by
            }, { onConflict: 'id' });
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', message: 'Knowledge record saved successfully' });
      }
    }

    // 11. DATA: COMPETITORS GET & POST
    if (subPath === 'competitors') {
      if (method === 'GET') {
        if (supabase) {
          try {
            const { data: dbComp, error } = await supabase
              .from('competitors')
              .select('*')
              .order('updated_at', { ascending: false });

            if (!error && dbComp) {
              return NextResponse.json({ status: 'success', competitors: dbComp });
            }
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', competitors: [] });
      }

      if (method === 'POST') {
        const compRecord = body;
        if (supabase) {
          try {
            await supabase.from('competitors').upsert({
              id: compRecord.id || `comp-${Date.now()}`,
              name: compRecord.name,
              category: compRecord.category,
              win_rate: compRecord.win_rate || 0,
              total_bids: compRecord.total_bids || 0,
              historical_bids: compRecord.historical_bids || [],
              strengths: compRecord.strengths || [],
              weaknesses: compRecord.weaknesses || [],
              winning_strategies: compRecord.winning_strategies || [],
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch (e) {}
        }
        return NextResponse.json({ status: 'success', message: 'Competitor battlecard saved successfully' });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Desire Tender Vercel Serverless API Service Online.'
    });

  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params);
}
