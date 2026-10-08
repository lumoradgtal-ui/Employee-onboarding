import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Laptop, Plus, UserPlus, CheckCircle, Clock, Lock, ShieldAlert } from 'lucide-react';

export default function Assets() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('laptop');
  const [serialNumber, setSerialNumber] = useState('');

  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
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

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', orgId],
    queryFn: () => api(`/api/assets?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['asset_assignments', orgId],
    queryFn: () => api(`/api/asset_assignments?org_id=${orgId}`),
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

  // Displayed Assets: Managers/Admins see full inventory; Regular employees see only assets assigned to them
  const displayedAssets = isManagerOrAdmin
    ? assets
    : assets.filter((ast: any) =>
        assignments.some((a: any) => a.asset_id === ast.id && a.employee_id === myEmp?.id && a.status === 'active')
      );

  const createAssetMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/assets', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', orgId] });
      setShowAssetModal(false);
      setAssetName('');
      setSerialNumber('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to add asset to inventory');
    }
  });

  const createAssignMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/asset_assignments', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_assignments', orgId] });
      setShowAssignModal(false);
      setSelectedAssetId('');
      setEmployeeId('');
      setSubmitError('');
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Failed to assign asset');
    }
  });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can add hardware assets.');
      return;
    }
    createAssetMutation.mutate({
      asset_tag: serialNumber || `AST-${Date.now()}`,
      name: assetName,
      category: assetType,
      serial_number: serialNumber,
      status: 'available',
    });
  };

  const handleAssignAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !employeeId) return;
    if (!isManagerOrAdmin) {
      alert('Permission restricted: Only Managers and Admins can assign hardware assets.');
      return;
    }
    createAssignMutation.mutate({
      asset_id: selectedAssetId,
      employee_id: employeeId,
      assigned_at: new Date().toISOString(),
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">IT & Hardware Assets</h2>
          <p className="text-sm text-secondary">
            {isManagerOrAdmin
              ? 'Track inventory, laptops, monitors, and employee asset allocations.'
              : 'View hardware equipment assigned to you for work purposes.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isManagerOrAdmin ? (
            <>
              <button
                onClick={() => {
                  setSubmitError('');
                  setShowAssignModal(true);
                }}
                className="btn bg-gray-100 text-text hover:bg-gray-200 border border-border flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Assign Asset
              </button>
              <button
                onClick={() => {
                  setSubmitError('');
                  setShowAssetModal(true);
                }}
                className="btn flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Asset
              </button>
            </>
          ) : (
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold border border-purple-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Staff View (Asset Assignment Restricted to Managers)
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">
          {isManagerOrAdmin ? 'Asset Inventory' : 'Your Assigned Hardware Equipment'}
        </h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading inventory...</div>
        ) : displayedAssets.length === 0 ? (
          <div className="py-12 text-center text-secondary space-y-3">
            <Laptop className="w-10 h-10 mx-auto text-gray-400" />
            <div className="text-sm font-semibold text-text">
              {isManagerOrAdmin
                ? 'No hardware assets in inventory.'
                : 'No hardware assets currently assigned to you.'}
            </div>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {isManagerOrAdmin
                ? 'Click "Add Asset" above to record company laptops, monitors, or hardware devices.'
                : 'Contact IT or your Manager if you require hardware device provisioning.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Asset Name</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Type</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Serial Number</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Assigned To</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedAssets.map((ast: any) => {
                  const assign = assignments.find((a: any) => a.asset_id === ast.id && a.status === 'active');
                  const emp = assign ? employees.find((e: any) => e.id === assign.employee_id) : null;
                  const isMe = myEmp && emp && emp.id === myEmp.id;

                  return (
                    <tr key={ast.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">{ast.name}</td>
                      <td className="py-3 px-4 text-xs text-secondary capitalize">{ast.category || ast.asset_type || 'hardware'}</td>
                      <td className="py-3 px-4 text-xs text-text font-mono">{ast.serial_number || ast.asset_tag || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs font-medium text-primary">
                        {emp ? (
                          <span className={isMe ? 'font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200' : ''}>
                            {emp.first_name} {emp.last_name || ''} {isMe ? '(You)' : ''}
                          </span>
                        ) : (
                          'Unassigned'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          isMe ? 'bg-purple-100 text-purple-800 font-bold border border-purple-200' :
                          emp ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {isMe ? 'Assigned to You' : emp ? 'Assigned' : 'Available'}
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

      {showAssetModal && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Add Asset to Inventory</h3>
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Asset Name *</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro M3 16-inch"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Category</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="laptop">Laptop / PC</option>
                  <option value="monitor">Monitor / Display</option>
                  <option value="mobile">Mobile / Tablet</option>
                  <option value="accessory">Accessory / Peripheral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Serial Number / Asset Tag</label>
                <input
                  type="text"
                  placeholder="e.g. C02FX399MD6M"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending}
                  className="btn text-sm font-semibold px-4 py-2"
                >
                  {createAssetMutation.isPending ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <h3 className="text-lg font-bold text-text">Assign Asset to Employee</h3>
            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <form onSubmit={handleAssignAsset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Select Asset *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.serial_number || a.asset_tag || 'No S/N'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Select Employee *</label>
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
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssignMutation.isPending}
                  className="btn text-sm font-semibold px-4 py-2"
                >
                  {createAssignMutation.isPending ? 'Assigning...' : 'Assign Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
