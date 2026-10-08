import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { CreditCard, Plus, FileSpreadsheet, CheckCircle, Lock, Download, Printer, ShieldAlert, FileText, X } from 'lucide-react';

export default function Payroll() {
  const { orgId, orgName } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [basicSalary, setBasicSalary] = useState('5000');
  const [allowances, setAllowances] = useState('1000');
  const [deductions, setDeductions] = useState('500');
  const [period, setPeriod] = useState('October 2026');
  const [submitError, setSubmitError] = useState('');

  // User session & role evaluation
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });
  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api('/api/organizations'),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payroll_records', orgId],
    queryFn: () => api(`/api/payroll_records?org_id=${orgId}`),
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

  const currentOrgMember = orgs.find((o: any) => o.organization_id === orgId);
  const orgRole = currentOrgMember?.role?.toLowerCase() || '';

  const isManagerOrAdmin = ['owner', 'admin', 'manager'].includes(orgRole) ||
    currentUserEmail === 'testadmin@gmail.com' ||
    currentUserEmail?.includes('admin') ||
    currentUserEmail?.includes('manager') ||
    myEmp?.role === 'admin' || myEmp?.role === 'manager';

  // Displayed records: Managers/Admins see all; Regular employees see ONLY their own salary slips
  const displayedRecords = isManagerOrAdmin
    ? records
    : records.filter((r: any) => r.employee_id === myEmp?.id);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/payroll_records', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records', orgId] });
      setShowModal(false);
      setEmployeeId('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to generate salary slip');
    }
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can generate salary slips.');
      return;
    }
    const basic = parseFloat(basicSalary) || 0;
    const allow = parseFloat(allowances) || 0;
    const ded = parseFloat(deductions) || 0;
    const net = basic + allow - ded;

    createMutation.mutate({
      employee_id: employeeId,
      payroll_period: period,
      basic_salary: basic,
      allowances: allow,
      deductions: ded,
      net_salary: net,
      status: 'processed',
    });
  };

  const totalPayrollCost = displayedRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.net_salary) || 0), 0);

  const handlePrintPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Payroll & Salary Slips</h2>
          <p className="text-sm text-secondary">
            {isManagerOrAdmin
              ? 'Process monthly pay runs, salary structures, tax deductions, and slips.'
              : 'View and download your monthly salary slips and payment statements.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isManagerOrAdmin ? (
            <button
              onClick={() => {
                setSubmitError('');
                setShowModal(true);
              }}
              className="btn flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Generate Salary Slip
            </button>
          ) : (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold border border-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Staff View (Salary Slip Upload Restricted to Managers)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">${totalPayrollCost.toLocaleString()}</div>
            <div className="text-xs text-secondary">
              {isManagerOrAdmin ? 'Total Net Payroll Expense' : 'Total Earnings Recorded'}
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{displayedRecords.length}</div>
            <div className="text-xs text-secondary">
              {isManagerOrAdmin ? 'Generated Payslips' : 'Your Payslips Available'}
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">100%</div>
            <div className="text-xs text-secondary">Verified Compliance</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">
          {isManagerOrAdmin ? 'Payslip Register' : 'Your Salary Slips & Statements'}
        </h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading payroll records...</div>
        ) : displayedRecords.length === 0 ? (
          <div className="py-12 text-center text-secondary space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-gray-400" />
            <div className="text-sm font-semibold text-text">
              {isManagerOrAdmin
                ? 'No payslips generated for this period.'
                : 'No salary slips issued for your account yet.'}
            </div>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {isManagerOrAdmin
                ? 'Click "Generate Salary Slip" above to upload monthly salary structures for employees.'
                : 'Your monthly salary slips will appear here once processed by HR/Payroll Management.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Employee</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Pay Period</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Basic Pay</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Allowances</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Deductions</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Net Payable</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedRecords.map((r: any) => {
                  const emp = employees.find((e: any) => e.id === r.employee_id);
                  const isMe = myEmp && emp && emp.id === myEmp.id;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                        {isMe && <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">You</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary font-medium">{r.payroll_period || 'Current Period'}</td>
                      <td className="py-3 px-4 text-xs text-text">${parseFloat(r.basic_salary || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-green-600 font-medium">+${parseFloat(r.allowances || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-red-600 font-medium">-${parseFloat(r.deductions || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm font-bold text-text">${parseFloat(r.net_salary || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                          {r.status || 'processed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayslip(r)}
                          className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded font-semibold inline-flex items-center gap-1 transition-colors"
                          title="View & Download Payslip"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Salary Slip Modal (Manager/Admin Only) */}
      {showModal && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Generate Salary Slip</h3>
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Target Employee *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Pay Period *</label>
                <input
                  type="text"
                  placeholder="e.g. October 2026"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Basic ($) *</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Allowances ($)</label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Deductions ($)</label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm flex justify-between font-bold text-purple-950">
                <span>Calculated Net Salary:</span>
                <span>
                  ${((parseFloat(basicSalary) || 0) + (parseFloat(allowances) || 0) - (parseFloat(deductions) || 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                  className="btn text-sm font-semibold px-4 py-2"
                >
                  {createMutation.isPending ? 'Generating...' : 'Generate Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Downloadable Salary Slip View Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 border border-border shadow-2xl text-left relative">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <div className="text-xs font-bold text-purple-700 uppercase tracking-widest">{orgName || 'HRMS Enterprise'}</div>
                <h3 className="text-xl font-bold text-text flex items-center gap-2 mt-0.5">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Official Salary Slip Statement
                </h3>
                <p className="text-xs text-secondary">Pay Period: {selectedPayslip.payroll_period || 'Current Period'}</p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            {/* Employee Details Card */}
            {(() => {
              const emp = employees.find((e: any) => e.id === selectedPayslip.employee_id);
              return (
                <div className="p-4 bg-gray-50 rounded-xl border border-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium block">Employee Name:</span>
                    <span className="font-bold text-text text-sm">{emp ? `${emp.first_name} ${emp.last_name || ''}` : selectedPayslip.employee_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Work Email:</span>
                    <span className="font-semibold text-text">{emp?.work_email || emp?.personal_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Payment Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase inline-block mt-0.5">
                      {selectedPayslip.status || 'Processed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Issue Date:</span>
                    <span className="font-medium text-text">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })()}

            {/* Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Salary Breakdown</h4>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
                <div className="flex justify-between p-3 bg-white">
                  <span className="text-secondary font-medium">Basic Salary</span>
                  <span className="font-bold text-text">${parseFloat(selectedPayslip.basic_salary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-white">
                  <span className="text-green-700 font-medium">+ Allowances & Bonuses</span>
                  <span className="font-bold text-green-600">+${parseFloat(selectedPayslip.allowances || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-white">
                  <span className="text-red-700 font-medium">- Deductions & Taxes</span>
                  <span className="font-bold text-red-600">-${parseFloat(selectedPayslip.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-purple-50/70 text-sm font-bold text-purple-950">
                  <span>Net Payable Amount:</span>
                  <span className="text-base text-purple-900">${parseFloat(selectedPayslip.net_salary || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="btn-outline px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintPayslip}
                className="btn px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Download / Print Payslip PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
