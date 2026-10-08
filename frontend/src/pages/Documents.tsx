import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { FileText, Plus, Download, Folder, UploadCloud } from 'lucide-react';

export default function Documents() {
  const { orgId } = useAppStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Policy');
  const [fileUrl, setFileUrl] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', orgId],
    queryFn: () => api(`/api/documents?org_id=${orgId}`),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api('/api/documents', {
        method: 'POST',
        body: JSON.stringify({ payload: { organization_id: orgId, ...data } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', orgId] });
      setShowModal(false);
      setTitle('');
      setFileUrl('');
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createMutation.mutate({
      name: title,
      category,
      file_url: fileUrl || 'https://example.com/doc.pdf',
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Documents & Policies</h2>
          <p className="text-sm text-secondary">Central repository for company handbooks, NDA agreements, and employee files.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn flex items-center justify-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-text mb-4">Document Repository</h3>
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-secondary">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No documents uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc: any) => (
              <div key={doc.id} className="p-4 border border-border rounded-lg hover:border-primary transition-colors flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-text text-sm truncate">{doc.name || 'Untitled Document'}</h4>
                  <p className="text-xs text-secondary mt-0.5">{doc.category || 'General'}</p>
                  <a
                    href={doc.file_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                  >
                    <Download className="w-3 h-3" /> View / Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">Upload Document</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Employee Handbook 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                >
                  <option value="Policy">Company Policy / Handbook</option>
                  <option value="Contract">Employment Contract / NDA</option>
                  <option value="Identity">ID / Compliance Document</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Document URL / File Link</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full border border-border rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn text-sm"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
