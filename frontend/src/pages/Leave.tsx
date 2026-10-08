import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { CalendarDays, Plus, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';

export default function Leave() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave_requests', orgId],
    queryFn: () => api(`/api/leave_requests?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave_types', orgId],
    queryFn: () => api(`/api/leave_types?org_id=${orgId}`),
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

  useEffect(() => {
    if (myEmp) {
      setEmployeeId(myEmp.id);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [myEmp, employees, showModal]);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/leave_requests', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/leave_requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payload: {
            organization_id: orgId,
            status: status,
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', orgId] });
    },
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) return;
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    createMutation.mutate({
      employee_id: employeeId,
      leave_type_id: leaveTypeId || null,
      start_date: startDate,
      end_date: endDate,
      days: diffDays || 1,
      reason: reason,
      status: 'pending',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Leave Management</h2>
          <p className="text-sm text-secondary">Manage paid time off, leave requests, and approval workflows.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">
              {requests.filter((r: any) => r.status === 'pending').length}
            </div>
            <div className="text-xs text-secondary">Pending Approvals</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">
              {requests.filter((r: any) => r.status === 'approved').length}
            </div>
            <div className="text-xs text-secondary">Approved Leaves</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{requests.length}</div>
            <div className="text-xs text-secondary">Total Requests</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Leave Applications</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No leave applications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Dates</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Reason</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                      </td>
                      <td className="py-3 px-4 text-xs text-text">
                        {r.start_date} to {r.end_date}
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary max-w-xs truncate">
                        {r.reason || 'No reason provided'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          r.status === 'approved' ? 'bg-green-100 text-green-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'approved' })}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'rejected' })}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
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
            <h3 className="text-lg font-bold text-text">Apply for Leave</h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-text">Applicant Employee</label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-600" /> Locked to Logged-in User
                  </span>
                </div>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-gray-100 text-gray-800 cursor-not-allowed font-medium shadow-sm"
                  required
                >
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'You'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">End Date</label>
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
                <label className="block text-sm font-medium text-text mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="State the reason for leave request..."
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
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
