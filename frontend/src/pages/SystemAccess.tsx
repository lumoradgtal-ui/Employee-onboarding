import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { KeyRound, Plus, ShieldAlert, CheckCircle } from 'lucide-react';

export default function SystemAccess() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [systemName, setSystemName] = useState('');
  const [accessLevel, setAccessLevel] = useState('user');

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

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/system_access', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_access', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setSystemName('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/system_access/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, status: 'revoked' } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_access', orgId] });
    },
  });

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !systemName) return;
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
          <h2 className="text-2xl font-bold text-text">System Access & SaaS Grants</h2>
          <p className="text-sm text-secondary">Manage IT permissions, Google Workspace, GitHub, Slack, and SaaS access.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Grant Access
        </button>
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
