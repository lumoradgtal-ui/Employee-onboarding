import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { Target, Plus, Award, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function Performance() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState('Deliver quarterly roadmap items');
  const [targetVal, setTargetVal] = useState('100');

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['performance_goals', orgId],
    queryFn: () => api(`/api/performance_goals?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/performance_goals', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance_goals', orgId] });
      setShowGoalModal(false);
      setTitle('');
      setEmployeeId('');
    },
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !title) return;
    createGoalMutation.mutate({
      employee_id: employeeId,
      title,
      target_metric: metric,
      target_value: targetVal,
      current_value: '0',
      status: 'in_progress',
    });
  };

  const completedGoals = goals.filter((g: any) => g.status === 'completed' || g.status === 'achieved').length;
  const avgCompletionPct = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Performance & OKRs</h2>
          <p className="text-sm text-secondary">Track key results, quarterly goals, performance cycles, and appraisals.</p>
        </div>
        <button
          onClick={() => setShowGoalModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Goal / OKR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{goals.length}</div>
            <div className="text-xs text-secondary">Active Company OKRs</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{avgCompletionPct}%</div>
            <div className="text-xs text-secondary">Goal Completion Rate</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{completedGoals} / {goals.length}</div>
            <div className="text-xs text-secondary">Goals Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Employee Goals & Key Results</h3>
        {loadingGoals ? (
          <div className="py-8 text-center text-secondary">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No active OKRs configured in database.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {goals.map((g: any) => {
              const emp = employees.find((e: any) => e.id === g.employee_id);
              const targetNum = parseFloat(g.target_value) || 100;
              const currentNum = parseFloat(g.current_value) || 0;
              const pct = Math.min(100, Math.round((currentNum / targetNum) * 100));

              return (
                <div key={g.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 -mx-5 px-5 transition-colors">
                  <div className="space-y-1">
                    <div className="font-semibold text-text">{g.title}</div>
                    <div className="text-xs text-secondary">
                      Assignee: {emp ? `${emp.first_name} ${emp.last_name || ''}` : g.employee_id} • Target Metric: {g.target_metric}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {g.status || 'in_progress'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Create Goal / OKR</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
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
                <label className="block text-sm font-medium text-text mb-1">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Reduce customer churn by 15%"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Key Result / Metric</label>
                <input
                  type="text"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGoalMutation.isPending}
                  className="btn text-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
