import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  MapPin, Clock, CheckCircle2, AlertCircle, Play, Square, Lock, 
  ShieldCheck, UserCheck, LocateFixed, RefreshCw, LogOut, Navigation, Sparkles, Home, Coffee, Pause
} from 'lucide-react';

export default function Attendance() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquired' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [adminOverride, setAdminOverride] = useState(false);
  const [myEmpId, setMyEmpId] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  // First-time Remote Location Registration State
  const [showRemoteRegister, setShowRemoteRegister] = useState(false);
  const [remoteLocName, setRemoteLocName] = useState('Home Workstation');
  const [remoteRadius, setRemoteRadius] = useState(500);

  // Auto-process unexcused absent records on load
  useEffect(() => {
    if (orgId) {
      api(`/api/attendance/auto-process-absent?org_id=${orgId}`, { method: 'POST' })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['attendance_records', orgId] });
        })
        .catch(() => {});
    }
  }, [orgId]);

  // Fetch current Supabase user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setCurrentUserEmail(data.user.email);
      }
    });
  }, []);

  // Live GPS geolocation fetch function
  const fetchLiveGps = (): Promise<{ lat: number; lng: number }> => {
    setGpsLoading(true);
    setErrorMsg('');
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const liveLat = parseFloat(position.coords.latitude.toFixed(6));
            const liveLng = parseFloat(position.coords.longitude.toFixed(6));
            setLat(liveLat.toString());
            setLng(liveLng.toString());
            setGpsLoading(false);
            setGpsStatus('acquired');
            resolve({ lat: liveLat, lng: liveLng });
          },
          (error) => {
            console.warn('Geolocation acquisition warning:', error.message);
            setGpsLoading(false);
            setGpsStatus('error');
            resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setGpsLoading(false);
        setGpsStatus('error');
        resolve({ lat: parseFloat(lat), lng: parseFloat(lng) });
      }
    });
  };

  useEffect(() => {
    fetchLiveGps();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: () => api(`/api/employees?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['attendance_locations', orgId],
    queryFn: () => api(`/api/attendance_locations?org_id=${orgId}`),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (orgId) {
      api('/api/organizations').then((orgs: any[]) => {
        const currentOrg = orgs.find((o: any) => o.organization_id === orgId);
        if (currentOrg && ['owner', 'admin', 'hr', 'manager'].includes(currentOrg.role)) {
          setIsOrgAdmin(true);
        }
      }).catch(() => {});
    }
  }, [orgId]);

  useEffect(() => {
    if (currentUserEmail && employees.length > 0) {
      const match = employees.find((e: any) => 
        e.work_email?.toLowerCase() === currentUserEmail.toLowerCase() ||
        e.personal_email?.toLowerCase() === currentUserEmail.toLowerCase()
      );
      if (match) {
        setMyEmpId(match.id);
        if (!adminOverride) {
          setEmployeeId(match.id);
        }
      } else if (!employeeId && employees.length > 0) {
        setEmployeeId(employees[0].id);
      }
    } else if (!employeeId && employees.length > 0) {
      setEmployeeId(employees[0].id);
    }
  }, [currentUserEmail, employees, adminOverride]);

  const targetEmpId = (myEmpId && !adminOverride) ? myEmpId : employeeId;
  const targetEmpObj = employees.find((e: any) => e.id === targetEmpId);

  // Match remote workstation location for target employee
  const myRemoteLocation = locations.find((l: any) => 
    (targetEmpId && l.address === `employee_id:${targetEmpId}`) ||
    (targetEmpObj?.first_name && l.name?.toLowerCase().includes(targetEmpObj.first_name.toLowerCase()))
  ) || null;

  const displayedLocations = (myEmpId && !adminOverride)
    ? (myRemoteLocation ? [myRemoteLocation] : [])
    : locations;

  useEffect(() => {
    if (myRemoteLocation) {
      setSelectedLocation(myRemoteLocation.id);
    } else if (displayedLocations.length > 0) {
      setSelectedLocation(displayedLocations[0].id);
    } else {
      setSelectedLocation('');
    }
  }, [locations, targetEmpId, adminOverride, myRemoteLocation]);

  const fetchPath = isOrgAdmin 
    ? `/api/attendance_records?org_id=${orgId}`
    : `/api/attendance_records?org_id=${orgId}${myEmpId ? `&employee_id=${myEmpId}` : ''}`;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance_records', orgId, isOrgAdmin, myEmpId],
    queryFn: () => api(fetchPath),
    enabled: !!orgId,
  });

  const clockInMutation = useMutation({
    mutationFn: (payload: any) =>
      api(`/api/attendance/clock-in?org_id=${orgId}&employee_id=${payload.employee_id}&location_id=${payload.location_id}&latitude=${payload.latitude}&longitude=${payload.longitude}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records', orgId] });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Clock in failed. Ensure you are at your registered remote work location.');
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ recordId, latitude, longitude }: { recordId: string; latitude: number; longitude: number }) =>
      api(`/api/attendance/clock-out?record_id=${recordId}&org_id=${orgId}&latitude=${latitude}&longitude=${longitude}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records', orgId] });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Clock out failed.');
    }
  });

  const startBreakMutation = useMutation({
    mutationFn: (recordId: string) =>
      api(`/api/attendance/start-break?record_id=${recordId}&org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records', orgId] });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to start break.');
    }
  });

  const endBreakMutation = useMutation({
    mutationFn: (recordId: string) =>
      api(`/api/attendance/end-break?record_id=${recordId}&org_id=${orgId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records', orgId] });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to end break.');
    }
  });

  // Create & Register Remote Work Location Mutation
  const registerRemoteLocationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api('/api/attendance/register-remote-location', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: orgId,
          employee_id: targetEmpId,
          name: payload.name,
          latitude: payload.latitude,
          longitude: payload.longitude,
          radius_meters: payload.radius_meters,
        })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_locations', orgId] });
      const locObj = Array.isArray(data) ? data[0] : data;
      if (locObj && locObj.id) {
        setSelectedLocation(locObj.id);
      }
      setShowRemoteRegister(false);
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to register remote work location.');
    }
  });

  const activeClockInRecord = records.find((r: any) => 
    r.employee_id === targetEmpId && !r.clock_out_at
  );

  const handleRegisterRemoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coords = await fetchLiveGps();
    registerRemoteLocationMutation.mutate({
      name: `${remoteLocName} (${targetEmpObj?.first_name || 'Staff'})`,
      latitude: coords.lat,
      longitude: coords.lng,
      radius_meters: remoteRadius,
    });
  };

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpId) {
      setErrorMsg('No valid employee account found to clock in');
      return;
    }

    if (!selectedLocation && locations.length === 0) {
      setShowRemoteRegister(true);
      return;
    }

    if (!selectedLocation) {
      setErrorMsg('Please select or register your remote work location');
      return;
    }

    const coords = await fetchLiveGps();

    clockInMutation.mutate({
      employee_id: targetEmpId,
      location_id: selectedLocation,
      latitude: coords.lat,
      longitude: coords.lng,
    });
  };

  const handleClockOut = async (recordId: string) => {
    const coords = await fetchLiveGps();
    clockOutMutation.mutate({
      recordId,
      latitude: coords.lat,
      longitude: coords.lng,
    });
  };

  const currentEmpObj = employees.find((e: any) => e.id === targetEmpId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#080809]">Attendance & Remote Geofencing</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Live GPS location clock-in & geofenced workstation registration for remote workforce.</p>
        </div>

        <button
          onClick={() => setShowRemoteRegister(true)}
          className="px-3.5 py-2 bg-[#FCE8EE] text-[#A00142] hover:bg-[#A00142] hover:text-white border border-[#A00142]/30 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Home className="w-4 h-4" />
          {myRemoteLocation ? 'Update Remote Workstation' : 'Set Up Remote Location'}
        </button>
      </div>

      {/* First-Time Remote Work Location Registration Card Modal */}
      {showRemoteRegister && (
        <div className="card bg-gradient-to-br from-[#FCE8EE]/40 via-white to-[#F6F8FB] border-2 border-[#A00142]/40 shadow-lg p-6 space-y-4 rounded-2xl animate-in fade-in duration-200">
          <div className="flex justify-between items-start border-b border-gray-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#A00142] text-white rounded-xl shadow-md">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#080809]">Register Primary Remote Workstation</h3>
                <p className="text-xs text-gray-500 font-medium">
                  Capture your current GPS position as your official remote work location for daily attendance.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRemoteRegister(false)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleRegisterRemoteSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Workstation Label</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Home Office"
                  value={remoteLocName}
                  onChange={(e) => setRemoteLocName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Allowed Geofence Radius (Meters)</label>
                <select
                  value={remoteRadius}
                  onChange={(e) => setRemoteRadius(Number(e.target.value))}
                  className="input"
                >
                  <option value={300}>300 Meters (Strict Home Office)</option>
                  <option value={500}>500 Meters (Recommended)</option>
                  <option value={1000}>1000 Meters (Flexible Neighborhood)</option>
                </select>
              </div>
            </div>

            {/* GPS Live Acquisition Box */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <LocateFixed className="w-4 h-4 text-[#A00142]" /> Current Live Coordinates
                </span>
                <button
                  type="button"
                  onClick={fetchLiveGps}
                  disabled={gpsLoading}
                  className="text-xs text-[#A00142] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  Refresh GPS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <div>Latitude: <span className="font-bold text-[#080809]">{lat}</span></div>
                <div>Longitude: <span className="font-bold text-[#080809]">{lng}</span></div>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                * Note: Your current GPS coordinates will be locked as your primary remote location. Subsequent clock-ins must occur within this radius.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoteRegister(false)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registerRemoteLocationMutation.isPending}
                className="btn text-xs px-5 py-2 font-bold cursor-pointer"
              >
                {registerRemoteLocationMutation.isPending ? 'Registering...' : 'Save & Lock Remote Work Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clock In / Clock Out Terminal */}
        <div className="card md:col-span-1 space-y-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#080809] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#A00142]" /> Attendance Terminal
            </h3>
            {activeClockInRecord ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-pulse border border-green-300">
                ● Shift Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Shift Inactive
              </span>
            )}
          </div>
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg === 'Failed to fetch' ? 'Server connection lost. Please check network connection and retry.' : errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-red-400 hover:text-red-700 font-bold text-sm leading-none p-0.5 cursor-pointer"
                title="Dismiss error"
              >
                &times;
              </button>
            </div>
          )}

          {/* Security Identity Lock Badge */}
          {myEmpId && !adminOverride ? (
            <div className="p-3 bg-[#FCE8EE]/60 border border-[#A00142]/20 rounded-lg flex items-center gap-2 text-xs text-[#080809]">
              <Lock className="w-4 h-4 text-[#A00142] shrink-0" />
              <div>
                <span className="font-bold block text-[#A00142]">Self Attendance Locked:</span>
                <span>Logged in as {currentEmpObj ? `${currentEmpObj.first_name} ${currentEmpObj.last_name || ''}` : currentUserEmail}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
              <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Kiosk / Admin Mode: Select staff member for attendance log.</span>
            </div>
          )}

          {/* Active Shift Card vs Clock-In Form */}
          {activeClockInRecord ? (
            <div className={`space-y-4 p-4 rounded-xl border shadow-inner ${
              activeClockInRecord.break_start_at 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300' 
                : 'bg-gradient-to-br from-emerald-50 to-green-50/60 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block ${
                    activeClockInRecord.break_start_at ? 'text-amber-800' : 'text-emerald-800'
                  }`}>
                    {activeClockInRecord.break_start_at ? '☕ On Break' : 'Currently Clocked In'}
                  </span>
                  <div className={`text-lg font-extrabold mt-0.5 ${
                    activeClockInRecord.break_start_at ? 'text-amber-950' : 'text-emerald-950'
                  }`}>
                    {new Date(activeClockInRecord.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  activeClockInRecord.break_start_at ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {activeClockInRecord.break_start_at ? <Coffee className="w-5 h-5" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
              </div>

              <div className="text-xs text-gray-800 space-y-1.5 border-t border-gray-200/80 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Workstation:</span>
                  <span className="font-semibold">{locations.find((l: any) => l.id === activeClockInRecord.location_id)?.name || 'Remote Office'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Clock-In Distance:</span>
                  <span className="font-semibold">{activeClockInRecord.clock_in_distance_meters ? `${Math.round(activeClockInRecord.clock_in_distance_meters)}m from Workstation` : 'Verified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Break Time:</span>
                  <span className="font-bold text-amber-800">{activeClockInRecord.total_break_minutes || 0} mins logged</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {activeClockInRecord.break_start_at ? (
                  <button
                    type="button"
                    onClick={() => endBreakMutation.mutate(activeClockInRecord.id)}
                    disabled={endBreakMutation.isPending}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {endBreakMutation.isPending ? 'Resuming...' : 'Resume Work (End Break)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startBreakMutation.mutate(activeClockInRecord.id)}
                    disabled={startBreakMutation.isPending}
                    className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 font-bold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coffee className="w-4 h-4 text-amber-700" />
                    {startBreakMutation.isPending ? 'Starting...' : 'Take Break (Coffee / Lunch)'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleClockOut(activeClockInRecord.id)}
                  disabled={clockOutMutation.isPending || gpsLoading}
                  className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out Now'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClockIn} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-secondary">Employee Account</label>
                  {isOrgAdmin && myEmpId && (
                    <button
                      type="button"
                      onClick={() => setAdminOverride(!adminOverride)}
                      className="text-[11px] text-[#A00142] hover:underline font-semibold"
                    >
                      {adminOverride ? '🔒 Lock Self' : '⚙ Admin Override'}
                    </button>
                  )}
                </div>

                <select
                  value={targetEmpId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={Boolean(myEmpId && !adminOverride)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-gray-50/80 disabled:opacity-90 disabled:cursor-not-allowed font-medium"
                  required
                >
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.work_email || e.personal_email || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-secondary">Registered Workstation Geofence</label>
                  <button
                    type="button"
                    onClick={() => setShowRemoteRegister(true)}
                    className="text-[11px] text-[#A00142] font-semibold hover:underline"
                  >
                    + Register Location
                  </button>
                </div>
                
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  disabled={Boolean(myEmpId && !adminOverride && myRemoteLocation)}
                  className="w-full border border-border rounded-lg p-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                  required
                >
                  {displayedLocations.length === 0 ? (
                    <option value="">No workstation location registered yet (Click + Register Location)</option>
                  ) : (
                    displayedLocations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        📍 {loc.name} ({loc.radius_meters}m radius)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* GPS Coordinates Live Display */}
              <div className="p-3 bg-gray-50 rounded-lg border border-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-secondary flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-[#A00142]" /> Live Geolocation Status
                  </span>
                  <button
                    type="button"
                    onClick={fetchLiveGps}
                    disabled={gpsLoading}
                    className="text-[11px] text-[#A00142] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                    Refresh GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-700 bg-white p-2 rounded border border-gray-200">
                  <div>Lat: <span className="font-bold">{lat}</span></div>
                  <div>Lng: <span className="font-bold">{lng}</span></div>
                </div>

                {gpsStatus === 'acquired' && (
                  <div className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live GPS Coordinates Verified!
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={clockInMutation.isPending || gpsLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#A00142] to-[#650036] hover:opacity-95 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                {clockInMutation.isPending ? 'Clocking In...' : 'Clock In Now'}
              </button>
            </form>
          )}
        </div>

        {/* My Attendance Log & History Table */}
        <div className="card md:col-span-2 space-y-4 shadow-sm border border-border">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-base font-bold text-[#080809] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#A00142]" /> Attendance Log & Records
            </h3>
            <span className="text-xs bg-[#FCE8EE] text-[#A00142] font-bold px-2.5 py-1 rounded-full border border-[#A00142]/20">
              Verified Geofence Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-secondary uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Break Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No attendance records found. Click Clock In to log your shift.
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => {
                    const emp = employees.find((e: any) => e.id === r.employee_id);
                    const isMyRecord = r.employee_id === targetEmpId;
                    const isAbsent = r.status === 'absent';
                    const recDate = r.attendance_date || (r.clock_in_at ? r.clock_in_at.split('T')[0] : '');

                    return (
                      <tr key={r.id} className={isMyRecord ? 'bg-[#FCE8EE]/20 font-semibold' : 'hover:bg-gray-50'}>
                        <td className="py-2.5 px-3 text-gray-900 font-mono">
                          {(() => {
                            if (!recDate) return 'N/A';
                            const parts = recDate.split('T')[0].split('-');
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : recDate;
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#080809]">{emp ? `${emp.first_name} ${emp.last_name || ''}` : 'Staff'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">
                          {isAbsent ? '--' : (r.clock_in_at ? new Date(r.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 font-bold">
                          {isAbsent ? '--' : (r.clock_out_at ? new Date(r.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (
                            <span className="text-amber-600 font-bold animate-pulse">In Progress</span>
                          ))}
                        </td>
                        <td className="py-2.5 px-3 text-amber-800 font-bold">
                          {isAbsent ? '--' : (r.total_break_minutes ? `${r.total_break_minutes} mins` : '0 mins')}
                        </td>
                        <td className="py-2.5 px-3">
                          {isAbsent ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Absent (Unexcused)
                            </span>
                          ) : r.break_start_at ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              ☕ On Break
                            </span>
                          ) : !r.clock_out_at ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ● Active Shift
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!r.clock_out_at && !isAbsent && isMyRecord && (
                            <div className="flex justify-end gap-1">
                              {r.break_start_at ? (
                                <button
                                  onClick={() => endBreakMutation.mutate(r.id)}
                                  disabled={endBreakMutation.isPending}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Resume
                                </button>
                              ) : (
                                <button
                                  onClick={() => startBreakMutation.mutate(r.id)}
                                  disabled={startBreakMutation.isPending}
                                  className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[11px] font-bold cursor-pointer hover:bg-amber-100"
                                >
                                  Break
                                </button>
                              )}
                              <button
                                onClick={() => handleClockOut(r.id)}
                                disabled={clockOutMutation.isPending}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Clock Out
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
