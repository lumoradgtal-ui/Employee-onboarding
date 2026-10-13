import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { 
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, 
  Trash2, X, Users, RefreshCw, FileText, Check
} from 'lucide-react';

interface ParsedEmployeeRow {
  id: string; // temporary row ID for React key
  first_name: string;
  last_name?: string;
  work_email?: string;
  personal_email?: string;
  phone?: string;
  department_name?: string;
  designation_name?: string;
  employment_type?: string;
  status?: string;
  date_of_joining?: string;
  employee_code?: string;
  location?: string;
  isValid: boolean;
  validationError?: string;
}

interface BulkEmployeeImportModalProps {
  orgId?: string | null;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkEmployeeImportModal({
  orgId: propOrgId,
  isOpen = true,
  onClose,
  onSuccess,
}: BulkEmployeeImportModalProps) {
  const storeOrgId = useAppStore((s) => s.orgId);
  const orgId = propOrgId || storeOrgId;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [autoProvision, setAutoProvision] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skipped: number;
    provisioned: number;
  } | null>(null);

  const bulkImportMutation = useMutation({
    mutationFn: async (employees: ParsedEmployeeRow[]) => {
      const payloadEmployees = employees
        .filter((r) => r.isValid)
        .map(({ id, isValid, validationError, ...rest }) => rest);

      return api('/api/employees/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: orgId,
          auto_provision_accounts: autoProvision,
          employees: payloadEmployees,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      queryClient.invalidateQueries({ queryKey: ['userOrganizations'] });
      setImportSummary({
        imported: data.imported_count || 0,
        skipped: data.skipped_count || 0,
        provisioned: data.provisioned_count || 0,
      });
    },
    onError: (err: any) => {
      setParseError(err.message || 'Failed to complete bulk employee import.');
    },
  });

  if (!isOpen) return null;

  // Download official sample Excel template
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const sampleData = [
      {
        'First Name': 'Aarav',
        'Last Name': 'Sharma',
        'Work Email': 'aarav.sharma@company.com',
        'Personal Email': 'aarav@gmail.com',
        'Phone': '+91 9876543210',
        'Department': 'Engineering',
        'Designation': 'Senior Software Engineer',
        'Employment Type': 'full_time',
        'Date of Joining': '2026-10-15',
        'Status': 'active',
        'Location': 'Bengaluru HQ',
        'Employee Code': '',
      },
      {
        'First Name': 'Priya',
        'Last Name': 'Verma',
        'Work Email': 'priya.verma@company.com',
        'Personal Email': 'priya@gmail.com',
        'Phone': '+91 9876543211',
        'Department': 'Product & Design',
        'Designation': 'UI/UX Lead',
        'Employment Type': 'full_time',
        'Date of Joining': '2026-10-20',
        'Status': 'pre_onboarding',
        'Location': 'Remote',
        'Employee Code': '',
      },
      {
        'First Name': 'Dev',
        'Last Name': 'Patel',
        'Work Email': 'dev.patel@company.com',
        'Personal Email': 'dev@gmail.com',
        'Phone': '+91 9876543212',
        'Department': 'Human Resources',
        'Designation': 'Talent Acquisition Specialist',
        'Employment Type': 'full_time',
        'Date of Joining': '2026-11-01',
        'Status': 'onboarding',
        'Location': 'Mumbai Office',
        'Employee Code': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const filename = `HRMS_Employee_Bulk_Template.${format}`;
    XLSX.writeFile(workbook, filename, { bookType: format });
  };

  // Helper to map dynamic column headers to standard fields
  const normalizeRow = (rawRow: Record<string, any>, index: number): ParsedEmployeeRow => {
    const keys = Object.keys(rawRow);
    const getVal = (...aliases: string[]) => {
      for (const a of aliases) {
        const found = keys.find(
          (k) => k.toLowerCase().replace(/[\s_-]/g, '') === a.toLowerCase().replace(/[\s_-]/g, '')
        );
        if (found && rawRow[found] !== undefined && rawRow[found] !== null) {
          return String(rawRow[found]).trim();
        }
      }
      return '';
    };

    const firstName = getVal('first_name', 'firstname', 'fname', 'first');
    const lastName = getVal('last_name', 'lastname', 'lname', 'last');
    const workEmail = getVal('work_email', 'email', 'workemail', 'mail');
    const personalEmail = getVal('personal_email', 'personalemail');
    const phone = getVal('phone', 'mobile', 'contact', 'phonenumber');
    const departmentName = getVal('department', 'department_name', 'dept');
    const designationName = getVal('designation', 'designation_name', 'role', 'title', 'position');
    const employmentType = getVal('employment_type', 'type', 'employment') || 'full_time';
    const status = getVal('status', 'state') || 'active';
    const dateOfJoining = getVal('date_of_joining', 'doj', 'joining_date', 'start_date');
    const employeeCode = getVal('employee_code', 'code', 'emp_code', 'emp_id');
    const location = getVal('location', 'city', 'office');

    let isValid = true;
    let validationError = '';

    if (!firstName) {
      isValid = false;
      validationError = 'Missing First Name (Required)';
    }

    return {
      id: `row-${index}-${Date.now()}`,
      first_name: firstName,
      last_name: lastName || undefined,
      work_email: workEmail || undefined,
      personal_email: personalEmail || undefined,
      phone: phone || undefined,
      department_name: departmentName || undefined,
      designation_name: designationName || undefined,
      employment_type: employmentType,
      status: status,
      date_of_joining: dateOfJoining || undefined,
      employee_code: employeeCode || undefined,
      location: location || undefined,
      isValid,
      validationError,
    };
  };

  // Handle uploaded file (Excel, CSV, or document table)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setParseError('');
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          setParseError('The uploaded spreadsheet contains no employee rows.');
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        const normalized = jsonRows.map((r, i) => normalizeRow(r, i));
        setParsedRows(normalized);
        setIsParsing(false);
      } catch (err: any) {
        setParseError(`Error parsing file: ${err.message || 'Invalid spreadsheet file format.'}`);
        setParsedRows([]);
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setParseError('');
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="card w-full max-w-4xl max-h-[92vh] flex flex-col p-0 shadow-2xl rounded-2xl bg-white overflow-hidden border border-border">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-purple-50/70 via-white to-pink-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#A00142] text-white rounded-xl shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#080809]">
                Bulk Employee Onboarding & Import
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Upload 10 to 1,000+ employees at once via Excel (.xlsx, .xls) or CSV with interactive confirmation preview.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Success Summary View */}
          {importSummary && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>Bulk Import Completed Successfully!</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-gray-500 block">Total Created</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {importSummary.imported} Employees
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-gray-500 block">Skipped / Duplicates</span>
                  <span className="text-xl font-bold text-gray-600">
                    {importSummary.skipped}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-gray-500 block">Login Accounts Provisioned</span>
                  <span className="text-xl font-bold text-purple-700">
                    {importSummary.provisioned} Accounts
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSuccess) onSuccess();
                    onClose();
                  }}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 shadow transition-colors cursor-pointer"
                >
                  Done & View Employee List
                </button>
              </div>
            </div>
          )}

          {!importSummary && (
            <>
              {/* Step 1: Upload or Download Template */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 border-2 border-dashed border-gray-300 hover:border-[#A00142] rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-[#FCE8EE]/20 transition-all cursor-pointer relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .tsv, .txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="p-3 bg-white text-[#A00142] rounded-full shadow-xs border border-gray-200">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-[#080809]">
                        {fileName ? fileName : 'Click to Upload Excel / CSV Spreadsheet'}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Supports .xlsx, .xls, .csv, and tab-delimited files up to 5,000 rows
                      </p>
                    </div>
                    {fileName && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                        File Loaded ({parsedRows.length} rows detected)
                      </span>
                    )}
                  </div>
                </div>

                <div className="card bg-purple-50/50 border border-purple-200/80 p-4 space-y-3 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-purple-900 block mb-1">
                      Need the standard format?
                    </span>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      Download our pre-structured template containing standard columns (Name, Email, Dept, Designation, Date of Joining, etc.)
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('xlsx')}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Excel Template (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('csv')}
                      className="w-full py-1.5 px-3 bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CSV Template (.csv)
                    </button>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Step 2: Confirmation Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 border border-border rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-gray-900">
                        Review Employee List Before Creating:
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {validCount} Ready to Create
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-800">
                          {invalidCount} Missing Required Name
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoProvision}
                        onChange={(e) => setAutoProvision(e.target.checked)}
                        className="rounded border-gray-300 text-[#A00142] focus:ring-[#A00142] cursor-pointer"
                      />
                      <span>Auto-provision portal login accounts & temp password</span>
                    </label>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-100/90 backdrop-blur-xs border-b border-border text-secondary font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Employee Name</th>
                          <th className="py-2 px-3">Work Email</th>
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3">Designation</th>
                          <th className="py-2 px-3">Emp Type</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={!row.isValid ? 'bg-red-50/70' : 'hover:bg-gray-50'}
                          >
                            <td className="py-2 px-3 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                  <Check className="w-3.5 h-3.5" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold" title={row.validationError}>
                                  <AlertCircle className="w-3.5 h-3.5" /> {row.validationError}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold text-[#080809]">
                              {row.first_name} {row.last_name || ''}
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-600">
                              {row.work_email || <span className="text-gray-400 italic">None</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[11px]">
                                {row.department_name || 'General'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {row.designation_name || 'Staff Member'}
                            </td>
                            <td className="py-2 px-3 uppercase text-[10px] text-gray-500 font-semibold">
                              {row.employment_type}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                title="Remove row from import"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importSummary && (
          <div className="p-4 border-t border-border bg-gray-50 flex items-center justify-between">
            <div>
              {parsedRows.length > 0 && (
                <span className="text-xs text-gray-500">
                  Total {validCount} employees will be added to CypherSwift.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCount === 0 || bulkImportMutation.isPending || isParsing}
                onClick={() => bulkImportMutation.mutate(parsedRows)}
                className="btn text-xs px-5 py-2 font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating {validCount} Employees...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirm & Create {validCount} Employees
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
