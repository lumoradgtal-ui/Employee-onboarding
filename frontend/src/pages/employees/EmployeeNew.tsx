import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { ArrowLeft, Save, Plus, Sparkles, Mail, CheckCircle2, Copy, Check } from 'lucide-react';

export default function EmployeeNew() {
  const { orgId } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick creation modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDesigName, setNewDesigName] = useState('');

  const [autoProvision, setAutoProvision] = useState(true);
  const [provisionResult, setProvisionResult] = useState<any>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    work_email: '',
    employee_code: '',
    department_id: '',
    designation_id: '',
    employment_type: 'full_time',
    status: 'pre_onboarding'
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => api(`/api/departments?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: designations = [], isLoading: loadingDesigs } = useQuery({
    queryKey: ['designations', orgId],
    queryFn: () => api(`/api/designations?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const addDeptMutation = useMutation({
    mutationFn: (name: string) =>
      api('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, name } }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments', orgId] });
      setShowDeptModal(false);
      setNewDeptName('');
      if (data && data[0]) {
        setForm(prev => ({ ...prev, department_id: data[0].id }));
      }
    },
  });

  const addDesigMutation = useMutation({
    mutationFn: (name: string) =>
      api('/api/designations', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, name } }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['designations', orgId] });
      setShowDesigModal(false);
      setNewDesigName('');
      if (data && data[0]) {
        setForm(prev => ({ ...prev, designation_id: data[0].id }));
      }
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: () =>
      api(`/api/setup/seed?org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['designations', orgId] });
    },
  });

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    addDeptMutation.mutate(newDeptName.trim());
  };

  const handleAddDesig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigName.trim()) return;
    addDesigMutation.mutate(newDesigName.trim());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = { ...form, organization_id: orgId };
      Object.keys(data).forEach(k => {
        if ((data as any)[k] === '') delete (data as any)[k];
      });
      const res = await api('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (autoProvision && res && res.id) {
        try {
          const provRes = await api(`/api/employees/${res.id}/create-account?org_id=${orgId}`, {
            method: 'POST',
          });
          setProvisionResult({
            ...provRes,
            empId: res.id,
            name: `${form.first_name} ${form.last_name}`.trim(),
            employee_code: provRes.employee_code || res.employee_code || form.employee_code
          });
          setLoading(false);
          return; // Modal will handle navigation on close
        } catch (pErr: any) {
          console.warn('Account provisioning notice:', pErr);
        }
      }

      navigate(`/employees/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Go Back">
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-text">Add New Employee</h2>
            <p className="text-sm text-secondary">Create a new employee record and start the lifecycle.</p>
          </div>
        </div>
        
        {departments.length === 0 && designations.length === 0 && (
          <button
            type="button"
            onClick={() => seedDefaultsMutation.mutate()}
            disabled={seedDefaultsMutation.isPending}
            className="px-4 py-2 bg-[#FCE8EE] text-[#A00142] hover:bg-[#A00142] hover:text-white border border-[#A00142]/40 rounded-lg font-bold flex items-center gap-2 text-xs transition-all duration-200 shadow-xs group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#A00142] group-hover:text-white transition-colors" />
            {seedDefaultsMutation.isPending ? 'Seeding...' : 'Seed Standard Depts & Designations'}
          </button>
        )}
      </div>

      <div className="card">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">First Name *</label>
              <input required className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Work Email</label>
              <input type="email" className="input" value={form.work_email} onChange={e => setForm({ ...form, work_email: e.target.value })} />
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input className="input" placeholder="Auto-generated (e.g. 001, 002, 003...)" value={form.employee_code} onChange={e => setForm({ ...form, employee_code: e.target.value })} />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Department</label>
                <button
                  type="button"
                  onClick={() => setShowDeptModal(true)}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New
                </button>
              </div>
              <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Designation</label>
                <button
                  type="button"
                  onClick={() => setShowDesigModal(true)}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New
                </button>
              </div>
              <select className="input" value={form.designation_id} onChange={e => setForm({ ...form, designation_id: e.target.value })}>
                <option value="">Select Designation</option>
                {designations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="label">Employment Type</label>
              <select className="input" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="label">Initial Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pre_onboarding">Pre-Onboarding</option>
                <option value="onboarding">Onboarding</option>
                <option value="probation">Probation</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoProvision"
                checked={autoProvision}
                onChange={(e) => setAutoProvision(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="autoProvision" className="text-xs font-semibold text-purple-950 cursor-pointer">
                Auto-generate Portal Login Credentials & Email Directly to Employee
              </label>
            </div>
            <span className="text-[11px] bg-purple-100 text-purple-800 font-medium px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>

          {error && <div className="text-danger text-sm">{error}</div>}

          <div className="flex justify-end pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="btn-secondary mr-3"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Credentials Modal */}
      {provisionResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-border text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Employee Account Created & Credentials Emailed!
              </h3>
            </div>

            {provisionResult.email_sent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Full Credentials Sent Directly to Email!
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    A welcome email containing Employee ID, Portal Link, and Temporary Password was dispatched directly to <strong>{provisionResult.email}</strong>. The employee can open their email to log in immediately.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-purple-700" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-purple-950">Portal Account Activated</div>
                  <p className="text-purple-800 leading-relaxed">
                    Account provisioned for <strong>{provisionResult.name}</strong> ({provisionResult.email}). You can copy the credentials below or check SMTP dispatch logs.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2.5 bg-gray-50/80 p-4 rounded-xl border border-border text-xs">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Employee ID</span>
                  <span className="font-mono font-bold text-text">{provisionResult.employee_code || 'Assigned'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Organization</span>
                  <span className="font-semibold text-text truncate block">{provisionResult.org_name || 'HRMS'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Portal Login Email</span>
                <span className="font-bold text-text text-sm select-all font-mono">{provisionResult.email}</span>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Initial Temporary Password</span>
                <span className="font-bold text-purple-700 text-sm select-all bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded inline-block mt-0.5 font-mono">
                  {provisionResult.temp_password}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Login Portal URL</span>
                <span className="text-secondary font-mono text-[11px] block select-all">http://localhost:5173/login</span>
              </div>
            </div>

            <div className="p-3 bg-purple-50/80 rounded-xl text-xs text-purple-900 space-y-1 border border-purple-100">
              <p className="font-bold">Next Steps for Employee:</p>
              <p>1. Open their inbox at <strong>{provisionResult.email}</strong> and view the welcome email.</p>
              <p>2. Sign in with the temporary password and click <strong>"Change Password"</strong> to set their custom password.</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Welcome to ${provisionResult.org_name || 'HRMS'}!\nYour Portal Login Account has been created.\n\nOrganization: ${provisionResult.org_name || 'HRMS'}\nEmployee ID: ${provisionResult.employee_code || ''}\nLogin Portal: http://localhost:5173/login\nEmail ID: ${provisionResult.email}\nTemporary Password: ${provisionResult.temp_password}\n\nPlease log in and update your temporary password anytime.`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="btn-outline text-xs px-3.5 py-2 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Credentials & Invite'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/employees/${provisionResult.empId}`)}
                className="btn text-xs px-4 py-2"
              >
                Open Employee Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Create Department</h3>
            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Sales, HR"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDeptMutation.isPending}
                  className="btn text-sm"
                >
                  {addDeptMutation.isPending ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Designation Modal */}
      {showDesigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Create Designation</h3>
            <form onSubmit={handleAddDesig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Designation Name</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer, PM"
                  value={newDesigName}
                  onChange={(e) => setNewDesigName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDesigModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDesigMutation.isPending}
                  className="btn text-sm"
                >
                  {addDesigMutation.isPending ? 'Adding...' : 'Add Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
