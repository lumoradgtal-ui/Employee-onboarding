import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  UserPlus, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  FolderKanban, 
  MonitorSmartphone, 
  Key, 
  Receipt, 
  Banknote, 
  TrendingUp, 
  ArrowRightLeft, 
  FileText, 
  LogOut, 
  BarChart, 
  Shield,
  Bell,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
  User,
  UserCircle,
  ChevronDown,
  Building2
} from 'lucide-react';

const modules = [
  { name: 'Employees', path: '/employees', icon: Users },
  { name: 'Recruitment', path: '/recruitment', icon: Briefcase },
  { name: 'Onboarding', path: '/onboarding', icon: UserPlus },
  { name: 'Probation', path: '/probation', icon: ShieldCheck },
  { name: 'Attendance', path: '/attendance', icon: Clock },
  { name: 'Leave', path: '/leave', icon: Calendar },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Assets', path: '/assets', icon: MonitorSmartphone },
  { name: 'System Access', path: '/access', icon: Key },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Payroll', path: '/payroll', icon: Banknote },
  { name: 'Performance', path: '/performance', icon: TrendingUp },
  { name: 'Changes', path: '/changes', icon: ArrowRightLeft },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Offboarding', path: '/resignation', icon: LogOut },
  { name: 'Reports', path: '/reports', icon: BarChart },
  { name: 'Audit', path: '/audit', icon: Shield },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId, orgName, clearOrg } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }
    try {
      setIsUpdatingPw(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwStatus({ type: 'success', msg: 'Password updated successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPwStatus(null);
      }, 1500);
    } catch (err: any) {
      setPwStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // Fetch real notifications from database
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', orgId],
    queryFn: () => api(`/api/notifications?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const unreadCount = notifications.filter((n: any) => !n.read_at).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, read_at: new Date().toISOString() } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', orgId] });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearOrg();
    navigate('/login');
  };

  const handleChangeOrg = () => {
    clearOrg();
    navigate('/');
  };

  // User session & employee task checking for Login Task Notification Popup
  const [showTaskLoginPopup, setShowTaskLoginPopup] = useState(false);
  const [acknowledgedTaskPopup, setAcknowledgedTaskPopup] = useState(() => {
    return sessionStorage.getItem('task_login_popup_seen') === 'true';
  });

  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboarding_tasks', orgId],
    queryFn: () => api(`/api/onboarding_tasks?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  const isAdminOrManager = 
    ['owner', 'admin', 'hr', 'manager'].includes((myEmp?.role || '').toLowerCase()) ||
    currentUserEmail === 'testadmin@gmail.com' ||
    currentUserEmail?.includes('admin');

  const myPendingTasks = myEmp
    ? onboardingTasks.filter((t: any) => t.employee_id === myEmp.id && t.status === 'pending')
    : [];

  const userDisplayName = myEmp?.first_name 
    ? `${myEmp.first_name} ${myEmp.last_name || ''}`.trim() 
    : (currentUserEmail?.split('@')[0] || 'User');
    
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const myProfilePath = myEmp?.id ? `/employees/${myEmp.id}` : '/employees';

  useEffect(() => {
    if (myEmp && myPendingTasks.length > 0 && !acknowledgedTaskPopup) {
      setShowTaskLoginPopup(true);
    }
  }, [myEmp?.id, myPendingTasks.length, acknowledgedTaskPopup]);

  const handleDismissTaskPopup = (goToTasks = false) => {
    sessionStorage.setItem('task_login_popup_seen', 'true');
    setAcknowledgedTaskPopup(true);
    setShowTaskLoginPopup(false);
    if (goToTasks) {
      navigate('/onboarding');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-[#1D1D1D] text-white flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-white/10 bg-[#1D1D1D]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A00142] to-[#3843C1] flex items-center justify-center font-bold text-white shadow-md">
              CS
            </div>
            <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              HRMS Platform
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-300 truncate pr-2 font-medium">{orgName || 'Organization'}</span>
            {isAdminOrManager && (
              <button onClick={handleChangeOrg} className="text-[11px] font-semibold text-[#FFB539] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-pointer" title="Change Organization">Change</button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `group flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#A00142] to-[#710171] text-white shadow-md border-l-4 border-[#FFB539]' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <LayoutDashboard className="mr-3 flex-shrink-0 h-5 w-5" />
              Dashboard
            </NavLink>
            
            <div className="pt-4 pb-2">
              <p className="px-3 text-[11px] font-bold text-[#FFB539] uppercase tracking-wider">
                Modules
              </p>
            </div>
            
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <NavLink
                  key={m.path}
                  to={m.path}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#A00142] to-[#710171] text-white shadow-md border-l-4 border-[#FFB539]' 
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5 opacity-80 group-hover:opacity-100" />
                  {m.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-white/10 bg-[#1D1D1D]/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-2 border border-white/10 rounded-lg shadow-sm text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-border h-16 flex items-center px-6 justify-between flex-shrink-0">
          <h1 className="text-lg font-semibold text-text">Employee Lifecycle Management</h1>
          
          <div className="flex items-center space-x-4">
             {/* Notification Bell */}
             <div className="relative">
               <button
                 onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                 className="p-2 text-secondary hover:text-text hover:bg-gray-100 rounded-full transition-colors relative cursor-pointer"
                 title="Notifications"
               >
                 <Bell className="w-5 h-5" />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                     {unreadCount}
                   </span>
                 )}
               </button>

               {/* Notifications Dropdown */}
               {showNotifications && (
                 <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                   <div className="p-3 border-b border-border flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-text text-sm">Notifications</h3>
                     <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                       {unreadCount} New
                     </span>
                   </div>

                   <div className="max-h-80 overflow-y-auto divide-y divide-border">
                     {notifications.length === 0 ? (
                       <div className="p-6 text-center text-xs text-secondary">
                         No notifications at this time.
                       </div>
                     ) : (
                       notifications.map((n: any) => (
                         <div
                           key={n.id}
                           className={`p-3 text-xs space-y-1 transition-colors ${
                             !n.read_at ? 'bg-purple-50/50' : 'bg-white'
                           }`}
                         >
                           <div className="flex justify-between items-start">
                             <span className="font-semibold text-text">{n.title}</span>
                             {!n.read_at && (
                               <button
                                 onClick={() => markReadMutation.mutate(n.id)}
                                 className="text-[10px] text-primary hover:underline"
                               >
                                 Mark read
                               </button>
                             )}
                           </div>
                           <p className="text-secondary">{n.message}</p>
                           <div className="text-[10px] text-gray-400">
                             {new Date(n.created_at).toLocaleString()}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}
             </div>

             {/* User Profile Avatar & Dropdown */}
             <div className="relative">
               <button
                 onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                 className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
                 title="Account & Profile"
               >
                 <div className="relative">
                   <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A00142] to-[#3843C1] text-white font-extrabold text-xs flex items-center justify-center shadow-md border-2 border-white">
                     {userInitials}
                   </div>
                   <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                 </div>
                 <div className="hidden md:flex flex-col text-left pr-1">
                   <span className="text-xs font-bold text-gray-900 leading-tight max-w-[120px] truncate">{userDisplayName}</span>
                   <span className="text-[10px] font-semibold text-[#A00142] uppercase tracking-wider">
                     {myEmp?.role ? myEmp.role.toUpperCase() : (isAdminOrManager ? 'ADMIN' : 'EMPLOYEE')}
                   </span>
                 </div>
                 <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
               </button>

               {/* Profile Dropdown Menu */}
               {showProfileMenu && (
                 <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                   {/* Card Header */}
                   <div className="p-4 bg-gradient-to-br from-[#FCE8EE]/70 to-[#F6F8FB] border-b border-gray-100">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A00142] to-[#3843C1] text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                         {userInitials}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="font-extrabold text-sm text-[#080809] truncate">{userDisplayName}</h4>
                         <p className="text-xs text-gray-500 truncate">{currentUserEmail}</p>
                       </div>
                     </div>
                   </div>

                   {/* Options */}
                   <div className="p-2 space-y-1">
                     <button
                       onClick={() => {
                         setShowProfileMenu(false);
                         navigate(myProfilePath);
                       }}
                       className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-[#A00142] hover:bg-[#FCE8EE]/50 rounded-xl transition-colors cursor-pointer"
                     >
                       <UserCircle className="w-4 h-4 text-[#A00142]" />
                       My Profile Page
                     </button>

                     <button
                       onClick={() => {
                         setShowProfileMenu(false);
                         setShowPasswordModal(true);
                       }}
                       className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-[#A00142] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                     >
                       <Key className="w-4 h-4 text-[#3843C1]" />
                       Change Password
                     </button>

                     {isAdminOrManager && (
                       <button
                         onClick={() => {
                           setShowProfileMenu(false);
                           handleChangeOrg();
                         }}
                         className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                       >
                         <Building2 className="w-4 h-4 text-amber-500" />
                         Switch Organization
                       </button>
                     )}
                   </div>

                   <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                     <button
                       onClick={() => {
                         setShowProfileMenu(false);
                         handleSignOut();
                       }}
                       className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                     >
                       <LogOut className="w-4 h-4" />
                       Sign Out
                     </button>
                   </div>
                 </div>
               )}
             </div>

             {/* Change Password Modal */}
             {showPasswordModal && (
               <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                 <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-border text-left">
                   <div className="flex justify-between items-center border-b border-border pb-3">
                     <h3 className="text-lg font-bold text-text flex items-center gap-2">
                       <Key className="w-5 h-5 text-primary" />
                       Change Your Password
                     </h3>
                     <button 
                       onClick={() => { setShowPasswordModal(false); setPwStatus(null); setNewPassword(''); setConfirmPassword(''); }}
                       className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                     >
                       &times;
                     </button>
                   </div>

                   {pwStatus && (
                     <div className={`p-3 rounded-lg text-sm font-medium ${
                       pwStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                     }`}>
                       {pwStatus.msg}
                     </div>
                   )}

                   <form onSubmit={handlePasswordChange} className="space-y-4">
                     <div>
                       <label className="block text-xs font-medium text-secondary mb-1">New Password</label>
                       <input
                         type="password"
                         required
                         minLength={6}
                         placeholder="At least 6 characters"
                         className="input w-full"
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-secondary mb-1">Confirm New Password</label>
                       <input
                         type="password"
                         required
                         minLength={6}
                         placeholder="Re-enter new password"
                         className="input w-full"
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                       />
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                       <button
                         type="button"
                         onClick={() => { setShowPasswordModal(false); setPwStatus(null); setNewPassword(''); setConfirmPassword(''); }}
                         className="btn-outline px-4 py-2 text-sm"
                       >
                         Cancel
                       </button>
                       <button
                         type="submit"
                         disabled={isUpdatingPw}
                         className="btn px-4 py-2 text-sm"
                       >
                         {isUpdatingPw ? 'Updating...' : 'Update Password'}
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
             )}

             <span className="text-sm text-secondary bg-gray-100 px-3 py-1 rounded-full">Secure Enterprise Environment</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Employee Login Assigned Task Popup Notification Modal */}
      {showTaskLoginPopup && myEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-purple-200 text-left">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">Welcome, {myEmp.first_name}!</h3>
                  <p className="text-xs text-purple-700 font-semibold">
                    🔔 You have {myPendingTasks.length} pending task(s) assigned to you
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDismissTaskPopup(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 leading-relaxed">
              Management has assigned tasks for your action. Please review your task checklist below:
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
              {myPendingTasks.map((task: any) => (
                <div key={task.id} className="pt-2 p-3 bg-gray-50 rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-text">{task.title}</div>
                    <div className="text-[11px] text-gray-500">
                      Category: {task.category || 'General'} • Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Soon'}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-gray-600 line-clamp-1 italic">{task.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 uppercase shrink-0">
                    {task.priority || 'High'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => handleDismissTaskPopup(false)}
                className="btn-outline px-4 py-2 text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleDismissTaskPopup(true)}
                className="btn px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5"
              >
                Review & Complete Tasks Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
