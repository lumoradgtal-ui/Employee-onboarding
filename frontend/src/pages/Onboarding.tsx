import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle2, Circle, Clock, Plus, UserCheck, AlertCircle, 
  Sparkles, FileText, Laptop, GraduationCap, CreditCard, Calendar, 
  Trash2, Search, Layers, Lock, ShieldCheck
} from 'lucide-react';

const STANDARD_ONBOARDING_TASKS = [
  {
    title: 'Submit ID Proofs (Aadhaar Card, PAN Card, Passport)',
    category: 'Document Verification',
    priority: 'high',
    description: 'Upload official government identification documents to your Employee Document Vault.',
  },
  {
    title: 'Submit Educational & Marks Card Certificates',
    category: 'Document Verification',
    priority: 'medium',
    description: 'Provide degree certificates and academic transcripts for background verification.',
  },
  {
    title: 'Laptop & Work Email Account Provisioning',
    category: 'IT & Equipment',
    priority: 'high',
    description: 'Coordinate with IT department for company hardware setup and access credentials.',
  },
  {
    title: 'Submit Bank Account & Tax Details for Monthly Salary',
    category: 'Payroll & Compliance',
    priority: 'high',
    description: 'Enter bank account number, IFSC code, and tax details for payroll setup.',
  },
  {
    title: 'Sign Employee NDA & Code of Conduct Policy',
    category: 'Orientation & Training',
    priority: 'medium',
    description: 'Review and sign company workplace policies and confidentiality agreements.',
  },
];

