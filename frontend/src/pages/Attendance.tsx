import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  MapPin, Clock, CheckCircle2, AlertCircle, Play, Square, Lock, 
  ShieldCheck, UserCheck, LocateFixed, RefreshCw, LogOut, Navigation 
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
            // Fallback to current lat/lng state
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

  // Fetch live GPS location automatically on page mount
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

  // Fetch organization membership role
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

  // Match logged-in user email with employee record
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

  // Auto select default office location if available
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  // Fetch attendance records
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
      setErrorMsg(err.message || 'Clock in failed. Ensure you are within office geofence.');
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

  // Seed HQ Location if no office location exists
  const seedLocationMutation = useMutation({
    mutationFn: () =>
      api('/api/attendance_locations', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            organization_id: orgId,
            name: 'Headquarters Main Office',
            latitude: 12.9716,
            longitude: 77.5946,
            radius_meters: 5000,
          }
        })
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_locations', orgId] });
      if (data && data[0]) {
        setSelectedLocation(data[0].id);
      }
    }
  });

  const targetEmpId = (myEmpId && !adminOverride) ? myEmpId : employeeId;

  // Find active clock-in record for target employee (not clocked out yet)
  const activeClockInRecord = records.find((r: any) => 
    r.employee_id === targetEmpId && !r.clock_out_at
  );

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpId) {
      setErrorMsg('No valid employee account found to clock in');
      return;
    }

    if (!selectedLocation && locations.length === 0) {
      seedLocationMutation.mutate();
      return;
    }

    if (!selectedLocation) {
      setErrorMsg('Please select an office location');
      return;
    }

    // Refresh live GPS before clocking in
    const coords = await fetchLiveGps();

    clockInMutation.mutate({
      employee_id: targetEmpId,
      location_id: selectedLocation,
      latitude: coords.lat,
      longitude: coords.lng,
    });
  };

  const handleClockOut = async (recordId: string) => {
    // Refresh live GPS before clocking out
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
          <h2 className="text-2xl font-bold text-text">Attendance & Geofencing</h2>
          <p className="text-sm text-secondary font-medium">Real-time live GPS location clock-in and clock-out terminal with geofence verification.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clock In / Clock Out Terminal */}
        <div className="card md:col-span-1 space-y-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Attendance Terminal
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Security Identity Lock Badge */}
          {myEmpId && !adminOverride ? (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg flex items-center gap-2 text-xs text-purple-900">
              <Lock className="w-4 h-4 text-purple-700 shrink-0" />
              <div>
                <span className="font-bold block">Self Attendance Locked:</span>
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
            <div className="space-y-4 bg-gradient-to-br from-emerald-50 to-green-50/60 p-4 rounded-xl border border-emerald-200 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Currently Clocked In</span>
                  <div className="text-lg font-extrabold text-emerald-950 mt-0.5">
                    {new Date(activeClockInRecord.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="text-xs text-emerald-900 space-y-1.5 border-t border-emerald-200/80 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Office Location:</span>
                  <span className="font-semibold">{locations.find((l: any) => l.id === activeClockInRecord.location_id)?.name || 'HQ Main Office'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Clock-In Distance:</span>
                  <span className="font-semibold">{activeClockInRecord.clock_in_distance_meters ? `${Math.round(activeClockInRecord.clock_in_distance_meters)}m from HQ` : 'Verified'}</span>
                </div>
              </div>

              {/* Big Red Clock Out Button */}
              <button
                type="button"
                onClick={() => handleClockOut(activeClockInRecord.id)}
                disabled={clockOutMutation.isPending || gpsLoading}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out Now'}
              </button>
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
                      className="text-[11px] text-primary hover:underline font-semibold"
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
                <label className="block text-xs font-semibold text-secondary mb-1">Target Office Location</label>
                {locations.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => seedLocationMutation.mutate()}
                    disabled={seedLocationMutation.isPending}
                    className="w-full py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {seedLocationMutation.isPending ? 'Setting Location...' : 'Set Headquarters Location'}
                  </button>
                ) : (
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-white"
                    required
                  >
                    {locations.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.radius_meters}m radius)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Live Geolocation Acquisition Display */}
              <div className="p-3 bg-gray-50 border border-border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-purple-600" />
                    Live Geolocation Status
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchLiveGps()}
                    disabled={gpsLoading}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-200"
                  >
                    <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                    Refresh GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-gray-500 font-medium">Latitude</span>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full border border-border rounded p-1.5 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 font-medium">Longitude</span>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full border border-border rounded p-1.5 text-xs font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px]">
                  {gpsLoading ? (
                    <span className="text-purple-600 font-medium flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Acquiring live satellite coordinates...
                    </span>
                  ) : gpsStatus === 'acquired' ? (
                    <span className="text-green-700 font-medium flex items-center gap-1">
                      <LocateFixed className="w-3.5 h-3.5" /> Live GPS Coordinates Verified!
                    </span>
                  ) : (
                    <span className="text-gray-500">Manual / Default Coordinates</span>
                  )}
                </div>
              </div>

              {/* Big Purple Clock In Button */}
              <button
                type="submit"
                disabled={clockInMutation.isPending || gpsLoading}
                className="w-full btn flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                {clockInMutation.isPending ? 'Clocking In...' : 'Clock In Now'}
              </button>
            </form>
          )}
        </div>

        {/* Attendance Log Table */}
        <div className="card md:col-span-2 space-y-4 shadow-sm border border-border">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="text-lg font-bold text-text">
              {isOrgAdmin ? "Today's Organization Attendance Log" : "My Attendance Log"}
            </h3>
            {!isOrgAdmin && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-semibold border border-purple-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Self Service Privacy Active
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-secondary">Loading attendance records...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-secondary space-y-2">
              <MapPin className="w-8 h-8 mx-auto text-gray-400" />
              <div className="text-sm font-medium">No clock-in records found for today.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Employee</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Clock In</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Clock Out</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((r: any) => {
                    const emp = employees.find((e: any) => e.id === r.employee_id);
                    const isClockedOut = Boolean(r.clock_out_at);

                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-text">
                          <div className="text-sm font-bold text-text">
                            {emp ? `${emp.first_name} ${emp.last_name || ''}` : r.employee_id}
                          </div>
                          <div className="text-xs text-secondary">{emp?.work_email || emp?.personal_email || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-text font-semibold">
                          {r.clock_in_at ? (
                            <div className="flex items-center gap-1 text-green-700 font-bold">
                              <Play className="w-3 h-3 text-green-600 fill-green-600" />
                              {new Date(r.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-text font-semibold">
                          {r.clock_out_at ? (
                            <div className="flex items-center gap-1 text-red-700 font-bold">
                              <Square className="w-3 h-3 text-red-600 fill-red-600" />
                              {new Date(r.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                              In Progress
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!isClockedOut ? (
                            <button
                              onClick={() => handleClockOut(r.id)}
                              disabled={clockOutMutation.isPending || gpsLoading}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Clock Out
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Shift Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
