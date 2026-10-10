import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { UserX, Plus, FileText, CheckCircle2, AlertTriangle, Clock, X, Lock, LogOut } from 'lucide-react';

export default function Offboarding() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [resignationDate, setResignationDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

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

  useEffect(() => {
    if (orgId) {
      api('/api/organizations').then((orgs: any[]) => {
        const currentOrg = orgs.find((o: any) => o.organization_id === orgId);
        if (currentOrg && ['owner', 'admin', 'hr', 'manager'].includes(currentOrg.role)) {
          setIsOrgAdmin(true);
        }
      }).catch(() => {});
    }
  }, [orgId]);

  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  useEffect(() => {
    if (myEmp && !isOrgAdmin) {
      setEmployeeId(myEmp.id);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [myEmp, employees, isOrgAdmin, showModal]);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/resignations', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignations', orgId] });
      setShowModal(false);
      setReason('');
      setResignationDate('');
      setLastWorkingDay('');
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

  const pendingCount = resignations.filter((r: any) => r.status === 'pending').length;
  const acceptedCount = resignations.filter((r: any) => r.status === 'accepted').length;
  const completedCount = resignations.filter((r: any) => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#080809]">Offboarding & Resignations</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manage exit workflows, resignation tracking, clearance checklists, and asset handovers.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#A00142] to-[#650036] hover:opacity-95 text-white rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Resignation
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4 bg-white border border-border shadow-xs rounded-xl">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#080809]">{pendingCount}</div>
            <div className="text-xs font-semibold text-gray-500">Pending Review</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 bg-white border border-border shadow-xs rounded-xl">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#080809]">{acceptedCount}</div>
            <div className="text-xs font-semibold text-gray-500">Notice Period Active</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 bg-white border border-border shadow-xs rounded-xl">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#080809]">{completedCount}</div>
            <div className="text-xs font-semibold text-gray-500">Completed Exit Clearances</div>
          </div>
        </div>
      </div>

      <div className="card bg-white border border-border shadow-sm rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-[#080809] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#A00142]" /> Resignation Records
        </h3>
        
        {isLoading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading offboarding records...</div>
        ) : resignations.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <UserX className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-xs font-medium">No active resignation or offboarding cases logged.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Resignation Date</th>
                  <th className="py-3 px-4">Last Working Day</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {resignations.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#080809]">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{r.resignation_date || 'N/A'}</td>
                      <td className="py-3 px-4 text-[#080809] font-bold">{r.last_working_day}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{r.reason || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          r.status === 'accepted' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          r.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isOrgAdmin ? (
                          <div className="flex justify-end gap-2">
                            {r.status === 'pending' && (
                              <button
                                onClick={() => statusMutation.mutate({ id: r.id, status: 'accepted' })}
                                disabled={statusMutation.isPending}
                                className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 font-bold cursor-pointer"
                              >
                                Accept Notice
                              </button>
                            )}
                            {r.status === 'accepted' && (
                              <button
                                onClick={() => statusMutation.mutate({ id: r.id, status: 'completed' })}
                                disabled={statusMutation.isPending}
                                className="px-2.5 py-1 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 font-bold cursor-pointer"
                              >
                                Complete Exit
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Notice Submitted</span>
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

      {/* Styled Resignation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FCE8EE] text-[#A00142] rounded-xl">
                  <UserX className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-[#080809]">Log Resignation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">Resigning Employee</label>
                  {!isOrgAdmin && myEmp && (
                    <span className="text-[10px] font-bold text-[#A00142] bg-[#FCE8EE] px-2 py-0.5 rounded border border-[#A00142]/20 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Self
                    </span>
                  )}
                </div>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={Boolean(!isOrgAdmin && myEmp)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-gray-50/80 font-medium text-gray-900 disabled:opacity-90 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#A00142] focus:outline-none"
                  required
                >
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name || ''} ({e.work_email || e.personal_email || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Resignation Date</label>
                  <input
                    type="date"
                    value={resignationDate}
                    onChange={(e) => setResignationDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#A00142] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Last Working Day</label>
                  <input
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#A00142] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Reason / Notes</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#A00142] focus:outline-none resize-none"
                  rows={3}
                  placeholder="Provide reason for resignation or notice notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#A00142] to-[#650036] hover:opacity-95 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Resignation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
