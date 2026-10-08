import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { ShieldCheck, History, UserCheck, Lock } from 'lucide-react';

export default function Audit() {
  const { orgId } = useAppStore();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_logs', orgId],
    queryFn: () => api(`/api/audit_logs?org_id=${orgId}`),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Audit Trail & Security Logs</h2>
          <p className="text-sm text-secondary">Immutable log of system modifications, permissions grants, and employee record updates.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> System Activity Register
        </h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No audit activity logged yet. System operating securely.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Timestamp</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Actor</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Action</th>
                  <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-secondary">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-text">{log.changed_by || 'System Admin'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                        {log.action || log.change_type || 'UPDATE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-secondary max-w-md truncate">
                      {JSON.stringify(log.before_data || log.after_data || log.details || 'Modification recorded')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
