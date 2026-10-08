import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Plus, CheckCircle, AlertTriangle, AlertCircle, Lock } from 'lucide-react';

export default function Probation() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Fetch current Supabase user session
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['probation_records', orgId],
    queryFn: () => api(`/api/probation_records?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  const isAdminOrManager = currentUserEmail === 'testadmin@gmail.com' || 
    currentUserEmail?.includes('admin') || 
    currentUserEmail?.includes('hr') || 
    currentUserEmail?.includes('manager') ||
    myEmp?.role === 'admin' || myEmp?.role === 'manager';

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/probation_records', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['probation_records', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setEndDate('');
      setNotes('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to save probation record.');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/probation_records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payload: {
            organization_id: orgId,
            status: status,
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['probation_records', orgId] });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !endDate) {
      setSubmitError('Please select an employee and set probation end date.');
      return;
    }
    createMutation.mutate({
      employee_id: employeeId,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate,
      review_notes: notes,
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Probation Management</h2>
          <p className="text-sm text-secondary">Monitor probation periods, evaluations, and confirmation decisions.</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => {
              setSubmitError('');
              setShowModal(true);
            }}
            className="btn flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Probation Record
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Probation Reviews</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading probation records...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No active probation records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Start Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">End Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-text">
                          {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                        </div>
                        <div className="text-xs text-secondary">{r.review_notes || 'No review notes'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary">{r.start_date || '—'}</td>
                      <td className="py-3 px-4 text-xs text-text font-semibold">{r.end_date || r.probation_end_date || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          r.status === 'extended' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isAdminOrManager ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'confirmed' })}
                              disabled={updateStatusMutation.isPending}
                              className="px-2.5 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 font-semibold transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'extended' })}
                              disabled={updateStatusMutation.isPending}
                              className="px-2.5 py-1 text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded border border-yellow-200 font-semibold transition-colors"
                            >
                              Extend
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3 text-gray-400" /> HR Managed
                          </span>
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

      {/* Add Probation Record Modal */}
      {showModal && isAdminOrManager && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h3 className="text-lg font-bold text-text">Add Probation Record</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Employee *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Probation End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Notes / Objectives</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Key review goals or initial feedback..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn text-xs font-semibold px-4 py-2"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
