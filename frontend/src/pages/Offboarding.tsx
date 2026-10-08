import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { UserX, Plus, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Offboarding() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [resignationDate, setResignationDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');

  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ['resignations', orgId],
    queryFn: () => api(`/api/resignations?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/resignations', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setReason('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/resignations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, status: status } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations', orgId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !lastWorkingDay) return;
    createMutation.mutate({
      employee_id: employeeId,
      resignation_date: resignationDate || new Date().toISOString().split('T')[0],
      last_working_day: lastWorkingDay,
      reason,
      status: 'pending',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Offboarding & Resignations</h2>
          <p className="text-sm text-secondary">Manage exit workflows, resignation tracking, clearance checklists, and asset handovers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Resignation
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Resignation Records</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading offboarding records...</div>
        ) : resignations.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <UserX className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No active resignation or offboarding cases.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Resignation Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Last Working Day</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Reason</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resignations.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary">{r.resignation_date || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs text-text font-semibold">{r.last_working_day}</td>
                      <td className="py-3 px-4 text-xs text-secondary max-w-xs truncate">{r.reason || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          r.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'accepted' })}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                          >
                            Accept
                          </button>
                        )}
                        {r.status === 'accepted' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'completed' })}
                            className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
                          >
                            Complete Exit
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
            <h3 className="text-lg font-bold text-text">Log Resignation</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-text mb-1">Resignation Date</label>
                <input
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Last Working Day</label>
                <input
                  type="date"
                  value={lastWorkingDay}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Reason / Notes</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={3}
                />
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
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
