import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { FolderKanban, Plus, Users, UserPlus, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function Projects() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showProjModal, setShowProjModal] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');

  const [selectedProjId, setSelectedProjId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [allocationPct, setAllocationPct] = useState('100');
  const [submitError, setSubmitError] = useState('');
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);

  // User session & role evaluation
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });
  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: projects = [], isLoading: loadingProj } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => api(`/api/projects?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['project_allocations', orgId],
    queryFn: () => api(`/api/project_allocations?org_id=${orgId}`),
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

  // Displayed projects: Managers/Admins see all; Regular employees see only projects they are allocated to
  const displayedProjects = isManagerOrAdmin
    ? projects
    : projects.filter((proj: any) =>
        allocations.some((a: any) => a.project_id === proj.id && a.employee_id === myEmp?.id)
      );

  const createProjMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      setShowProjModal(false);
      setName('');
      setClient('');
      setDescription('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to create project');
    }
  });

  const createAllocMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/project_allocations', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_allocations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', orgId] });
      setShowAllocModal(false);
      setSelectedProjId('');
      setEmployeeId('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to allocate member');
    }
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can create projects.');
      return;
    }
    createProjMutation.mutate({
      name,
      client_name: client,
      description,
      status: 'active',
    });
  };

  const handleCreateAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId || !employeeId) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can assign project members.');
      return;
    }
    createAllocMutation.mutate({
      project_id: selectedProjId,
      employee_id: employeeId,
      allocation_percentage: parseInt(allocationPct) || 100,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Projects & Allocation</h2>
          <p className="text-sm text-secondary">
            {isManagerOrAdmin
              ? 'Manage client projects, deliverables, and team bandwidth.'
              : 'View projects assigned to your team and allocation details.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isManagerOrAdmin ? (
            <>
              <button
                onClick={() => {
                  setSubmitError('');
                  setShowAllocModal(true);
                }}
                className="btn bg-gray-100 text-text hover:bg-gray-200 border border-border flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Assign Member
              </button>
              <button
                onClick={() => {
                  setSubmitError('');
                  setShowProjModal(true);
                }}
                className="btn flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </>
          ) : (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold border border-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Staff View (Management Restricted)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingProj ? (
          <div className="card md:col-span-2 py-8 text-center text-secondary">Loading projects...</div>
        ) : displayedProjects.length === 0 ? (
          <div className="card md:col-span-2 py-12 text-center text-secondary space-y-3">
            <FolderKanban className="w-10 h-10 mx-auto text-gray-400" />
            <div className="text-sm font-semibold text-text">
              {isManagerOrAdmin
                ? 'No active projects created yet.'
                : 'You are not currently assigned to any active projects.'}
            </div>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {isManagerOrAdmin
                ? 'Click "New Project" above to create client or internal deliverables.'
                : 'Contact your Manager or HR Administrator to be assigned to active client projects.'}
            </p>
            {isManagerOrAdmin && (
              <button
                onClick={() => setShowProjModal(true)}
                className="btn text-xs font-semibold mt-2"
              >
                Create First Project
              </button>
            )}
          </div>
        ) : (
          displayedProjects.map((proj: any) => {
            const projAllocations = allocations.filter((a: any) => a.project_id === proj.id);
            const myAlloc = allocations.find((a: any) => a.project_id === proj.id && a.employee_id === myEmp?.id);

            return (
              <div key={proj.id} className="card space-y-4 relative border border-border hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-text flex items-center gap-2">
                      {proj.name}
                      {myAlloc && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle2 className="w-3 h-3 text-green-600" /> Assigned to You ({myAlloc.allocation_percentage || 100}%)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-secondary">{proj.client_name ? `Client: ${proj.client_name}` : 'Internal Project'}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                    {proj.status || 'active'}
                  </span>
                </div>
                <p className="text-sm text-secondary line-clamp-2">{proj.description || 'No description provided.'}</p>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-secondary uppercase mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Team Allocated ({projAllocations.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {projAllocations.map((alloc: any) => {
                      const emp = employees.find((e: any) => e.id === alloc.employee_id);
                      const isMe = myEmp && alloc.employee_id === myEmp.id;
                      return (
                        <span
                          key={alloc.id}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 border ${
                            isMe
                              ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold'
                              : 'bg-gray-100 text-text border-gray-200 font-medium'
                          }`}
                        >
                          <span>{emp ? `${emp.first_name} ${emp.last_name || ''}` : alloc.employee_id}</span>
                          <span className={isMe ? 'text-purple-700 font-bold' : 'text-gray-400'}>
                            ({alloc.allocation_percentage || 100}%)
                          </span>
                        </span>
                      );
                    })}
                    {projAllocations.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No team members assigned yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showProjModal && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Create Project</h3>
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Project Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Client Name</label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowProjModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjMutation.isPending}
                  className="btn text-sm font-semibold px-4 py-2"
                >
                  {createProjMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAllocModal && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Assign Team Member</h3>
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleCreateAllocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Project *</label>
                <select
                  value={selectedProjId}
                  onChange={(e) => setSelectedProjId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Employee *</label>
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
                <label className="block text-sm font-medium text-text mb-1">Allocation (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAllocModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAllocMutation.isPending}
                  className="btn text-sm font-semibold px-4 py-2"
                >
                  {createAllocMutation.isPending ? 'Assigning...' : 'Assign Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
