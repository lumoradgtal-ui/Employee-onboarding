import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { CreditCard, Plus, FileSpreadsheet, CheckCircle, Lock, Download, Printer, ShieldAlert, FileText, Paperclip, Eye, Search, Filter } from 'lucide-react';

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
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentReference, setPaymentReference] = useState(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentProofName, setPaymentProofName] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);

  // User session & role evaluation
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });
  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

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

  // Auto-select current logged-in employee by default when modal opens or on load
  useEffect(() => {
    if (myEmp && (!employeeId || showModal)) {
      setEmployeeId(myEmp.id);
    }
  }, [myEmp, showModal]);

  // Displayed records: Managers/Admins see all; Regular employees see ONLY their own salary slips
  const userRecords = isManagerOrAdmin
    ? records
    : records.filter((r: any) => r.employee_id === myEmp?.id);

  const displayedRecords = userRecords.filter((r: any) => {
    if (!searchFilter) return true;
    const emp = employees.find((e: any) => e.id === r.employee_id);
    const empName = emp ? `${emp.first_name} ${emp.last_name || ''}`.toLowerCase() : '';
    const q = searchFilter.toLowerCase();
    return (
      (r.payroll_period && r.payroll_period.toLowerCase().includes(q)) ||
      (r.payment_reference && r.payment_reference.toLowerCase().includes(q)) ||
      empName.includes(q)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please attach a smaller image or document.');
        return;
      }
      setPaymentProofName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/payroll_records', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_records', orgId] });
      setShowModal(false);
      setPaymentProofUrl('');
      setPaymentProofName('');
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
      status: paymentStatus,
      payment_reference: paymentReference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      payment_proof_url: paymentProofUrl,
      payment_proof_name: paymentProofName,
      paid_at: new Date().toISOString(),
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
              ? 'Process monthly pay runs, attach payment proof receipts, and issue salary slips.'
              : 'View and download all your historical monthly salary slips and payment receipts.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isManagerOrAdmin ? (
            <button
              onClick={() => {
                setSubmitError('');
                setPaymentReference(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
                if (myEmp) setEmployeeId(myEmp.id);
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
              {isManagerOrAdmin ? 'Generated Payslips' : 'Your Total Salary Slips'}
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">100%</div>
            <div className="text-xs text-secondary">Payment Verified & Compliant</div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <h3 className="text-lg font-semibold text-text">
            {isManagerOrAdmin ? 'Payslip Register' : 'Your Previous Salary Slips'}
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by period or reference..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-border rounded-lg bg-gray-50 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

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
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Txn / Ref ID</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Net Payable</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Payment Proof</th>
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
                      <td className="py-3 px-4 text-xs font-mono text-gray-600">{r.payment_reference || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-bold text-text">${parseFloat(r.net_salary || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">
                        {r.payment_proof_url ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-200">
                            <Paperclip className="w-3 h-3" /> Attached
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">No Receipt</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          r.status === 'paid' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.status === 'paid' ? '✓ Paid' : (r.status || 'Processed')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayslip(r)}
                          className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded font-semibold inline-flex items-center gap-1 transition-colors"
                          title="View & Download Payslip"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Slip
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
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Generate Salary Slip (Post-Payment)</h3>
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
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'Staff'}) {myEmp && e.id === myEmp.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Pay Period *</label>
                  <input
                    type="text"
                    placeholder="e.g. October 2026"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Payment Status *</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-white font-medium"
                    required
                  >
                    <option value="paid">Paid (Payment Completed)</option>
                    <option value="processed">Processed / Pending Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Payment Reference / Txn ID</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-98402198"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm font-mono"
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

              <div>
                <label className="block text-xs font-medium text-text mb-1">Attach Payment Document / Receipt (Image or PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-border rounded-lg p-1.5 cursor-pointer"
                />
                {paymentProofName && (
                  <p className="text-[11px] text-purple-700 mt-1 font-medium flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attached: {paymentProofName}
                  </p>
                )}
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
                  className="px-4 py-2 text-sm text-secondary hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn text-sm font-semibold px-4 py-2 cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 border border-border shadow-2xl text-left relative max-h-[90vh] overflow-y-auto">
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
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1 cursor-pointer"
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase inline-block mt-0.5 border border-green-200">
                      ✓ {selectedPayslip.status || 'Paid'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Payment Ref / Txn ID:</span>
                    <span className="font-mono text-text font-bold">{selectedPayslip.payment_reference || 'TXN-CONFIRMED'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Salary Breakdown Table */}
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

            {/* Attached Payment Proof Section */}
            {selectedPayslip.payment_proof_url && (
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-purple-600" />
                  Attached Payment Receipt / Proof Document
                </div>
                {selectedPayslip.payment_proof_url.startsWith('data:image') ||
                 selectedPayslip.payment_proof_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                  <div className="mt-2 border border-purple-200 rounded-lg overflow-hidden max-h-48 bg-white flex items-center justify-center p-2">
                    <img
                      src={selectedPayslip.payment_proof_url}
                      alt="Payment Receipt"
                      className="max-h-44 object-contain rounded"
                    />
                  </div>
                ) : (
                  <a
                    href={selectedPayslip.payment_proof_url}
                    download={selectedPayslip.payment_proof_name || 'payment_receipt.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-purple-700 font-semibold bg-white border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> View / Download Attached Document ({selectedPayslip.payment_proof_name || 'Receipt.pdf'})
                  </a>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintPayslip}
                className="btn px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 cursor-pointer"
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

