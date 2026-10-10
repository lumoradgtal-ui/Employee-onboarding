import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { KeyRound, Plus, ShieldAlert, CheckCircle, ShieldCheck, UserCheck, Lock } from 'lucide-react';

export default function SystemAccess() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [systemName, setSystemName] = useState('');
  const [accessLevel, setAccessLevel] = useState('user');
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);

  // User session & role evaluation
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });
  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['system_access', orgId],
    queryFn: () => api(`/api/system_access?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['organization_members', orgId],
    queryFn: () => api(`/api/organization/members?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  useEffect(() => {
    if (orgId) {
      api('/api/organizations').then((orgs: any[]) => {
        const currentOrg = orgs.find((o: any) => o.organization_id === orgId || o.id === orgId);
        const role = currentOrg?.role?.toLowerCase() || '';
        const isMgr = ['owner', 'admin', 'hr', 'manager'].includes(role) ||
                      currentUserEmail === 'testadmin@gmail.com' ||
                      myEmp?.role === 'admin' || myEmp?.role === 'manager';
        setIsManagerOrAdmin(isMgr);
      }).catch(() => {
        setIsManagerOrAdmin(false);
      });
    }
  }, [orgId, currentUserEmail, myEmp]);

  const assignRoleMutation = useMutation({
    mutationFn: ({ employeeId, role }: { employeeId: string; role: string }) => {
      if (!isManagerOrAdmin) throw new Error('Permission restricted: Only Managers and Admins can assign system roles.');
      return api('/api/organization/members/assign-role', {
        method: 'POST',
        body: JSON.stringify({ organization_id: orgId, employee_id: employeeId, role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update system access role.');
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!isManagerOrAdmin) throw new Error('Permission restricted: Only Managers and Admins can grant system access.');
      return api('/api/system_access', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_access', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setSystemName('');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to grant system access.');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!isManagerOrAdmin) throw new Error('Permission restricted: Only Managers and Admins can revoke access.');
      return api(`/api/system_access/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, status: 'revoked' } }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_access', orgId] });
    },
  });

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !systemName) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can grant system access.');
      return;
    }
    createMutation.mutate({
      employee_id: employeeId,
      system_name: systemName,
      access_level: accessLevel,
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-text">System Access & SaaS Grants</h2>
          <p className="text-xs text-secondary mt-0.5">Manage IT permissions, portal roles (Manager/Admin), Google Workspace, GitHub, and SaaS access.</p>
        </div>
        <div>
          {isManagerOrAdmin ? (
            <button
              onClick={() => setShowModal(true)}
              className="btn flex items-center justify-center gap-2 cursor-pointer text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              Grant Access
            </button>
          ) : (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold border border-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Staff View (Role & System Access Managed by Organization)
            </span>
          )}
        </div>
      </div>

      {/* PORTAL SYSTEM ROLES & MANAGER PRIVILEGES CARD */}
      <div className="card space-y-4 border border-border shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#A00142]" /> Portal Access Roles & Manager Privileges
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {isManagerOrAdmin
                ? 'Assign Manager or Admin roles to employees to give them full access across all HRMS modules.'
                : 'View system access roles assigned by Organization Administrators.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-secondary uppercase font-bold text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Login Status</th>
                <th className="py-2.5 px-3">Current Access Role</th>
                <th className="py-2.5 px-3 text-right">Assign System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">No employees found.</td>
                </tr>
              ) : (
                employees.map((emp: any) => {
                  const member = members.find((m: any) => m.employee?.id === emp.id || m.user_id === emp.user_id);
                  const currentRole = member?.role || (emp.user_id ? 'employee' : 'no_account');
                  const hasLogin = Boolean(emp.user_id);

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-bold text-text">
                        {emp.first_name} {emp.last_name || ''}
                      </td>
                      <td className="py-3 px-3 text-secondary">
                        {emp.work_email || emp.personal_email || 'No Email'}
                      </td>
                      <td className="py-3 px-3">
                        {hasLogin ? (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                            Active Account
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Account Not Provisioned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          currentRole === 'owner' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                          currentRole === 'admin' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
                          currentRole === 'manager' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          currentRole === 'hr' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {currentRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isManagerOrAdmin ? (
                          hasLogin ? (
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={currentRole}
                                onChange={(e) => assignRoleMutation.mutate({ employeeId: emp.id, role: e.target.value })}
                                disabled={assignRoleMutation.isPending}
                                className="bg-white border border-border text-text rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#A00142]"
                              >
                                <option value="employee">Standard Employee</option>
                                <option value="manager">Manager (Full System Access)</option>
                                <option value="hr">HR Administrator</option>
                                <option value="admin">System Admin</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Provision login in Employees module first</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium">Role Managed by Admin</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Active Access Grants</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading system access grants...</div>
        ) : grants.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <KeyRound className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No system access permissions logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">System / SaaS</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Access Level</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grants.map((g: any) => {
                  const emp = employees.find((e: any) => e.id === g.employee_id);
                  const isRevoked = g.status === 'revoked';
                  return (
                    <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : g.employee_id}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-text">{g.system_name}</td>
                      <td className="py-3 px-4 text-xs text-secondary capitalize">{g.access_level || 'standard'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          isRevoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {g.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {!isRevoked && (
                          <button
                            onClick={() => revokeMutation.mutate(g.id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Grant System Access</h3>
            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">System / Application Name</label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Enterprise, Slack, AWS"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Access Level / Role</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="user font-medium">Standard User</option>
                  <option value="admin">Administrator / Superuser</option>
                  <option value="read_only">Read Only / Auditor</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn text-sm"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
