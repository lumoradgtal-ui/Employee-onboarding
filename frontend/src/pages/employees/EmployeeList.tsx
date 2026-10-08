import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Filter, Lock } from 'lucide-react';

export default function EmployeeList() {
  const { orgId } = useAppStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;
  const isAdminOrManager = currentUserEmail === 'testadmin@gmail.com' || currentUserEmail?.includes('admin') || currentUserEmail?.includes('hr') || currentUserEmail?.includes('manager');

  const { data = [], isLoading } = useQuery({
    queryKey: ['employees', orgId, q, status],
    queryFn: () => api(`/api/employees?org_id=${orgId}&q=${encodeURIComponent(q)}&status=${status}`),
    enabled: !!orgId,
  });

  const handleProfileClick = (targetEmp: any) => {
    const isSelf = !!(
      (targetEmp.work_email && targetEmp.work_email.toLowerCase() === currentUserEmail) ||
      (targetEmp.personal_email && targetEmp.personal_email.toLowerCase() === currentUserEmail) ||
      (targetEmp.user_id && targetEmp.user_id === currentUserId)
    );

    if (isSelf || isAdminOrManager) {
      navigate(`/employees/${targetEmp.id}`);
    } else {
      alert(`Access Restricted: In accordance with privacy policy, employees can only view their own profile. Colleague profile details are restricted to HR & Managers.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Employees</h2>
          <p className="text-sm text-secondary">Manage your organization's workforce and employee lifecycle.</p>
        </div>
        <button 
          onClick={() => navigate('/employees/new')}
          className="btn flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or ID..." 
              className="input pl-10"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:w-64">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="input"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pre_onboarding">Pre-Onboarding</option>
              <option value="onboarding">Onboarding</option>
              <option value="probation">Probation</option>
              <option value="notice_period">Notice Period</option>
              <option value="offboarded">Offboarded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Employee</th>
                <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Contact</th>
                <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-secondary">Loading employees...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-secondary">No employees found.</td></tr>
              ) : (
                data.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {emp.first_name[0]}{emp.last_name?.[0] || ''}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-secondary">{emp.employee_code || 'No ID'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-text">{emp.work_email || '—'}</div>
                      <div className="text-xs text-secondary">{emp.phone || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-text">{emp.designations?.name || '—'}</div>
                      <div className="text-xs text-secondary">{emp.departments?.name || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${emp.status === 'active' ? 'bg-green-100 text-green-800' : 
                          emp.status === 'pre_onboarding' ? 'bg-purple-100 text-purple-800' :
                          emp.status === 'onboarding' ? 'bg-blue-100 text-blue-800' :
                          emp.status === 'offboarded' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      <button 
                        onClick={() => handleProfileClick(emp)}
                        className="text-primary hover:text-dark flex items-center gap-1 font-semibold text-xs"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
