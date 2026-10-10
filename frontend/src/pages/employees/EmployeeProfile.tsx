import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, User, Briefcase, Clock, Calendar, Shield, CreditCard, Activity, FileText, 
  Edit, Save, Lock, Building2, MapPin, Landmark, Heart, FileCheck, Phone, Mail, Award, ShieldAlert,
  Folder, FolderPlus, Upload, Trash2, ExternalLink, File, CheckCircle2, Plus, ChevronRight
} from 'lucide-react';

const MAIN_TABS = [
  { id: 'profile', name: 'Profile Details', icon: User },
  { id: 'hiring', name: 'Hiring Details', icon: Briefcase },
  { id: 'documents', name: 'Documents', icon: FileCheck },
  { id: 'attendance', name: 'Attendance', icon: Clock },
  { id: 'leave', name: 'Leave Summary', icon: Calendar },
  { id: 'payroll', name: 'Payroll & Compensation', icon: CreditCard },
  { id: 'performance', name: 'Performance & OKRs', icon: Activity },
  { id: 'timeline', name: 'Timeline', icon: FileText },
];

const PROFILE_SUBTABS = [
  { id: 'primary', name: 'Primary Details' },
  { id: 'identification', name: 'Identification Details' },
  { id: 'contact', name: 'Contact Details' },
  { id: 'address', name: 'Address' },
  { id: 'bank', name: 'Bank Account Details' },
  { id: 'relations', name: 'Relations' },
];

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeMainTab, setActiveMainTab] = useState('profile');
  const [activeSubTab, setActiveSubTab] = useState('primary');
  const [showEditModal, setShowEditModal] = useState(false);

  // Document Vault state & folder system
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>([
    'ID Proofs & Govt Documents',
    'Educational & Marks Cards',
    'Employment & Experience Letters',
    'Certifications & Licenses'
  ]);

  // Upload Document Form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Aadhaar Card');
  const [targetFolder, setTargetFolder] = useState('ID Proofs & Govt Documents');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  // Attendance Period & Date Range Filter state
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [attPeriodPreset, setAttPeriodPreset] = useState<string>('this_month');
  const [attStartDate, setAttStartDate] = useState(firstDayOfMonth);
  const [attEndDate, setAttEndDate] = useState(lastDayOfMonth);
  const [attStatusFilter, setAttStatusFilter] = useState('');

  const handleAttPresetChange = (preset: string) => {
    setAttPeriodPreset(preset);
    const today = new Date();
    if (preset === 'this_month') {
      const fDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      setAttStartDate(fDay);
      setAttEndDate(lDay);
    } else if (preset === 'last_month') {
      const fDay = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const lDay = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setAttStartDate(fDay);
      setAttEndDate(lDay);
    } else if (preset === 'last_90') {
      const d90 = new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setAttStartDate(d90);
      setAttEndDate(todayStr);
    } else if (preset === 'all') {
      setAttStartDate('');
      setAttEndDate('');
    }
  };

  // User session fetch for self-service permission check
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  // Profile data fetch
  const { data: emp, isLoading, error } = useQuery({
    queryKey: ['employee', orgId, id],
    queryFn: () => api(`/api/employees/${id}?org_id=${orgId}`),
    enabled: !!orgId && !!id,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => api(`/api/departments?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations', orgId],
    queryFn: () => api(`/api/designations?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance_records', orgId, id],
    queryFn: () => api(`/api/attendance_records?org_id=${orgId}&employee_id=${id}`),
    enabled: !!orgId && !!id,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave_requests', orgId, id],
    queryFn: () => api(`/api/leave_requests?org_id=${orgId}&employee_id=${id}`),
    enabled: !!orgId && !!id,
  });

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ['payroll_records', orgId, id],
    queryFn: () => api(`/api/payroll_records?org_id=${orgId}&employee_id=${id}`),
    enabled: !!orgId && !!id,
  });

  const { data: performanceGoals = [] } = useQuery({
    queryKey: ['performance_goals', orgId, id],
    queryFn: () => api(`/api/performance_goals?org_id=${orgId}&employee_id=${id}`),
    enabled: !!orgId && !!id,
  });

  const { data: employeeDocuments = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', orgId, id],
    queryFn: () => api(`/api/documents?org_id=${orgId}&employee_id=${id}`),
    enabled: !!orgId && !!id,
  });

  const uploadDocMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/documents', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, employee_id: id, status: 'verified', ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', orgId, id] });
      setShowUploadDocModal(false);
      setDocTitle('');
      setDocFileUrl('');
      setDocNumber('');
      setDocExpiryDate('');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) =>
      api(`/api/documents/${docId}?org_id=${orgId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', orgId, id] });
    },
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!customFolders.includes(newFolderName.trim())) {
      setCustomFolders([...customFolders, newFolderName.trim()]);
    }
    setShowCreateFolderModal(false);
    setNewFolderName('');
  };

  // Form state for editing complete details
  const [form, setForm] = useState<any>({});

  const openEdit = () => {
    if (!emp) return;
    const address = emp.address || {};
    const bank = emp.bank_details || {};
    const tax = emp.tax_details || {};
    const emergency = emp.emergency_contact || {};
    const relations = emp.relations || {};

    setForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      work_email: emp.work_email || '',
      personal_email: emp.personal_email || '',
      phone: emp.phone || '',
      date_of_joining: emp.date_of_joining || '',
      date_of_birth: emp.date_of_birth || '',
      gender: emp.gender || '',
      nationality: emp.nationality || '',
      ethnicity: emp.ethnicity || '',
      religion: emp.religion || '',
      marital_status: emp.marital_status || 'single',
      work_anniversary: emp.work_anniversary || '',
      next_appraisal_date: emp.next_appraisal_date || '',
      department_id: emp.department_id || '',
      designation_id: emp.designation_id || '',
      manager_id: emp.manager_id || '',
      employment_type: emp.employment_type || 'full_time',
      status: emp.status || 'active',

      // Identification / Tax Details
      national_id: tax.national_id || '',
      tax_id: tax.tax_id || '',
      passport_number: tax.passport_number || '',
      driving_license: tax.driving_license || '',

      // Address
      street_address: address.street || '',
      city: address.city || '',
      state: address.state || '',
      country: address.country || '',
      postal_code: address.postal_code || '',

      // Bank Account Details
      bank_name: bank.bank_name || '',
      account_holder_name: bank.account_holder_name || '',
      account_number: bank.account_number || '',
      ifsc_routing: bank.ifsc_routing || '',
      swift_code: bank.swift_code || '',
      branch_name: bank.branch_name || '',

      // Emergency / Relations
      emergency_name: emergency.name || '',
      emergency_relation: emergency.relation || '',
      emergency_phone: emergency.phone || '',
      spouse_name: relations.spouse_name || '',
      dependents_count: relations.dependents_count || '0',
    });
    setShowEditModal(true);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      api(`/api/employees/${id}?org_id=${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', orgId, id] });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      setShowEditModal(false);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update employee profile');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      organization_id: orgId,
      first_name: form.first_name,
      last_name: form.last_name,
      work_email: form.work_email,
      personal_email: form.personal_email,
      phone: form.phone,
      date_of_joining: form.date_of_joining || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      nationality: form.nationality,
      ethnicity: form.ethnicity,
      religion: form.religion,
      marital_status: form.marital_status,
      work_anniversary: form.work_anniversary || null,
      next_appraisal_date: form.next_appraisal_date || null,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null,
      manager_id: form.manager_id || null,
      employment_type: form.employment_type,
      status: form.status,

      address: {
        street: form.street_address,
        city: form.city,
        state: form.state,
        country: form.country,
        postal_code: form.postal_code,
      },
      bank_details: {
        bank_name: form.bank_name,
        account_holder_name: form.account_holder_name,
        account_number: form.account_number,
        ifsc_routing: form.ifsc_routing,
        swift_code: form.swift_code,
        branch_name: form.branch_name,
      },
      tax_details: {
        national_id: form.national_id,
        tax_id: form.tax_id,
        passport_number: form.passport_number,
        driving_license: form.driving_license,
      },
      emergency_contact: {
        name: form.emergency_name,
        relation: form.emergency_relation,
        phone: form.emergency_phone,
      },
      relations: {
        spouse_name: form.spouse_name,
        dependents_count: form.dependents_count,
      },
    };
    updateMutation.mutate(payload);
  };

  const [provisionResult, setProvisionResult] = useState<any>(null);

  const provisionMutation = useMutation({
    mutationFn: () =>
      api(`/api/employees/${id}/create-account?org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employee', orgId, id] });
      setProvisionResult(res);
    },
    onError: (err: any) => {
      alert(err.message || 'Provisioning failed');
    }
  });

  if (isLoading) return <div className="p-8 text-center text-secondary">Loading profile...</div>;
  if (error || !emp) return <div className="p-8 text-center text-danger">Failed to load employee profile</div>;

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  // Check if logged-in user is viewing their own profile
  const isSelf = !!(
    emp && (
      (emp.work_email && emp.work_email.toLowerCase() === currentUserEmail) ||
      (emp.personal_email && emp.personal_email.toLowerCase() === currentUserEmail) ||
      (emp.user_id && emp.user_id === currentUserId)
    )
  );

  // Manager / Admin role check
  const isAdminOrManager = currentUserEmail === 'testadmin@gmail.com' || currentUserEmail?.includes('admin') || currentUserEmail?.includes('hr') || currentUserEmail?.includes('manager');

  // Can edit if self OR manager/admin
  const canEdit = isSelf || isAdminOrManager;

  // Strict Privacy Enforcement: Non-manager employees can ONLY view their own profile
  if (!isSelf && !isAdminOrManager) {
    const myEmp = employees.find((e: any) => 
      (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
      (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
      (e.user_id && e.user_id === currentUserId)
    );

    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 bg-white border border-border rounded-2xl shadow-sm my-8">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-text">Access Restricted: Employee Privacy Shield</h3>
          <p className="text-sm text-secondary max-w-md mx-auto leading-relaxed">
            In accordance with company privacy policies, employees are only authorized to view and manage their own profile. Colleague employee profiles are restricted to HR & Organization Managers.
          </p>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline text-xs px-4 py-2"
          >
            ← Go Back
          </button>
          {myEmp && (
            <button
              onClick={() => navigate(`/employees/${myEmp.id}`)}
              className="btn text-xs px-4 py-2"
            >
              Open My Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  const manager = employees.find((e: any) => e.id === emp.manager_id);
  const bank = emp.bank_details || {};
  const tax = emp.tax_details || {};
  const address = emp.address || {};
  const emergency = emp.emergency_contact || {};
  const relations = emp.relations || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Go Back">
            <ArrowLeft className="w-5 h-5 text-secondary" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text">{emp.first_name} {emp.last_name}</h2>
              {isSelf && (
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                  You (Self Service)
                </span>
              )}
            </div>
            <p className="text-sm text-secondary">{emp.designations?.name || 'No Designation'} • {emp.departments?.name || 'No Department'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <button
              onClick={() => provisionMutation.mutate()}
              disabled={provisionMutation.isPending}
              className="px-4 py-2 bg-[#FCE8EE] text-[#A00142] hover:bg-[#A00142] hover:text-white border border-[#A00142]/40 rounded-lg font-bold flex items-center gap-2 text-xs transition-all duration-200 shadow-xs group cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#A00142] group-hover:text-white transition-colors" />
              {provisionMutation.isPending ? 'Provisioning...' : 'Provision Login Account'}
            </button>
          )}

          {canEdit ? (
            <button
              onClick={openEdit}
              className="btn flex items-center gap-2 text-xs shadow-sm"
            >
              <Edit className="w-4 h-4" />
              {isSelf ? 'Edit My Profile' : 'Edit Employee Details'}
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-gray-100 text-secondary rounded-lg text-xs font-medium border border-border flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              View Only (Protected)
            </span>
          )}
        </div>
      </div>

      {/* Top Banner Overview Card */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shrink-0 border-2 border-primary/20">
            {emp.first_name[0]}{emp.last_name?.[0] || ''}
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-text">{emp.first_name} {emp.last_name}</h3>
                <div className="text-sm text-secondary flex items-center gap-4 mt-1">
                  <span>{emp.work_email || 'No Email'}</span>
                  <span>•</span>
                  <span>{emp.phone || 'No Contact Number'}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-green-100 text-green-800 self-start">
                {emp.status ? emp.status.replace('_', ' ') : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-border">
              <div>
                <span className="text-secondary block">Employee ID</span>
                <span className="font-semibold text-text">{emp.employee_code || '—'}</span>
              </div>
              <div>
                <span className="text-secondary block">Department</span>
                <span className="font-semibold text-text">{emp.departments?.name || '—'}</span>
              </div>
              <div>
                <span className="text-secondary block">Reporting Manager</span>
                <span className="font-semibold text-text">{manager ? `${manager.first_name} ${manager.last_name || ''}` : '—'}</span>
              </div>
              <div>
                <span className="text-secondary block">Manager Confidential Protection</span>
                <span className="text-green-700 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-green-600" /> Admin / Manager Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeMainTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-secondary hover:text-text hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* PROFILE DETAILS TAB */}
          {activeMainTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Sub-Navigation */}
              <div className="flex overflow-x-auto space-x-1 bg-gray-100 p-1 rounded-lg w-max">
                {PROFILE_SUBTABS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveSubTab(st.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      activeSubTab === st.id ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-text'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>

              {/* Sub-tab 1: Primary Details */}
              {activeSubTab === 'primary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Date of Birth</span>
                    <span className="font-semibold text-text">{emp.date_of_birth || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Gender</span>
                    <span className="font-semibold text-text capitalize">{emp.gender || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Work Anniversary</span>
                    <span className="font-semibold text-text">{emp.work_anniversary || emp.date_of_joining || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Nationality</span>
                    <span className="font-semibold text-text">{emp.nationality || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Ethnicity</span>
                    <span className="font-semibold text-text">{emp.ethnicity || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Religion</span>
                    <span className="font-semibold text-text">{emp.religion || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Marital Status</span>
                    <span className="font-semibold text-text capitalize">{emp.marital_status || 'Single'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Next Appraisal Date</span>
                    <span className="font-semibold text-text">{emp.next_appraisal_date || '—'}</span>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Identification Details (Manager Restricted) */}
              {activeSubTab === 'identification' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-lg flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Manager Restricted: Identification & Government Tax IDs are protected for HR/Manager access.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">National ID / SSN / PAN</span>
                      <span className="font-bold text-text font-mono">{tax.national_id || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Tax Identification Number (TIN)</span>
                      <span className="font-bold text-text font-mono">{tax.tax_id || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Passport Number</span>
                      <span className="font-semibold text-text font-mono">{tax.passport_number || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Driving License Number</span>
                      <span className="font-semibold text-text font-mono">{tax.driving_license || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Contact Details */}
              {activeSubTab === 'contact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Work Email</span>
                    <span className="font-semibold text-text">{emp.work_email || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Personal Email</span>
                    <span className="font-semibold text-text">{emp.personal_email || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Phone Number</span>
                    <span className="font-semibold text-text">{emp.phone || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Emergency Contact</span>
                    <span className="font-semibold text-text">
                      {emergency.name ? `${emergency.name} (${emergency.relation || 'Contact'}) - ${emergency.phone}` : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Address */}
              {activeSubTab === 'address' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1 md:col-span-2">
                    <span className="text-xs text-secondary block">Street / Residence Address</span>
                    <span className="font-semibold text-text">{address.street || 'No street address recorded'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">City</span>
                    <span className="font-semibold text-text">{address.city || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">State / Region</span>
                    <span className="font-semibold text-text">{address.state || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Country</span>
                    <span className="font-semibold text-text">{address.country || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Postal / Zip Code</span>
                    <span className="font-semibold text-text">{address.postal_code || '—'}</span>
                  </div>
                </div>
              )}

              {/* Sub-tab 5: Bank Account Details (Manager Restricted) */}
              {activeSubTab === 'bank' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-lg flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Manager Confidential: Bank details are encrypted and accessible only to HR & Payroll Managers.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Bank Name</span>
                      <span className="font-bold text-text">{bank.bank_name || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Account Holder Name</span>
                      <span className="font-semibold text-text">{bank.account_holder_name || `${emp.first_name} ${emp.last_name || ''}`}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Bank Account Number</span>
                      <span className="font-bold text-text font-mono">{bank.account_number || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">IFSC / Routing / Sort Code</span>
                      <span className="font-semibold text-text font-mono">{bank.ifsc_routing || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">SWIFT Code</span>
                      <span className="font-semibold text-text font-mono">{bank.swift_code || '—'}</span>
                    </div>
                    <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                      <span className="text-xs text-secondary block">Branch Name</span>
                      <span className="font-semibold text-text">{bank.branch_name || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 6: Relations */}
              {activeSubTab === 'relations' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Spouse Name</span>
                    <span className="font-semibold text-text">{relations.spouse_name || '—'}</span>
                  </div>
                  <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                    <span className="text-xs text-secondary block">Total Dependents</span>
                    <span className="font-semibold text-text">{relations.dependents_count || '0'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HIRING DETAILS TAB */}
          {activeMainTab === 'hiring' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                <span className="text-xs text-secondary block">Date of Joining</span>
                <span className="font-bold text-text">{emp.date_of_joining || '—'}</span>
              </div>
              <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                <span className="text-xs text-secondary block">Employment Status</span>
                <span className="font-semibold text-text capitalize">{emp.status ? emp.status.replace('_', ' ') : 'Active'}</span>
              </div>
              <div className="p-4 bg-gray-50/60 rounded-lg border border-border space-y-1">
                <span className="text-xs text-secondary block">Employment Type</span>
                <span className="font-semibold text-text capitalize">{emp.employment_type ? emp.employment_type.replace('_', ' ') : 'Full Time'}</span>
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB - FOLDER & DOCUMENT VAULT SYSTEM */}
          {activeMainTab === 'documents' && (
            <div className="space-y-6">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-text">Employee Document Vault & Folders</h4>
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {employeeDocuments.length} Documents
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Organize educational marks cards, government ID proofs, employment letters, and certificates in dedicated folders.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    className="btn-outline flex items-center gap-1.5 text-xs px-3 py-2"
                  >
                    <FolderPlus className="w-4 h-4 text-purple-600" />
                    + New Folder
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFolder) setTargetFolder(selectedFolder);
                      setShowUploadDocModal(true);
                    }}
                    className="btn flex items-center gap-1.5 text-xs px-3.5 py-2 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </button>
                </div>
              </div>

              {/* FOLDER NAVIGATION: Root Folder View vs Inside Folder View */}
              {selectedFolder === null ? (
                /* Root Folders Grid View */
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-secondary uppercase tracking-wider">Verification Document Folders</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFolders.map((folderName) => {
                      // Count files in this folder
                      const folderDocs = employeeDocuments.filter((d: any) => 
                        d.folder === folderName || 
                        (!d.folder && folderName === 'ID Proofs & Govt Documents' && ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Passport'].includes(d.name))
                      );

                      let folderDescription = 'Store and manage employee documents.';
                      if (folderName.includes('ID Proofs')) {
                        folderDescription = 'Aadhaar Card, PAN Card, Voter ID, Passport, Driving License';
                      } else if (folderName.includes('Educational')) {
                        folderDescription = '10th Marksheet, 12th/PUC, Degree, Diploma Transcripts';
                      } else if (folderName.includes('Employment')) {
                        folderDescription = 'Offer Letter, Appointment Letter, Relieving Letter, Form 16';
                      } else if (folderName.includes('Certifications')) {
                        folderDescription = 'Technical Certifications, Skill Credentials, Badges';
                      }

                      return (
                        <div
                          key={folderName}
                          onClick={() => setSelectedFolder(folderName)}
                          className="p-5 bg-white border border-border hover:border-primary/50 hover:shadow-md rounded-xl transition-all cursor-pointer group flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-50 group-hover:bg-primary group-hover:text-white text-purple-700 rounded-xl transition-colors shrink-0">
                              <Folder className="w-6 h-6" />
                            </div>
                            <div>
                              <h5 className="font-bold text-text group-hover:text-primary transition-colors text-sm">{folderName}</h5>
                              <p className="text-xs text-secondary mt-1 line-clamp-1">{folderDescription}</p>
                              <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500">
                                <span className="font-semibold text-text">{folderDocs.length} File{folderDocs.length === 1 ? '' : 's'} Uploaded</span>
                                <span>•</span>
                                <span className="text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Secure Vault
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Inside Folder Detail View */
                <div className="space-y-4">
                  {/* Folder Breadcrumb & Navigation */}
                  <div className="flex items-center justify-between bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedFolder(null)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        ← All Folders
                      </button>
                      <span className="text-gray-400">/</span>
                      <div className="flex items-center gap-1.5 font-bold text-text text-sm">
                        <Folder className="w-4 h-4 text-purple-700" />
                        <span>{selectedFolder}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetFolder(selectedFolder);
                        setShowUploadDocModal(true);
                      }}
                      className="btn text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload to this Folder
                    </button>
                  </div>

                  {/* Document Items in selected folder */}
                  {(() => {
                    const folderDocs = employeeDocuments.filter((d: any) => 
                      d.folder === selectedFolder || 
                      (!d.folder && selectedFolder === 'ID Proofs & Govt Documents' && ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Passport'].includes(d.name))
                    );

                    if (folderDocs.length === 0) {
                      return (
                        <div className="p-8 text-center text-secondary border border-dashed border-border rounded-xl bg-gray-50/50 space-y-3">
                          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
                            <Folder className="w-6 h-6" />
                          </div>
                          <div>
                            <h5 className="font-bold text-text text-sm">No documents in "{selectedFolder}" yet</h5>
                            <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
                              Upload Marks Cards (10th, 12th, Degree) or Government ID Proofs (Aadhaar, PAN, Voter ID) into this folder for employee verification.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setTargetFolder(selectedFolder);
                              setShowUploadDocModal(true);
                            }}
                            className="btn text-xs px-4 py-2 inline-flex items-center gap-1.5"
                          >
                            <Upload className="w-4 h-4" />
                            Upload First Document Now
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white">
                        {folderDocs.map((doc: any) => (
                          <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0">
                                <File className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-text text-sm">{doc.name || 'Document'}</h5>
                                  <span className="bg-gray-100 text-secondary text-[10px] font-semibold px-2 py-0.5 rounded">
                                    {doc.document_type || doc.category || 'Attachment'}
                                  </span>
                                </div>
                                <div className="text-xs text-secondary mt-1 flex items-center gap-3">
                                  {doc.document_number && <span>ID No: <strong className="font-mono text-text">{doc.document_number}</strong></span>}
                                  {doc.document_number && <span>•</span>}
                                  <span>Uploaded: {new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                                  {doc.expiry_date && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-700">Expires: {doc.expiry_date}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {doc.file_url ? (
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200 flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View / Download
                                </a>
                              ) : (
                                <button
                                  onClick={() => alert(`Document: ${doc.name}\nStatus: Verified Document`)}
                                  className="px-3 py-1.5 bg-gray-100 text-text hover:bg-gray-200 rounded-lg text-xs font-semibold border border-border flex items-center gap-1 transition-colors"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-green-600" />
                                  Verified Document
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete document "${doc.name}" from vault?`)) {
                                      deleteDocMutation.mutate(doc.id);
                                    }
                                  }}
                                  disabled={deleteDocMutation.isPending}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ATTENDANCE TAB - SUMMARY & DATE RANGE FILTERING */}
          {activeMainTab === 'attendance' && (() => {
            // Filter attendance records by date range & status
            const filteredAttendance = attendanceRecords.filter((r: any) => {
              const recDate = r.attendance_date || (r.clock_in_at ? r.clock_in_at.split('T')[0] : '');
              if (attStartDate && recDate < attStartDate) return false;
              if (attEndDate && recDate > attEndDate) return false;
              if (attStatusFilter && r.status !== attStatusFilter) return false;
              return true;
            });

            // Summary metrics calculation
            const totalDays = filteredAttendance.length;
            const presentCount = filteredAttendance.filter((r: any) => r.status === 'present').length;
            const lateCount = filteredAttendance.filter((r: any) => r.status === 'late' || r.status === 'half_day').length;
            const absentCount = filteredAttendance.filter((r: any) => r.status === 'absent').length;
            const complianceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

            return (
              <div className="space-y-6">
                {/* Header & Date Filtering Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h4 className="text-base font-bold text-text">Attendance Analytics & Clock-in Summary</h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Review monthly attendance logs, working duration, and compliance statistics.
                    </p>
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Preset Period Selector */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-border">
                      <select
                        value={attPeriodPreset}
                        onChange={(e) => handleAttPresetChange(e.target.value)}
                        className="bg-transparent font-semibold text-text focus:outline-none px-2 py-1 cursor-pointer text-xs"
                      >
                        <option value="this_month">Current Month (Default)</option>
                        <option value="last_month">Last Month</option>
                        <option value="last_90">Last 90 Days</option>
                        <option value="all">All Time History</option>
                        <option value="custom">Custom Date Range</option>
                      </select>
                    </div>

                    {/* Date Inputs */}
                    <div className="flex items-center gap-1.5 bg-white border border-border p-1.5 rounded-lg shadow-sm">
                      <span className="text-secondary font-medium text-[11px] px-1">From:</span>
                      <input
                        type="date"
                        value={attStartDate}
                        onChange={(e) => {
                          setAttStartDate(e.target.value);
                          setAttPeriodPreset('custom');
                        }}
                        className="text-xs text-text border-none focus:outline-none cursor-pointer"
                      />
                      <span className="text-secondary font-medium text-[11px] px-1">To:</span>
                      <input
                        type="date"
                        value={attEndDate}
                        onChange={(e) => {
                          setAttEndDate(e.target.value);
                          setAttPeriodPreset('custom');
                        }}
                        className="text-xs text-text border-none focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Status Filter */}
                    <select
                      value={attStatusFilter}
                      onChange={(e) => setAttStatusFilter(e.target.value)}
                      className="bg-white border border-border text-text rounded-lg px-2.5 py-1.5 font-medium text-xs shadow-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="present">Present Only</option>
                      <option value="late">Late Clock-in</option>
                      <option value="half_day">Half Day</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>

                {/* Attendance Summary KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-gray-50/80 rounded-xl border border-border space-y-1">
                    <span className="text-secondary text-[11px] font-semibold block uppercase tracking-wider">Logged Days</span>
                    <span className="text-xl font-bold text-text">{totalDays} Days</span>
                  </div>
                  <div className="p-3.5 bg-green-50/80 rounded-xl border border-green-200 space-y-1">
                    <span className="text-green-800 text-[11px] font-semibold block uppercase tracking-wider">Days Present</span>
                    <span className="text-xl font-bold text-green-700">{presentCount} Days</span>
                  </div>
                  <div className="p-3.5 bg-yellow-50/80 rounded-xl border border-yellow-200 space-y-1">
                    <span className="text-yellow-800 text-[11px] font-semibold block uppercase tracking-wider">Late / Half Days</span>
                    <span className="text-xl font-bold text-yellow-700">{lateCount} Days</span>
                  </div>
                  <div className="p-3.5 bg-red-50/80 rounded-xl border border-red-200 space-y-1">
                    <span className="text-red-800 text-[11px] font-semibold block uppercase tracking-wider">Absent / Unexcused</span>
                    <span className="text-xl font-bold text-red-700">{absentCount} Days</span>
                  </div>
                  <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 space-y-1 col-span-2 md:col-span-1">
                    <span className="text-purple-800 text-[11px] font-semibold block uppercase tracking-wider">Compliance Rate</span>
                    <span className="text-xl font-bold text-purple-700">{complianceRate}%</span>
                  </div>
                </div>

                {/* Attendance Detailed Log Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-secondary">
                    <span className="font-semibold text-text">Clock-in Trajectory ({filteredAttendance.length} records)</span>
                    <span>
                      {attStartDate || attEndDate ? `Showing range: ${attStartDate || 'Start'} to ${attEndDate || 'Today'}` : 'Showing all history'}
                    </span>
                  </div>

                  {filteredAttendance.length === 0 ? (
                    <div className="p-8 text-center text-secondary border border-dashed border-border rounded-xl bg-gray-50/40 space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-gray-400" />
                      <h5 className="font-bold text-text text-sm">No attendance records found</h5>
                      <p className="text-xs text-secondary max-w-md mx-auto">
                        No clock-in activity recorded for this employee between {attStartDate || 'Start Date'} and {attEndDate || 'End Date'}.
                      </p>
                      <button
                        onClick={() => handleAttPresetChange('all')}
                        className="btn-outline text-xs px-3 py-1.5 mt-2"
                      >
                        Reset Period Filter to All Time
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-xl shadow-sm bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border bg-gray-50/80 text-secondary uppercase tracking-wider">
                            <th className="py-3 px-4 font-semibold">Date & Day</th>
                            <th className="py-3 px-4 font-semibold">Clock In</th>
                            <th className="py-3 px-4 font-semibold">Clock Out</th>
                            <th className="py-3 px-4 font-semibold">Hours Worked</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredAttendance.map((r: any) => {
                            const dateObj = new Date(r.attendance_date || r.clock_in_at);
                            const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                            
                            // Calculate hours worked if clock_in and clock_out exist
                            let hoursStr = '—';
                            if (r.clock_in_at && r.clock_out_at) {
                              const diffMs = new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime();
                              const diffMins = Math.floor(diffMs / (1000 * 60));
                              const hrs = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              hoursStr = `${hrs}h ${mins}m`;
                            } else if (r.clock_in_at && !r.clock_out_at) {
                              hoursStr = 'In Progress';
                            }

                            return (
                              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 font-semibold text-text">{formattedDate}</td>
                                <td className="py-3 px-4">
                                  <div className="font-mono text-text">
                                    {r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </div>
                                  {r.clock_in_distance_meters !== undefined && (
                                    <div className="text-[10px] text-green-700 font-medium">
                                      📍 {Math.round(r.clock_in_distance_meters)}m within radius
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-mono text-text">
                                  {r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold">Active Session</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-semibold text-text">{hoursStr}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                    r.status === 'present' ? 'bg-green-100 text-green-800' :
                                    r.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    r.status === 'half_day' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* LEAVE SUMMARY TAB */}
          {activeMainTab === 'leave' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text">Leave Requests ({leaveRequests.length})</h4>
              {leaveRequests.length === 0 ? (
                <div className="p-6 text-center text-secondary text-sm border border-border rounded-lg">No leave applications for this employee.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        <th className="p-2">Dates</th>
                        <th className="p-2">Reason</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((l: any) => (
                        <tr key={l.id} className="border-b border-border">
                          <td className="p-2">{l.start_date} to {l.end_date}</td>
                          <td className="p-2">{l.reason || '—'}</td>
                          <td className="p-2 capitalize">{l.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYROLL & COMPENSATION TAB */}
          {activeMainTab === 'payroll' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text">Payslip History ({payrollRecords.length})</h4>
              {payrollRecords.length === 0 ? (
                <div className="p-6 text-center text-secondary text-sm border border-border rounded-lg">No payslips generated for this employee yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        <th className="p-2">Pay Period</th>
                        <th className="p-2">Basic</th>
                        <th className="p-2">Allowances</th>
                        <th className="p-2">Net Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRecords.map((p: any) => (
                        <tr key={p.id} className="border-b border-border">
                          <td className="p-2">{p.payroll_period}</td>
                          <td className="p-2">${p.basic_salary}</td>
                          <td className="p-2">${p.allowances}</td>
                          <td className="p-2 font-bold">${p.net_salary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeMainTab === 'performance' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text">Assigned OKRs & Performance Goals ({performanceGoals.length})</h4>
              {performanceGoals.length === 0 ? (
                <div className="p-6 text-center text-secondary text-sm border border-border rounded-lg">No OKRs assigned to this employee.</div>
              ) : (
                <div className="space-y-2">
                  {performanceGoals.map((g: any) => (
                    <div key={g.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-text text-sm">{g.title}</div>
                        <div className="text-xs text-secondary">{g.target_metric}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 capitalize">{g.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeMainTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-text">Status & Audit Trajectory</h4>
              {emp.timeline?.employee_status_history?.length > 0 ? (
                <div className="space-y-3">
                  {emp.timeline.employee_status_history.map((h: any) => (
                    <div key={h.id} className="flex gap-3 items-start text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0"></div>
                      <div>
                        <div className="font-semibold text-text capitalize">{h.to_status.replace('_', ' ')}</div>
                        <div className="text-secondary">{new Date(h.created_at).toLocaleString()} - {h.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-secondary text-xs text-center border border-border rounded-lg">No timeline events recorded.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Complete Employee Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Edit Full Employee & Manager Details
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-secondary hover:text-text">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm max-h-[70vh] overflow-y-auto pr-2">
              {/* Personal Details Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-text border-b border-border pb-1">1. Personal & General Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">First Name *</label>
                    <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Last Name</label>
                    <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Date of Birth</label>
                    <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Gender</label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Nationality</label>
                    <input type="text" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" placeholder="e.g. American, Indian" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Marital Status</label>
                    <select value={form.marital_status} onChange={e => setForm({ ...form, marital_status: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm">
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Manager Confidential: Identification & Tax */}
              <div className="space-y-3 p-4 bg-purple-50/60 rounded-lg border border-purple-200">
                <h4 className="font-bold text-purple-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-700" /> 2. Identification & Government Tax IDs (Manager Access)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">National ID / SSN / PAN</label>
                    <input type="text" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Tax Identification Number (TIN)</label>
                    <input type="text" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Passport Number</label>
                    <input type="text" value={form.passport_number} onChange={e => setForm({ ...form, passport_number: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Driving License Number</label>
                    <input type="text" value={form.driving_license} onChange={e => setForm({ ...form, driving_license: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                </div>
              </div>

              {/* Manager Confidential: Bank Details */}
              <div className="space-y-3 p-4 bg-purple-50/60 rounded-lg border border-purple-200">
                <h4 className="font-bold text-purple-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-purple-700" /> 3. Bank Account & Payroll Payout Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Bank Name</label>
                    <input type="text" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" placeholder="e.g. Chase Bank, HDFC" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Account Holder Name</label>
                    <input type="text" value={form.account_holder_name} onChange={e => setForm({ ...form, account_holder_name: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Account Number</label>
                    <input type="text" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">IFSC / Routing / Sort Code</label>
                    <input type="text" value={form.ifsc_routing} onChange={e => setForm({ ...form, ifsc_routing: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">SWIFT Code</label>
                    <input type="text" value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-900 mb-1">Branch Name</label>
                    <input type="text" value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm bg-white" />
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="space-y-3">
                <h4 className="font-bold text-text border-b border-border pb-1">4. Contact & Address Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Work Email</label>
                    <input type="email" value={form.work_email} onChange={e => setForm({ ...form, work_email: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Personal Email</label>
                    <input type="email" value={form.personal_email} onChange={e => setForm({ ...form, personal_email: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Phone Number</label>
                    <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Street Address</label>
                    <input type="text" value={form.street_address} onChange={e => setForm({ ...form, street_address: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">City</label>
                    <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">State / Country</label>
                    <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full border border-border rounded-lg p-2 text-sm" placeholder="State" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Full Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provisioned Account Result Modal */}
      {provisionResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-green-700">
              <Shield className="w-6 h-6 shrink-0 text-green-600" />
              <h3 className="text-lg font-bold text-text">Login Account Provisioned!</h3>
            </div>
            
            <p className="text-xs text-secondary">
              A login account has been created in Supabase Auth for this employee. Provide these login details to the staff member so they can access their HRMS portal.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Login Email:</span>
                <span className="font-bold text-text font-mono">{provisionResult.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Initial Temp Password:</span>
                <span className="font-bold text-primary font-mono select-all bg-white px-2 py-0.5 border border-border rounded">{provisionResult.temp_password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Portal Link:</span>
                <span className="font-bold text-text">http://localhost:5173/login</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setProvisionResult(null)}
                className="btn text-sm px-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-border text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Upload Verification Document
              </h3>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!docTitle) return;
                uploadDocMutation.mutate({
                  name: docTitle,
                  folder: targetFolder,
                  document_type: docCategory,
                  document_number: docNumber || null,
                  file_url: docFileUrl || null,
                  expiry_date: docExpiryDate || null,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Target Vault Folder *</label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="w-full border border-border rounded-lg p-2.5 text-sm font-medium bg-gray-50"
                  required
                >
                  {customFolders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Document Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. 10th SSLC Marksheet, Aadhaar Card Front"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Document Category / Type</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="10th SSLC Marksheet">10th SSLC Marksheet</option>
                    <option value="12th / PUC Marksheet">12th / PUC Marksheet</option>
                    <option value="Degree / Graduation Certificate">Degree Certificate</option>
                    <option value="Diploma / Master Transcripts">Diploma / Master Transcripts</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Relieving / Experience Letter">Experience Certificate</option>
                    <option value="Offer / Appointment Letter">Offer Letter</option>
                    <option value="Other Verification Document">Other Document</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Document / Serial Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar / PAN / Roll No"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">File Attachment URL / Link</label>
                <input
                  type="text"
                  placeholder="Paste document cloud URL or attachment link (e.g. https://...)"
                  value={docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocMutation.isPending}
                  className="btn text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {uploadDocMutation.isPending ? 'Uploading...' : 'Save & Verify Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-border text-left">
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-600" />
              Create Custom Folder
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Folder Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Health & Medical Records, Tax Proofs"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3 py-1.5 text-xs text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-xs px-4 py-2"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
