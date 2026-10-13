import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { 
  Building2, Users, Shield, Plus, Search, ExternalLink, 
  CheckCircle2, Ban, Sparkles, RefreshCw, Globe, ArrowRight,
  TrendingUp, Activity, Clock
} from 'lucide-react';

export default function SystemAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setOrg } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Organization Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newTimezone, setNewTimezone] = useState('Asia/Kolkata');
  const [newCurrency, setNewCurrency] = useState('INR');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch Platform Overview Stats
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['superAdminOverview'],
    queryFn: () => api('/api/super-admin/overview'),
  });

  // 2. Fetch All Organizations
  const { data: organizations = [], isLoading: loadingOrgs, refetch: refetchOrgs } = useQuery({
    queryKey: ['superAdminOrganizations'],
    queryFn: () => api('/api/super-admin/organizations'),
  });

  // 3. Create Organization Mutation
  const createOrgMutation = useMutation({
    mutationFn: (payload: any) =>
      api('/api/super-admin/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ['superAdminOrganizations'] });
      queryClient.invalidateQueries({ queryKey: ['superAdminOverview'] });
      queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
      setShowCreateModal(false);
      setNewOrgName('');
      setNewLegalName('');
      setNewOwnerEmail('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create organization');
    },
  });

  // 4. Toggle Organization Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ orgId, newStatus }: { orgId: string; newStatus: string }) =>
      api(`/api/super-admin/organizations/${orgId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminOrganizations'] });
      queryClient.invalidateQueries({ queryKey: ['superAdminOverview'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update organization status');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setFormError('Organization name is required');
      return;
    }
    createOrgMutation.mutate({
      name: newOrgName.trim(),
      legal_name: newLegalName.trim() || newOrgName.trim(),
      timezone: newTimezone,
      currency: newCurrency,
      owner_email: newOwnerEmail.trim() || undefined,
    });
  };

  const handleEnterWorkspace = (org: any) => {
    setOrg(org.id, org.name);
    navigate('/');
  };

  const filteredOrgs = organizations.filter((org: any) => {
    const matchesSearch =
      (org.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (org.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (org.owner_email || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && org.status !== 'suspended') ||
      (statusFilter === 'suspended' && org.status === 'suspended');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Platform Header */}
      <div className="bg-gradient-to-r from-[#141414] via-[#1F1424] to-[#141414] border border-white/10 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-[#A00142]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-10 w-60 h-60 bg-[#3843C1]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <span>👑</span>
              <span>System Owner Platform Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
              <span className="text-[10px] text-emerald-400">Multi-Tenancy Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Multi-Organization Management Center
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Inspect, control, and onboard all corporate client workspaces across the entire platform. As the System Owner, you have full god-mode governance over all tenants.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => refetchOrgs()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Refresh Platform Directory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#A00142] to-[#710171] hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#A00142]/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Organization
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <div className="card p-5 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Organizations</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#080809]">
            {loadingOverview ? '...' : overview?.total_organizations ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
            <Globe className="w-3.5 h-3.5 text-purple-600" />
            Active platform tenant accounts
          </div>
        </div>

        {/* Total Workforce */}
        <div className="card p-5 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Global Workforce</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#080809]">
            {loadingOverview ? '...' : overview?.total_workforce ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            Employees across all organizations
          </div>
        </div>

        {/* Total Users */}
        <div className="card p-5 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Registered Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#080809]">
            {loadingOverview ? '...' : overview?.total_users ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Authenticated portal logins
          </div>
        </div>

        {/* Platform Approvals */}
        <div className="card p-5 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pending Approvals</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#080809]">
            {loadingOverview ? '...' : overview?.total_pending_leaves ?? 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Leave requests across tenancies
          </div>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="card p-6 bg-white border border-gray-100 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#080809]">Tenant Organizations Directory</h2>
            <p className="text-xs text-gray-500">
              Browse, monitor, and switch into any client company workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizations or owners..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl w-64 focus:outline-none focus:border-[#A00142]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#A00142]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 rounded-l-xl">Organization</th>
                <th className="py-3 px-4">Primary Owner</th>
                <th className="py-3 px-4">Workforce</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingOrgs ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A00142]" />
                    Loading platform organizations...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No organizations match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org: any) => {
                  const isSuspended = org.status === 'suspended';
                  return (
                    <tr key={org.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A00142] to-[#3843C1] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {org.name?.charAt(0)?.toUpperCase() || 'O'}
                          </div>
                          <div>
                            <div className="font-bold text-[#080809] text-sm hover:text-[#A00142] cursor-pointer" onClick={() => handleEnterWorkspace(org)}>
                              {org.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]" title={org.id}>
                              ID: {org.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {org.owner_email ? (
                          <div>
                            <div className="font-semibold text-gray-800">{org.owner_name || 'Organization Owner'}</div>
                            <div className="text-[11px] text-gray-500 font-mono">{org.owner_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Self-Managed</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">
                          {org.employee_count} Employees
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">
                        {org.member_count} Accounts
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-500">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEnterWorkspace(org)}
                            className="px-3 py-1.5 bg-[#A00142] hover:bg-[#850137] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            title="Enter and manage this organization workspace"
                          >
                            <span>Enter Workspace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                orgId: org.id,
                                newStatus: isSuspended ? 'active' : 'suspended',
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              isSuspended
                                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                : 'border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50'
                            }`}
                            title={isSuspended ? 'Reactivate Organization' : 'Suspend Organization'}
                          >
                            {isSuspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#A00142] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#080809]">Onboard New Organization</h3>
                  <p className="text-xs text-gray-500">Create a dedicated company workspace for a new tenant.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Software Solutions"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Legal Entity Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Nexus Software Solutions Private Limited"
                  value={newLegalName}
                  onChange={(e) => setNewLegalName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Timezone</label>
                  <select
                    value={newTimezone}
                    onChange={(e) => setNewTimezone(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Owner Email (Optional)</label>
                <input
                  type="email"
                  placeholder="client.owner@company.com"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  className="input text-xs"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  If this user already exists, they will automatically receive owner rights to this new workspace.
                </p>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrgMutation.isPending || !newOrgName.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-[#A00142] to-[#710171] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {createOrgMutation.isPending ? 'Provisioning...' : 'Provision Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
