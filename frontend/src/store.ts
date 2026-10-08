import { create } from 'zustand';

interface AppState {
  orgId: string | null;
  orgName: string;
  setOrg: (id: string, name: string) => void;
  clearOrg: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  orgId: localStorage.getItem('hrms_org'),
  orgName: localStorage.getItem('hrms_org_name') || '',
  setOrg: (id, name) => {
    localStorage.setItem('hrms_org', id);
    localStorage.setItem('hrms_org_name', name);
    set({ orgId: id, orgName: name });
  },
  clearOrg: () => {
    localStorage.removeItem('hrms_org');
    localStorage.removeItem('hrms_org_name');
    set({ orgId: null, orgName: '' });
  }
}));
