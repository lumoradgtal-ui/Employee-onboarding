import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserCheck, Briefcase, FileText, Banknote, CalendarDays, Activity, ChevronRight, UserPlus, Clock
} from 'lucide-react';

export default function Dashboard() {
  const { orgId } = useAppStore();
  const navigate = useNavigate();

  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard', orgId],
    queryFn: () => api(`/api/dashboard/${orgId}`),
    enabled: !!orgId,
  });

  const { data: recentEmployees = [] } = useQuery({
    queryKey: ['recent_employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}&limit=5`),
    enabled: !!orgId,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recent_logs', orgId],
    queryFn: () => api(`/api/audit_logs?org_id=${orgId}&limit=5`),
    enabled: !!orgId,
  });

  const stats = [
    { name: 'Total Employees', value: data?.employees || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', path: '/employees' },
    { name: 'Active Employees', value: data?.active_employees || 0, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-100', path: '/employees' },
    { name: 'Onboarding', value: data?.onboarding || 0, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-100', path: '/onboarding' },
    { name: 'Probation', value: data?.probation || 0, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-100', path: '/probation' },
    { name: 'Leave Pending', value: data?.leave_pending || 0, icon: CalendarDays, color: 'text-yellow-500', bg: 'bg-yellow-100', path: '/leave' },
    { name: 'Open Jobs', value: data?.open_jobs || 0, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-100', path: '/recruitment' },
    { name: 'Pending Expenses', value: data?.expenses_pending || 0, icon: Banknote, color: 'text-red-500', bg: 'bg-red-100', path: '/expenses' },
  ];

  if (isLoading) return <div className="text-secondary py-8">Loading dashboard...</div>;
  if (error) return <div className="text-danger py-8">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">HR Dashboard</h2>
          <p className="mt-1 text-sm text-secondary">
            Real-time operational summary and workforce management.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              onClick={() => navigate(item.path)}
              className="card flex items-center p-5 cursor-pointer hover:border-primary transition-colors"
            >
              <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-xs font-medium text-secondary truncate">{item.name}</p>
                <p className="mt-1 text-2xl font-semibold text-text">{item.value}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-text flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Recent Employees Joined
            </h3>
            <button
              onClick={() => navigate('/employees')}
              className="text-xs text-primary font-medium hover:underline"
            >
              View All
            </button>
          </div>
          {recentEmployees.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary">No employees added yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-5 px-5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-text">{emp.first_name} {emp.last_name || ''}</div>
                    <div className="text-xs text-secondary">{emp.work_email || emp.employee_code || 'Employee'}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {emp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" /> System Activity Log
            </h3>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-primary font-medium hover:underline"
            >
              Audit Trail
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary">No recent audit log activity.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="py-2.5 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-text">{log.action || log.change_type || 'System Event'}</div>
                    <div className="text-secondary">{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px]">
                    {log.changed_by || 'Admin'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
