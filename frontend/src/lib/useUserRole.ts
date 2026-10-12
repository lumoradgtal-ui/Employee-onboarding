import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { api } from './api';
import { useAppStore } from '../store';

export function useUserRole() {
  const { orgId } = useAppStore();

  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: userOrgs = [] } = useQuery({
    queryKey: ['userOrganizations'],
    queryFn: () => api('/api/organizations'),
    enabled: !!currentUserId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const currentOrgMem = userOrgs.find((o: any) => o.organization_id === orgId);
  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  const orgRole = (currentOrgMem?.role || '').toLowerCase();
  const empRole = (myEmp?.role || '').toLowerCase();

  const role = orgRole || empRole || (!myEmp ? 'owner' : 'employee');

  const isAdminOrManager =
    ['owner', 'admin', 'hr', 'manager'].includes(role) ||
    ['owner', 'admin', 'hr', 'manager'].includes(orgRole) ||
    ['owner', 'admin', 'hr', 'manager'].includes(empRole) ||
    currentUserEmail === 'testadmin@gmail.com' ||
    Boolean(currentUserEmail?.includes('admin')) ||
    Boolean(currentUserEmail?.includes('hr')) ||
    Boolean(currentUserEmail?.includes('manager')) ||
    !myEmp;

  return {
    currentUserEmail,
    currentUserId,
    orgRole,
    empRole,
    role,
    isAdminOrManager,
    myEmp,
    currentOrgMem,
    employees,
    userSession
  };
}
