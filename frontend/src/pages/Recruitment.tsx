import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  Briefcase, Users, Plus, ChevronRight, UserPlus, ShieldCheck, 
  AlertCircle, CheckCircle2, Award, Calendar, Clock, Star, FileText, Check, Search, Sparkles,
  Video, MapPin, ExternalLink, ArrowRight, UserCheck
} from 'lucide-react';

export default function Recruitment() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates' | 'my_referrals'>('jobs');
  
  // Modal states
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedJobDetail, setSelectedJobDetail] = useState<any>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCand, setInterviewCand] = useState<any>(null);

  // Job form
  const [jobTitle, setJobTitle] = useState('');
  const [openings, setOpenings] = useState('1');
  const [departmentId, setDepartmentId] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [jobDescription, setJobDescription] = useState('');

  // Candidate / Referral form
  const [candFirstName, setCandFirstName] = useState('');
  const [candLastName, setCandLastName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [referralSource, setReferralSource] = useState('Employee Referral');
  const [referrerEmpId, setReferrerEmpId] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [candResumeUrl, setCandResumeUrl] = useState('');
  const [candResumeFileName, setCandResumeFileName] = useState('');
  const [candSubmitError, setCandSubmitError] = useState('');
  const [selectedResumeModal, setSelectedResumeModal] = useState<any>(null);

  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCandResumeUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Interview Schedule Form
  const [interviewRound, setInterviewRound] = useState('Technical Round 1');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewerEmpId, setInterviewerEmpId] = useState('');
  const [interviewMeetingUrl, setInterviewMeetingUrl] = useState('');

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', orgId],
    queryFn: () => api(`/api/jobs?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['candidates', orgId],
    queryFn: () => api(`/api/candidates?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', orgId],
    queryFn: () => api(`/api/departments?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: probationRecords = [] } = useQuery({
    queryKey: ['probation_records', orgId],
    queryFn: () => api(`/api/probation_records?org_id=${orgId}`),
    enabled: !!orgId,
  });

  // User session fetch for self referrer auto-detection
  const { data: userSession } = useQuery({
    queryKey: ['userSession'],
    queryFn: () => supabase.auth.getSession(),
  });

  const currentUserEmail = userSession?.data?.session?.user?.email?.toLowerCase();
  const currentUserId = userSession?.data?.session?.user?.id;

  const myEmp = employees.find((e: any) =>
    (e.work_email && e.work_email.toLowerCase() === currentUserEmail) ||
    (e.personal_email && e.personal_email.toLowerCase() === currentUserEmail) ||
    (e.user_id && e.user_id === currentUserId)
  );

  const isAdminOrManager = currentUserEmail === 'testadmin@gmail.com' || 
    currentUserEmail?.includes('admin') || 
    currentUserEmail?.includes('hr') || 
    currentUserEmail?.includes('manager') ||
    myEmp?.role === 'admin' || myEmp?.role === 'manager';

  const { data: interviews = [] } = useQuery({
    queryKey: ['interviews', orgId],
    queryFn: () => api(`/api/interviews?org_id=${orgId}`),
    enabled: !!orgId,
  });

  // Filter employees eligible to submit referrals (probation confirmed or active standing)
  const isEmployeeEligibleToRefer = (empId: string) => {
    if (!empId) return false;
    const emp = employees.find((e: any) => e.id === empId);
    if (!emp) return false;
    const probRec = probationRecords.find((p: any) => p.employee_id === empId);
    if (probRec && probRec.status === 'confirmed') return true;
    return emp.status === 'active';
  };

  const openCandidateModal = (jobId?: string) => {
    if (jobId) {
      setSelectedJobId(jobId);
    } else {
      setSelectedJobId('');
    }
    if (myEmp?.id) {
      setReferrerEmpId(myEmp.id);
    }
    setCandResumeUrl('');
    setCandResumeFileName('');
    setCandSubmitError('');
    setShowCandidateModal(true);
  };

  const createJobMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', orgId] });
      setShowJobModal(false);
      setJobTitle('');
      setJobDescription('');
    },
  });

  const createCandidateMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/candidates', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', orgId] });
      setShowCandidateModal(false);
      setCandFirstName('');
      setCandLastName('');
      setCandEmail('');
      setCandPhone('');
      setReferralNotes('');
      setCandResumeUrl('');
      setCandResumeFileName('');
      setCandSubmitError('');
    },
    onError: (err: any) => {
      setCandSubmitError(err.message || 'Failed to submit candidate. Please check fields.');
    },
  });

  const approveReferralMutation = useMutation({
    mutationFn: (candidateId: string) =>
      api(`/api/candidates/${candidateId}/approve?org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['candidates', orgId] });
      alert(res?.message || 'Referral approved! Notification email sent to candidate.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to approve referral.');
    }
  });

  const updateCandidateStageMutation = useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: string; stage: string }) =>
      api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, stage } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', orgId] });
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/interviews', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', orgId] });
      queryClient.invalidateQueries({ queryKey: ['candidates', orgId] });
      setShowInterviewModal(false);
      setInterviewCand(null);
      setInterviewDate('');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to schedule interview');
    }
  });

  const convertCandidateMutation = useMutation({
    mutationFn: (candidateId: string) =>
      api(`/api/candidates/${candidateId}/convert?org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
    },
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      api(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload: { organization_id: orgId, status } }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', orgId] });
      if (selectedJobDetail && selectedJobDetail.id === variables.jobId) {
        setSelectedJobDetail({ ...selectedJobDetail, status: variables.status });
      }
    },
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;
    createJobMutation.mutate({
      title: jobTitle,
      openings: parseInt(openings) || 1,
      department_id: departmentId || null,
      employment_type: employmentType,
      description: jobDescription,
      status: 'open',
    });
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candFirstName || !candEmail) return;

    const isReferral = referralSource === 'Employee Referral';
    const activeReferrerId = myEmp?.id || referrerEmpId;
    const referrerEligible = isReferral && activeReferrerId ? isEmployeeEligibleToRefer(activeReferrerId) : true;

    createCandidateMutation.mutate({
      first_name: candFirstName,
      last_name: candLastName,
      email: candEmail,
      phone: candPhone,
      job_id: selectedJobId || null,
      source: referralSource,
      referrer_employee_id: isReferral && activeReferrerId ? activeReferrerId : null,
      referral_eligible: referrerEligible,
      resume_url: candResumeUrl || null,
      stage: 'applied',
      notes: referralNotes,
    });
  };

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewCand || !interviewDate) return;
    
    createInterviewMutation.mutate({
      candidate_id: interviewCand.id,
      job_id: interviewCand.job_id || null,
      interviewer_id: interviewerEmpId || null,
      round_name: interviewRound,
      scheduled_at: interviewDate,
      meeting_link: interviewMeetingUrl || null,
      status: 'scheduled'
    });

    if (interviewCand.stage === 'applied' || interviewCand.stage === 'screening') {
      updateCandidateStageMutation.mutate({ candidateId: interviewCand.id, stage: 'interview_scheduled' });
    }
  };

  const selectedReferrerEligible = referrerEmpId ? isEmployeeEligibleToRefer(referrerEmpId) : false;

  // Filter referrals submitted by logged-in employee or all referrals if admin/manager
  const myReferrals = candidates.filter((c: any) => 
    (myEmp?.id && c.referrer_employee_id === myEmp.id) || 
    (!myEmp?.id && c.source === 'Employee Referral')
  );

  const getStageStepIndex = (stage: string) => {
    switch(stage) {
      case 'applied': return 0;
      case 'screening': return 1;
      case 'interview_scheduled':
      case 'technical_round':
      case 'hr_round': return 2;
      case 'offer_extended': return 3;
      case 'hired': return 4;
      case 'rejected': return -1;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Recruitment & ATS</h2>
          <p className="text-sm text-secondary">Manage job requisitions, candidate pipelines, and probation-verified employee referrals.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCandidateModal()}
            className="btn bg-gray-100 text-text hover:bg-gray-200 border border-border flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Candidate / Referral
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setShowJobModal(true)}
              className="btn flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Job Requisition
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-max flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'jobs' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-text'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'candidates' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-text'
          }`}
        >
          <Users className="w-4 h-4" />
          Candidates & ATS Pipeline ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('my_referrals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my_referrals' ? 'bg-purple-600 text-white shadow-sm' : 'text-secondary hover:text-text'
          }`}
        >
          <Award className="w-4 h-4 text-amber-300" />
          My Referrals & Tracker ({myReferrals.length})
        </button>
      </div>

      <div className="card">
        {activeTab === 'jobs' ? (
          loadingJobs ? (
            <div className="py-12 text-center text-secondary">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-text mb-2">No active jobs</h3>
              <p className="text-secondary text-sm max-w-sm mx-auto mb-4">Create a job requisition to start tracking candidates and applications.</p>
              {isAdminOrManager && (
                <button onClick={() => setShowJobModal(true)} className="btn text-xs">
                  Create First Job
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job: any) => {
                const isClosed = job.status === 'closed';
                return (
                  <div 
                    key={job.id} 
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 -mx-5 px-5 transition-colors cursor-pointer"
                    onClick={() => setSelectedJobDetail(job)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-text hover:text-primary transition-colors">{job.title}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          job.status === 'open' ? 'bg-green-100 text-green-800' :
                          job.status === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-1">
                        {job.openings} Openings • {job.employment_type?.replace('_', ' ')} • Created {new Date(job.created_at).toLocaleDateString()}
                      </p>
                      {job.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic max-w-2xl">
                          "{job.description}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openCandidateModal(job.id)}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200 flex items-center gap-1.5 transition-colors"
                        title="Refer candidate for this opening"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Refer Candidate
                      </button>

                      {isAdminOrManager && (
                        <button
                          onClick={() => {
                            updateJobStatusMutation.mutate({
                              jobId: job.id,
                              status: isClosed ? 'open' : 'closed',
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            isClosed 
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                          }`}
                        >
                          {isClosed ? 'Reopen Job' : 'Close Opening'}
                        </button>
                      )}

                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'candidates' ? (
          loadingCandidates ? (
            <div className="py-12 text-center text-secondary">Loading candidates...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Candidate</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Applied For</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Source</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Referral Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">ATS Stage</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidates.map((c: any) => {
                    const matchedJob = jobs.find((j: any) => j.id === c.job_id);
                    const referrerEmp = employees.find((e: any) => e.id === c.referrer_employee_id);
                    const candidateInterviews = interviews.filter((i: any) => i.candidate_id === c.id);

                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-text">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-secondary">{c.email} • {c.phone || 'No phone'}</div>
                          
                          {c.resume_url ? (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => setSelectedResumeModal(c)}
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[11px] font-semibold border border-purple-200 flex items-center gap-1 transition-colors"
                              >
                                <FileText className="w-3 h-3 text-purple-600" /> View Resume
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] text-gray-400 italic flex items-center gap-1">
                              <FileText className="w-3 h-3" /> No Resume Attached
                            </div>
                          )}

                          {candidateInterviews.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-700 font-medium">
                              <Calendar className="w-3 h-3" />
                              <span>{candidateInterviews.length} Interview(s) Scheduled</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-text font-medium">
                          {matchedJob ? matchedJob.title : 'General Talent Pool'}
                        </td>
                        <td className="py-3 px-4 text-xs text-secondary">
                          {c.source || 'Direct Application'}
                          {referrerEmp && (
                            <div className="text-[11px] text-primary font-medium">
                              By: {referrerEmp.first_name} {referrerEmp.last_name || ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.source === 'Employee Referral' ? (
                            c.referral_eligible ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3" /> Post-Probation Referral
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3" /> Under Probation
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={c.stage || 'applied'}
                            onChange={(e) => updateCandidateStageMutation.mutate({ candidateId: c.id, stage: e.target.value })}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border bg-white text-text shadow-sm focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="applied">Applied</option>
                            <option value="screening">Screening</option>
                            <option value="interview_scheduled">Interview Scheduled</option>
                            <option value="technical_round">Technical Round</option>
                            <option value="hr_round">HR Round</option>
                            <option value="offer_extended">Offer Extended</option>
                            <option value="hired">Hired</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isAdminOrManager && c.source === 'Employee Referral' && c.stage === 'applied' && (
                              <button
                                onClick={() => approveReferralMutation.mutate(c.id)}
                                disabled={approveReferralMutation.isPending}
                                className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"
                                title="Inspect resume and approve candidate to send email notification"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve & Notify Candidate
                              </button>
                            )}

                            {c.stage !== 'applied' && c.source === 'Employee Referral' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Notified
                              </span>
                            )}

                            {c.stage !== 'hired' && c.stage !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setInterviewCand(c);
                                  setShowInterviewModal(true);
                                }}
                                className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-medium border border-purple-200 flex items-center gap-1"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                Schedule Interview
                              </button>
                            )}

                            {isAdminOrManager && c.stage !== 'hired' && (
                              <button
                                onClick={() => convertCandidateMutation.mutate(c.id)}
                                disabled={convertCandidateMutation.isPending}
                                className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium border border-green-200"
                              >
                                Hire & Convert
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {candidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-secondary">No candidates in pipeline.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* My Referrals & Tracker Tab */
          <div className="space-y-6">

            {myReferrals.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <UserPlus className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-text mb-1">No referrals submitted yet</h4>
                <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
                  Know a talented candidate? Refer them for active job positions to help your team grow and claim referral rewards.
                </p>
                <button onClick={() => openCandidateModal()} className="btn text-xs">
                  Submit First Referral
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myReferrals.map((refCand: any) => {
                  const matchedJob = jobs.find((j: any) => j.id === refCand.job_id);
                  const stepIndex = getStageStepIndex(refCand.stage);
                  const candInterviews = interviews.filter((i: any) => i.candidate_id === refCand.id);
                  const isHired = refCand.stage === 'hired';
                  const isRejected = refCand.stage === 'rejected';

                  const pipelineSteps = [
                    { key: 'applied', label: 'Applied' },
                    { key: 'screening', label: 'Screening' },
                    { key: 'interviewing', label: 'Interviewing' },
                    { key: 'offer', label: 'Offer Extended' },
                    { key: 'hired', label: 'Hired' },
                  ];

                  return (
                    <div key={refCand.id} className="border border-border rounded-xl p-5 bg-white space-y-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header info */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-text">{refCand.first_name} {refCand.last_name}</h4>
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {matchedJob ? matchedJob.title : 'General Requisition'}
                            </span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            {refCand.email} • {refCand.phone || 'No phone'} • Submitted {new Date(refCand.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Referral Reward Badge */}
                        <div>
                          {isHired ? (
                            refCand.referral_eligible ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                                <Award className="w-4 h-4 text-amber-500" />
                                $500 Referral Bonus Approved!
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-medium">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                Bonus Pending Probation Confirmation
                              </div>
                            )
                          ) : isRejected ? (
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              Application Closed
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                              In Active Interview Pipeline ($500 Reward Eligible)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recruitment Pipeline Tracker Stepper */}
                      {!isRejected ? (
                        <div className="py-2">
                          <div className="flex items-center justify-between relative">
                            {/* Connecting Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
                            <div 
                              className="absolute top-1/2 left-0 h-1 bg-purple-600 -translate-y-1/2 z-0 transition-all duration-500" 
                              style={{ width: `${(Math.max(0, stepIndex) / (pipelineSteps.length - 1)) * 100}%` }}
                            />

                            {pipelineSteps.map((step, idx) => {
                              const isCompleted = stepIndex >= idx;
                              const isCurrent = stepIndex === idx;

                              return (
                                <div key={step.key} className="relative z-10 flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                    isCompleted 
                                      ? 'bg-purple-600 text-white shadow-md ring-4 ring-purple-100' 
                                      : 'bg-white text-gray-400 border-2 border-gray-300'
                                  }`}>
                                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                  </div>
                                  <span className={`text-[11px] mt-2 font-medium ${
                                    isCurrent ? 'text-purple-700 font-bold' : isCompleted ? 'text-text' : 'text-gray-400'
                                  }`}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                          This referral was not selected during the evaluation process for this position.
                        </div>
                      )}

                      {/* Interview details list */}
                      {candInterviews.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-border space-y-2">
                          <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            Scheduled Interview Sessions ({candInterviews.length})
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {candInterviews.map((item: any) => {
                              const interviewer = employees.find((e: any) => e.id === item.interviewer_id);
                              return (
                                <div key={item.id} className="p-2.5 bg-white rounded border border-border text-xs space-y-1">
                                  <div className="font-semibold text-purple-900">{item.round_name}</div>
                                  <div className="text-gray-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    {new Date(item.scheduled_at).toLocaleString()}
                                  </div>
                                  {interviewer && (
                                    <div className="text-gray-500 text-[11px]">
                                      Interviewer: {interviewer.first_name} {interviewer.last_name}
                                    </div>
                                  )}
                                  {item.meeting_link && (
                                    <a 
                                      href={item.meeting_link} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-primary hover:underline flex items-center gap-1 text-[11px] font-medium"
                                    >
                                      <Video className="w-3 h-3" /> Join Virtual Meeting
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {refCand.notes && (
                        <div className="text-xs text-gray-600 italic bg-purple-50/50 p-2.5 rounded border border-purple-100">
                          "<strong>Referral Note:</strong> {refCand.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Job Requisition Modal */}
      {showJobModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowJobModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h3 className="text-lg font-bold text-text">Create Job Requisition</h3>
              <button
                type="button"
                onClick={() => setShowJobModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Openings</label>
                  <input
                    type="number"
                    min="1"
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Key responsibilities and qualifications required..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="btn text-xs font-semibold px-4 py-2"
                >
                  {createJobMutation.isPending ? 'Publishing...' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate / Employee Referral Modal */}
      {showCandidateModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowCandidateModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <h3 className="text-lg font-bold text-text">Add Candidate / Referral</h3>
              <button
                type="button"
                onClick={() => setShowCandidateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {candSubmitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{candSubmitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCandidate} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">First Name *</label>
                  <input
                    type="text"
                    value={candFirstName}
                    onChange={(e) => setCandFirstName(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Last Name</label>
                  <input
                    type="text"
                    value={candLastName}
                    onChange={(e) => setCandLastName(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Email *</label>
                  <input
                    type="email"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Phone</label>
                  <input
                    type="text"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Target Job Position</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="">General Talent Pool</option>
                  {jobs.map((j: any) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Application Source</label>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="Employee Referral">Employee Referral</option>
                  <option value="Direct Application">Direct Portal Application</option>
                  <option value="LinkedIn">LinkedIn / Social</option>
                  <option value="Recruitment Agency">External Agency</option>
                </select>
              </div>

              {referralSource === 'Employee Referral' && (
                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
                  <label className="block text-xs font-semibold text-purple-900">Referring Employee (Logged-in Staff)</label>
                  
                  {myEmp ? (
                    <div className="p-2.5 bg-white border border-purple-200 rounded-lg space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-text">
                        <span>{myEmp.first_name} {myEmp.last_name} ({myEmp.work_email || currentUserEmail})</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium border border-purple-200">
                          Auto-Locked
                        </span>
                      </div>
                      <div className="text-xs">
                        {isEmployeeEligibleToRefer(myEmp.id) ? (
                          <div className="text-green-700 flex items-center gap-1 font-medium text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Post-Probation Confirmed & Eligible for $500 Referral Rewards!</span>
                          </div>
                        ) : (
                          <div className="text-yellow-700 flex items-center gap-1 font-medium text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Under Probation (Bonus will be credited upon probation confirmation).</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={referrerEmpId}
                      onChange={(e) => setReferrerEmpId(e.target.value)}
                      className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                    >
                      <option value="">Select Referring Staff Member</option>
                      {employees.map((e: any) => {
                        const eligible = isEmployeeEligibleToRefer(e.id);
                        return (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name} {eligible ? '✓ (Post-Probation Eligible)' : '(Under Probation)'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Candidate Resume / CV Document *
                </label>
                <div className="space-y-2 p-3 bg-purple-50/40 border border-purple-200 rounded-lg">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeFileUpload}
                    className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 border border-border rounded-lg bg-white cursor-pointer"
                  />
                  {candResumeFileName && (
                    <div className="text-xs text-green-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Attached File: {candResumeFileName}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 font-medium">Or paste Resume / CV Document URL:</div>
                  <input
                    type="text"
                    placeholder="e.g. https://drive.google.com/file/d/xyz or https://resume.io/p/doc"
                    value={candResumeUrl.startsWith('data:') ? '' : candResumeUrl}
                    onChange={(e) => {
                      setCandResumeUrl(e.target.value);
                      if (e.target.value) setCandResumeFileName('External Document Link');
                    }}
                    className="w-full border border-border rounded-lg p-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Notes / Recommendations</label>
                <textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows={2}
                  placeholder="Candidate strengths or referral notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCandidateMutation.isPending}
                  className="btn text-xs font-semibold px-4 py-2"
                >
                  {createCandidateMutation.isPending ? 'Adding...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && interviewCand && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowInterviewModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-text">Schedule Interview</h3>
                <p className="text-xs text-secondary">
                  Candidate: <strong className="text-text">{interviewCand.first_name} {interviewCand.last_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInterviewModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Interview Round Name *</label>
                <select
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="Technical Round 1">Technical Round 1</option>
                  <option value="Technical Round 2 (System Design)">Technical Round 2 (System Design)</option>
                  <option value="HR & Cultural Fit Round">HR & Cultural Fit Round</option>
                  <option value="Executive Management Round">Executive Management Round</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Interviewer (Staff)</label>
                <select
                  value={interviewerEmpId}
                  onChange={(e) => setInterviewerEmpId(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="">Select Interviewer</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Virtual Meeting Link / Location</label>
                <input
                  type="text"
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  value={interviewMeetingUrl}
                  onChange={(e) => setInterviewMeetingUrl(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInterviewMutation.isPending}
                  className="btn text-xs font-semibold px-4 py-2"
                >
                  {createInterviewMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details & Eligibility Modal */}
      {selectedJobDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-text">{selectedJobDetail.title}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    selectedJobDetail.status === 'open' ? 'bg-green-100 text-green-800' :
                    selectedJobDetail.status === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedJobDetail.status}
                  </span>
                </div>
                <p className="text-xs text-secondary mt-1">
                  Requisition ID: <span className="font-mono">{selectedJobDetail.id.slice(0, 8)}</span> • {selectedJobDetail.openings} Openings • {selectedJobDetail.employment_type?.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Overview & Stats */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-center text-xs">
                <div>
                  <span className="text-gray-500 block">Department</span>
                  <span className="font-semibold text-text">
                    {departments.find((d: any) => d.id === selectedJobDetail.department_id)?.name || 'General / All'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Employment Type</span>
                  <span className="font-semibold text-text capitalize">{selectedJobDetail.employment_type?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Total Vacancies</span>
                  <span className="font-semibold text-text">{selectedJobDetail.openings} Positions</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Job Description & Responsibilities</h4>
                <div className="p-4 bg-purple-50/40 rounded-lg text-sm text-text border border-purple-100 whitespace-pre-line leading-relaxed">
                  {selectedJobDetail.description || 'No detailed description provided for this requisition.'}
                </div>
              </div>

              {/* Eligibility & Candidate Requirements */}
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Role Eligibility & Requirements</h4>
                <ul className="space-y-2 text-xs text-text bg-gray-50 p-4 rounded-lg border border-border">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Relevant domain experience and proven track record in software/HR systems.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Strong communication skills and collaborative team mindset.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Open to all active candidates & internal employee referrals.</span>
                  </li>
                </ul>
              </div>

              {/* Referral Bonus Policy */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">Employee Referral Program</h5>
                    <p className="text-[11px] text-emerald-700">Confirmatory referral bonus ($500) awarded to staff upon candidate completing probation.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center border-t border-border pt-4">
              {isAdminOrManager ? (
                <button
                  onClick={() => {
                    const newStatus = selectedJobDetail.status === 'closed' ? 'open' : 'closed';
                    updateJobStatusMutation.mutate({ jobId: selectedJobDetail.id, status: newStatus });
                  }}
                  disabled={updateJobStatusMutation.isPending}
                  className={`btn-outline text-xs px-4 py-2 ${
                    selectedJobDetail.status === 'closed' ? 'text-green-700 hover:bg-green-50 border-green-300' : 'text-red-700 hover:bg-red-50 border-red-300'
                  }`}
                >
                  {selectedJobDetail.status === 'closed' ? 'Reopen Job Opening' : 'Close Job Opening'}
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobDetail(null)}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Close Window
                </button>
                <button
                  onClick={() => {
                    const jId = selectedJobDetail.id;
                    setSelectedJobDetail(null);
                    openCandidateModal(jId);
                  }}
                  className="btn px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Refer Candidate for this Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resume Document Viewer Modal */}
      {selectedResumeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Resume & Referral Inspection
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Candidate: <strong className="text-text">{selectedResumeModal.first_name} {selectedResumeModal.last_name}</strong> ({selectedResumeModal.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Document Viewer */}
              {selectedResumeModal.resume_url ? (
                selectedResumeModal.resume_url.startsWith('data:application/pdf') || selectedResumeModal.resume_url.startsWith('http') ? (
                  <div className="border border-border rounded-lg h-96 overflow-hidden bg-gray-50 flex flex-col items-center justify-center">
                    <iframe src={selectedResumeModal.resume_url} className="w-full h-full" title="Resume Document Preview" />
                  </div>
                ) : (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-xs space-y-2">
                    <div className="font-bold text-purple-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-700" />
                      Attached Resume Document Link:
                    </div>
                    <a
                      href={selectedResumeModal.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-mono text-xs break-all block"
                    >
                      {selectedResumeModal.resume_url}
                    </a>
                  </div>
                )
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                  No resume document attached for this candidate.
                </div>
              )}

              {/* Candidate Info Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
                <div>
                  <span className="text-gray-500 block">Position Applied For</span>
                  <span className="font-semibold text-text">
                    {jobs.find((j: any) => j.id === selectedResumeModal.job_id)?.title || 'General Talent Pool'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Referral Status</span>
                  <span className="font-semibold text-text capitalize">{selectedResumeModal.stage}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-between items-center border-t border-border pt-3">
              <button
                onClick={() => setSelectedResumeModal(null)}
                className="btn-outline text-xs px-4 py-2"
              >
                Close Preview
              </button>

              {isAdminOrManager && selectedResumeModal.stage === 'applied' && (
                <button
                  onClick={() => {
                    const cId = selectedResumeModal.id;
                    setSelectedResumeModal(null);
                    approveReferralMutation.mutate(cId);
                  }}
                  className="btn text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Referral & Send Candidate Notification Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
