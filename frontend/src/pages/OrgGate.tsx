import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function OrgGate({ children }: { children: React.ReactNode }) {
  const { orgId, setOrg } = useAppStore();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const data = await api('/api/organizations');
      setOrgs(data);
      if (!orgId && data.length === 1) {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-secondary">Loading your workspace...</div>
      </div>
    );
  }

  if (orgId) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl shadow-lg border border-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
            Select Organization
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Choose a workspace or create a new one
          </p>
        </div>

        {orgs.length > 0 && (
          <div className="space-y-3 mt-8">
            <p className="text-sm font-medium text-text">Your Organizations</p>
            {orgs.map((o) => (
              <button
                key={o.organization_id}
                onClick={() => {
                  setOrg(o.organization_id, o.organizations.name);
                  navigate('/');
                }}
                className="w-full flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary hover:bg-light transition-colors"
              >
                <span className="font-medium text-text">{o.organizations.name}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">{o.role}</span>
              </button>
            ))}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-secondary">Or create new</span>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleCreate}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="label">Organization Name</label>
              <input
                type="text"
                required
                className="input"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-danger text-sm text-center">{error}</div>}

          <div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
           <button onClick={handleSignOut} className="text-sm text-secondary hover:text-text">
             Sign out
           </button>
        </div>
      </div>
    </div>
  );
}
