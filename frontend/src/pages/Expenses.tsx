import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { Banknote, Plus, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';

export default function Expenses() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [category, setCategory] = useState('Travel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', orgId],
    queryFn: () => api(`/api/expenses?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setAmount('');
      setDescription('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, status: status } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] });
    },
  });

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !amount) return;
    createMutation.mutate({
      employee_id: employeeId,
      expense_date: new Date().toISOString().split('T')[0],
      category,
      amount: parseFloat(amount),
      description,
      status: 'pending',
    });
  };

  const totalPending = expenses.filter((e: any) => e.status === 'pending').reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalPaid = expenses.filter((e: any) => e.status === 'paid' || e.status === 'approved').reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Expense Claims & Reimbursements</h2>
          <p className="text-sm text-secondary">Submit receipts, review claims, and process employee payouts.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Submit Claim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">${totalPending.toLocaleString()}</div>
            <div className="text-xs text-secondary">Pending Approval</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">${totalPaid.toLocaleString()}</div>
            <div className="text-xs text-secondary">Approved / Reimbursed</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{expenses.length}</div>
            <div className="text-xs text-secondary">Total Expense Reports</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Expense Reports</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <Banknote className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No expense reports submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Category</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Amount</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Description</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((exp: any) => {
                  const emp = employees.find((e: any) => e.id === exp.employee_id);
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : exp.employee_id}
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary">{exp.category || 'General'}</td>
                      <td className="py-3 px-4 text-sm font-bold text-text">${parseFloat(exp.amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-xs text-secondary max-w-xs truncate">{exp.description || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          exp.status === 'approved' || exp.status === 'paid' ? 'bg-green-100 text-green-800' :
                          exp.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        {exp.status === 'pending' && (
                          <>
                            <button
                              onClick={() => statusMutation.mutate({ id: exp.id, status: 'approved' })}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => statusMutation.mutate({ id: exp.id, status: 'rejected' })}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200"
                            >
                              Reject
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
            <h3 className="text-lg font-bold text-text">Submit Expense Claim</h3>
            <form onSubmit={handleClaim} className="space-y-4">
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
                <label className="block text-sm font-medium text-text mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="Travel">Travel & Accommodation</option>
                  <option value="Meals">Client Meals & Entertainment</option>
                  <option value="Software">Software & Subscriptions</option>
                  <option value="Equipment">Hardware & Office Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