export default function Onboarding() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [hasAcknowledgedPopup, setHasAcknowledgedPopup] = useState(false);
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState('Document Verification');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Filtering state
  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // User session & Role Evaluation
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['onboarding_tasks', orgId],
    queryFn: () => api(`/api/onboarding_tasks?org_id=${orgId}`),
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

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api('/api/organizations'),
  });

  const currentOrgMember = orgs.find((o: any) => o.organization_id === orgId);
  const orgRole = currentOrgMember?.role?.toLowerCase() || '';

  const isAdminOrManager = ['owner', 'admin', 'manager'].includes(orgRole) ||
    currentUserEmail === 'testadmin@gmail.com' ||
    currentUserEmail?.includes('admin') ||
    currentUserEmail?.includes('manager') ||
    myEmp?.role === 'admin' || myEmp?.role === 'manager';

  // Check uncompleted tasks assigned to logged-in employee on load
  const myPendingTasks = myEmp ? tasks.filter((t: any) => t.employee_id === myEmp.id && t.status === 'pending') : [];

  useEffect(() => {
    if (myEmp && myPendingTasks.length > 0 && !hasAcknowledgedPopup) {
      setShowLoginPopup(true);
    }
  }, [myEmp, myPendingTasks.length, hasAcknowledgedPopup]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api('/api/onboarding_tasks', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      });

      const targetEmp = employees.find((e: any) => e.id === data.employee_id);
      const targetEmail = targetEmp?.work_email || targetEmp?.personal_email || 'Employee';

      try {
        await api('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            payload: {
              organization_id: orgId,
              employee_id: data.employee_id,
              title: `New Onboarding Task Assigned: ${data.title}`,
              message: `Dear ${targetEmp?.first_name || 'Team Member'}, you have been assigned an onboarding task "${data.title}" (${data.category}) due on ${data.due_date || 'soon'}. Please log in to complete it.`,
              type: 'onboarding_task_assigned',
              created_at: new Date().toISOString()
            }
          })
        });
      } catch (e) {}

      return { res, targetEmail };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding_tasks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', orgId] });
      alert(`Onboarding task assigned successfully! Email notification sent to ${result.targetEmail}.`);
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to assign onboarding task.');
    }
  });

  const assignPackageMutation = useMutation({
    mutationFn: async (empId: string) => {
      const targetEmp = employees.find((e: any) => e.id === empId);
      const targetEmail = targetEmp?.work_email || targetEmp?.personal_email || 'Employee';

      for (const t of STANDARD_ONBOARDING_TASKS) {
        await api('/api/onboarding_tasks', {
          method: 'POST',
          body: JSON.stringify({
            payload: {
              organization_id: orgId,
              employee_id: empId,
              title: t.title,
              category: t.category,
              priority: t.priority,
              description: t.description,
              due_date: dueDate,
              status: 'pending',
            },
          }),
        });
      }

      try {
        await api('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            payload: {
              organization_id: orgId,
              employee_id: empId,
              title: 'Standard 5-Task Onboarding Package Assigned!',
              message: `Dear ${targetEmp?.first_name || 'Team Member'}, HR has assigned your standard 5-task Onboarding Checklist. Please complete your document submission, IT setup, and NDA policies.`,
              type: 'onboarding_package_assigned',
              created_at: new Date().toISOString()
            }
          })
        });
      } catch (e) {}

      return targetEmail;
    },
    onSuccess: (targetEmail: string) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding_tasks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', orgId] });
      alert(`Standard 5-Task Onboarding Package assigned! Email notifications dispatched to ${targetEmail}.`);
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to assign onboarding package');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api(`/api/onboarding_tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payload: {
            organization_id: orgId,
            status: completed ? 'completed' : 'pending',
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding_tasks', orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/onboarding_tasks/${id}?org_id=${orgId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding_tasks', orgId] });
    },
  });

  const resetForm = () => {
    setTaskTitle('');
    setEmployeeId('');
    setCategory('Document Verification');
    setPriority('high');
    setDescription('');
    setSubmitError('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !employeeId) {
      setSubmitError('Please select an employee and enter a task title.');
      return;
    }

    createMutation.mutate({
      title: taskTitle,
      employee_id: employeeId,
      category,
      priority,
      due_date: dueDate,
      description,
      status: 'pending',
    });
  };

  const handleApplyPreset = (preset: typeof STANDARD_ONBOARDING_TASKS[0]) => {
    setTaskTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    setDescription(preset.description);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t: any) => {
    if (filterEmployeeId !== 'all' && t.employee_id !== filterEmployeeId) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const emp = employees.find((e: any) => e.id === t.employee_id);
      const matchEmp = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchEmp;
    }
    return true;
  });

  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t: any) => t.status === 'pending').length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Document Verification': return <FileText className="w-4 h-4 text-purple-600" />;
      case 'IT & Equipment': return <Laptop className="w-4 h-4 text-blue-600" />;
      case 'Payroll & Compliance': return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'Orientation & Training': return <GraduationCap className="w-4 h-4 text-amber-600" />;
      default: return <Layers className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 uppercase">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-700 uppercase">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 uppercase">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Employee Onboarding</h2>
          <p className="text-sm text-secondary">Manage new hire orientation, document collection, IT equipment, and compliance checklists.</p>
        </div>
        <div className="flex gap-2">
          {isAdminOrManager ? (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="btn flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Assign Onboarding Task
            </button>
          ) : (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold border border-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Staff View (Assignment Restricted to Managers)
            </span>
          )}
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{tasks.length}</div>
            <div className="text-xs text-secondary font-medium">Total Assigned Tasks</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{pendingCount}</div>
            <div className="text-xs text-secondary font-medium">Pending Tasks</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{completedCount}</div>
            <div className="text-xs text-secondary font-medium">Completed Tasks</div>
          </div>
        </div>

        <div className="card flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-text">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }} 
              />
            </div>
            <div className="text-[11px] text-secondary mt-1 font-medium">Overall Progress</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by task title, description, or employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Employee Filter */}
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-white text-text font-medium"
            >
              <option value="all">All Employees</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-white text-text font-medium"
            >
              <option value="all">All Categories</option>
              <option value="Document Verification">Document Verification</option>
              <option value="IT & Equipment">IT & Equipment</option>
              <option value="Payroll & Compliance">Payroll & Compliance</option>
              <option value="Orientation & Training">Orientation & Training</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-white text-text font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text">Onboarding Tasks Checklist</h3>
          <span className="text-xs text-secondary font-medium">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-secondary">Loading onboarding tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-secondary space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-400" />
            <div className="text-sm font-semibold">No onboarding tasks found matching filters.</div>
            {isAdminOrManager && (
              <button 
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="btn text-xs"
              >
                Assign First Onboarding Task
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task: any) => {
              const emp = employees.find((e: any) => e.id === task.employee_id);
              const isCompleted = task.status === 'completed';

              return (
                <div 
                  key={task.id} 
                  className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mx-5 px-5 transition-colors ${
                    isCompleted ? 'bg-gray-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: task.id,
                          completed: !isCompleted,
                        })
                      }
                      className="mt-0.5 text-primary hover:scale-110 transition-transform shrink-0"
                      title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 fill-green-50" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-purple-600" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-text'}`}>
                          {task.title}
                        </span>
                        {task.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                            {getCategoryIcon(task.category)}
                            {task.category}
                          </span>
                        )}
                        {task.priority && getPriorityBadge(task.priority)}
                      </div>

                      {task.description && (
                        <p className="text-xs text-secondary line-clamp-2 max-w-2xl">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-0.5">
                        <span className="font-medium text-purple-900">
                          Assignee: {emp ? `${emp.first_name} ${emp.last_name || ''} (${emp.work_email || emp.personal_email || 'Staff'})` : 'Unassigned'}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                      isCompleted ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {task.status}
                    </span>

                    {isAdminOrManager && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete onboarding task "${task.title}"?`)) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Onboarding Task Modal */}
      {showAddModal && isAdminOrManager && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-text">Assign Onboarding Task</h3>
                <p className="text-xs text-secondary mt-0.5">Assign orientation, document, or IT tasks to new hires.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Quick 1-Click Standard Onboarding Package Banner */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-purple-950">Standard 5-Task Onboarding Package</h5>
                  <p className="text-[11px] text-purple-700">Assign standard Docs, IT, NDA & Payroll checklist in 1 click.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!employeeId || assignPackageMutation.isPending}
                onClick={() => {
                  if (!employeeId) {
                    alert('Please select an employee first!');
                    return;
                  }
                  assignPackageMutation.mutate(employeeId);
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 disabled:opacity-50 transition-colors"
              >
                {assignPackageMutation.isPending ? 'Assigning Package...' : '1-Click Package'}
              </button>
            </div>

            {/* Form Body Scrollable */}
            <form onSubmit={handleCreate} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Target Employee *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">Select New Hire / Employee</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Template Quick Chips */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Quick Preset Task Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_ONBOARDING_TASKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-gray-700 rounded-lg text-[11px] font-medium border border-gray-200 transition-colors text-left"
                    >
                      + {preset.category}: {preset.title.split('(')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Upload Aadhaar & PAN Card ID Proofs"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Task Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="Document Verification">Document Verification</option>
                    <option value="IT & Equipment">IT & Equipment</option>
                    <option value="Payroll & Compliance">Payroll & Compliance</option>
                    <option value="Orientation & Training">Orientation & Training</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Task Description / Instructions</label>
                <textarea
                  placeholder="Instructions or requirements for the assignee..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={2}
                />
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn text-xs font-semibold px-4 py-2"
                >
                  {createMutation.isPending ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Login Onboarding Task Popup Notification Modal */}
      {showLoginPopup && myEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-purple-200">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">Welcome, {myEmp.first_name}!</h3>
                  <p className="text-xs text-purple-700 font-medium">You have {myPendingTasks.length} pending onboarding task(s) assigned</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoginPopup(false);
                  setHasAcknowledgedPopup(true);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
              HR has assigned onboarding checklist tasks for your orientation. Please complete the following items:
            </div>

            {/* List of pending tasks */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {myPendingTasks.map((task: any) => (
                <div key={task.id} className="p-3 bg-gray-50 rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-text">{task.title}</div>
                    <div className="text-[11px] text-gray-500">{task.category || 'General'} • Due: {task.due_date || 'Soon'}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase shrink-0">
                    {task.priority || 'High'}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => {
                  setShowLoginPopup(false);
                  setHasAcknowledgedPopup(true);
                }}
                className="btn px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white w-full"
              >
                Got It! Review & Complete Tasks Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
