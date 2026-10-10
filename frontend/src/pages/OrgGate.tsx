import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Building2, Plus, LogOut, CheckCircle2, Shield, UserCheck, Sparkles } from 'lucide-react';

export default function OrgGate({ children }: { children: React.ReactNode }) {
  const { orgId, setOrg } = useAppStore();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const data = await api('/api/organizations');
      setOrgs(data);

      // Automatic Organization Selection on Login
      if (!orgId && data && data.length > 0) {
        const lastPortal = localStorage.getItem('hrms_last_portal');
        const savedOrgId = localStorage.getItem('hrms_org');

        // 1. If previously selected valid org exists, auto-select
        const savedOrg = data.find((o: any) => o.organization_id === savedOrgId);
        if (savedOrg) {
          setOrg(savedOrg.organization_id, savedOrg.organizations.name);
          navigate('/');
          return;
        }

        // 2. If logged in via Employee Login portal, auto-select employee workspace
        if (lastPortal === 'employee') {
          const empOrg = data.find((o: any) => (o.role || '').toLowerCase() === 'employee') || data[0];
          setOrg(empOrg.organization_id, empOrg.organizations.name);
          navigate('/');
          return;
        }

        // 3. If logged in via Organization Login portal, auto-select admin/owner workspace
        if (lastPortal === 'organization') {
          const adminOrg = data.find((o: any) => ['owner', 'admin', 'hr', 'manager'].includes((o.role || '').toLowerCase())) || data[0];
          setOrg(adminOrg.organization_id, adminOrg.organizations.name);
          navigate('/');
          return;
        }

        // 4. Default: auto-select first available organization workspace
        setOrg(data[0].organization_id, data[0].organizations.name);
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const org = await api('/api/setup/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setOrg(org.id, org.name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-lg animate-pulse">
          <Sparkles className="w-5 h-5 text-[#A00142]" />
          <span className="text-sm font-semibold text-[#080809]">Loading your HRMS workspace...</span>
        </div>
      </div>
    );
  }

  if (orgId) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative CypherSwift Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#A00142]/15 to-[#3843C1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tl from-[#3843C1]/15 to-[#A00142]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full space-y-6 bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-100 relative z-10">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A00142] to-[#3843C1] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#080809] tracking-tight">
            {orgs.length > 0 ? 'Select Your Organization' : 'Create Organization Workspace'}
          </h2>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            {orgs.length > 0
              ? `You belong to ${orgs.length} organization workspace${orgs.length > 1 ? 's' : ''}. Select one to enter.`
              : 'Setup your company workspace to get started.'}
          </p>
        </div>

        {/* Existing Organizations Workspace Cards */}
        {orgs.length > 0 && !showCreateForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
              {orgs.map((o) => {
                const roleName = o.role || 'Member';
                const isOwnerOrAdmin = ['owner', 'admin', 'hr', 'manager'].includes(roleName.toLowerCase());

                return (
                  <button
                    key={o.organization_id}
                    onClick={() => {
                      setOrg(o.organization_id, o.organizations.name);
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#A00142] hover:bg-[#FCE8EE]/30 transition-all duration-200 group text-left shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-[#A00142] group-hover:text-white text-gray-700 flex items-center justify-center font-bold text-sm transition-colors">
                        {o.organizations.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#080809] group-hover:text-[#A00142] transition-colors">
                          {o.organizations.name}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                          {isOwnerOrAdmin ? <Shield className="w-3.5 h-3.5 text-[#A00142]" /> : <UserCheck className="w-3.5 h-3.5 text-[#3843C1]" />}
                          {roleName.toUpperCase()} Workspace
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isOwnerOrAdmin ? 'bg-[#A00142]/10 text-[#A00142]' : 'bg-[#3843C1]/10 text-[#3843C1]'
                      }`}>
                        {roleName}
                      </span>
                      <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-[#A00142] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 px-4 border border-dashed border-[#A00142]/40 rounded-xl text-xs font-bold text-[#A00142] hover:bg-[#FCE8EE]/50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Another Organization
            </button>
          </div>
        )}

        {/* Create New Organization Form */}
        {(orgs.length === 0 || showCreateForm) && (
          <form className="space-y-4 pt-2" onSubmit={handleCreate}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. CypherSwift Technologies"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 text-center">{error}</div>}

            <div className="flex items-center gap-3">
              {showCreateForm && orgs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="w-1/3 py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#A00142] to-[#650036] hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Creating Workspace...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 text-center border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 font-semibold hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out of account
          </button>
        </div>

      </div>
    </div>
  );
}
