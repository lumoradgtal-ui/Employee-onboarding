import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, ShieldCheck, Building2, Laptop, CreditCard } from 'lucide-react';

export default function Reports() {
  const { orgId } = useAppStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard_stats', orgId],
    queryFn: () => api(`/api/dashboard/${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => api(`/api/departments?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: payroll = [] } = useQuery({
    queryKey: ['payroll_records', orgId],
    queryFn: () => api(`/api/payroll_records?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', orgId],
    queryFn: () => api(`/api/expenses?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', orgId],
    queryFn: () => api(`/api/assets?org_id=${orgId}`),
    enabled: !!orgId,
  });

  // Calculate real metrics from database
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.status === 'active').length;
  const pendingLeaves = stats?.leave_pending || 0;
  const openJobs = stats?.open_jobs || 0;

  // Calculate department distribution from database
  const deptCounts: { [key: string]: number } = {};
  employees.forEach((e: any) => {
    const deptName = e.departments?.name || 'Unassigned';
    deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
  });

  // Financial calculations from actual DB tables
  const totalPayrollAmount = payroll.reduce((sum: number, p: any) => sum + (parseFloat(p.net_salary) || 0), 0);
  const totalReimbursedExpenses = expenses
    .filter((ex: any) => ex.status === 'paid' || ex.status === 'approved')
    .reduce((sum: number, ex: any) => sum + (parseFloat(ex.amount) || 0), 0);
  
  const annualOverhead = (totalPayrollAmount * 12) + totalReimbursedExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Reports & Workforce Analytics</h2>
          <p className="text-sm text-secondary">Real-time data aggregated dynamically from system records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase flex items-center justify-between">
            Total Headcount <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-text">{totalEmployees}</div>
          <div className="text-xs text-secondary font-medium">Registered Employees</div>
        </div>

        <div className="card space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase flex items-center justify-between">
            Active Staff <ShieldCheck className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-text">{activeEmployees}</div>
          <div className="text-xs text-green-600 font-medium">
            {totalEmployees > 0 ? `${Math.round((activeEmployees / totalEmployees) * 100)}% active` : 'No staff yet'}
          </div>
        </div>

        <div className="card space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase flex items-center justify-between">
            Pending Leave <Calendar className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-text">{pendingLeaves}</div>
          <div className="text-xs text-secondary">Awaiting Review</div>
        </div>

        <div className="card space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase flex items-center justify-between">
            Open Requisitions <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-text">{openJobs}</div>
          <div className="text-xs text-blue-600 font-medium">Active Openings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Real Department Distribution
          </h3>
          {departments.length === 0 && Object.keys(deptCounts).length === 0 ? (
            <div className="py-8 text-center text-secondary text-sm">
              No department assignments recorded yet. Add departments & assign employees to see distribution.
            </div>
          ) : (
            <div className="space-y-4">
              {departments.map((d: any) => {
                const count = employees.filter((e: any) => e.department_id === d.id).length;
                const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                return (
                  <div key={d.id}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-text font-semibold">{d.name}</span>
                      <span className="text-secondary">{count} Staff ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(deptCounts).filter(k => !departments.some((d: any) => d.name === k)).map((deptName) => {
                const count = deptCounts[deptName];
                const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                return (
                  <div key={deptName}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-text font-semibold">{deptName}</span>
                      <span className="text-secondary">{count} Staff ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Real Financial & Inventory Summary
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2.5 border-b border-border">
              <span className="text-secondary flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" /> Total Processed Payroll:
              </span>
              <span className="font-bold text-text">${totalPayrollAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-border">
              <span className="text-secondary flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" /> Approved Expenses:
              </span>
              <span className="font-bold text-text">${totalReimbursedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-border">
              <span className="text-secondary flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-600" /> IT Inventory Count:
              </span>
              <span className="font-bold text-text">{assets.length} Hardware Assets</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-secondary flex items-center gap-2 font-medium">
                <TrendingUp className="w-4 h-4 text-primary" /> Total Financial Outflow:
              </span>
              <span className="font-bold text-primary">${(totalPayrollAmount + totalReimbursedExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
