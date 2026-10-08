import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Shell from './components/Shell';
import Login from './pages/Login';
import OrgGate from './pages/OrgGate';
import Dashboard from './pages/Dashboard';

import EmployeeList from './pages/employees/EmployeeList';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import EmployeeNew from './pages/employees/EmployeeNew';
import Recruitment from './pages/Recruitment';

import Onboarding from './pages/Onboarding';
import Probation from './pages/Probation';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Projects from './pages/Projects';
import Assets from './pages/Assets';
import SystemAccess from './pages/SystemAccess';
import Expenses from './pages/Expenses';
import Payroll from './pages/Payroll';
import Performance from './pages/Performance';
import Offboarding from './pages/Offboarding';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Audit from './pages/Audit';

import ResetPassword from './pages/ResetPassword';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-semibold text-lg">Loading HRMS Platform...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <OrgGate>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/new" element={<EmployeeNew />} />
          <Route path="/employees/:id" element={<EmployeeProfile />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/probation" element={<Probation />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/access" element={<SystemAccess />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/changes" element={<Audit />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/resignation" element={<Offboarding />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </OrgGate>
  );
}
