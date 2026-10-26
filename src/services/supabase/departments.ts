import { supabase, isSupabaseConfigured } from './client';
import type { Database } from '../../types/database.types';

export type Department = Database['public']['Tables']['departments']['Row'];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'Regulation Bureau',
    code: 'RB',
    description: 'Enforces statutory compliance, SCSC scrutiny, and regulatory norms.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    name: 'Public Grievance Redressal Cell',
    code: 'PGRC',
    description: 'Handles public, student and CPGRAMS grievances.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    name: 'Approval Bureau',
    code: 'AB',
    description: 'Institution approvals and EVC inspection reports.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    name: 'Policy & Academic Planning',
    code: 'PAP',
    description: 'Academic curriculum and institutional governance.',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export async function getDepartments(): Promise<Department[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getDepartments error, using defaults:', err);
    }
  }

  return DEFAULT_DEPARTMENTS;
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getDepartmentById error:', err);
    }
  }

  return DEFAULT_DEPARTMENTS.find((d) => d.id === id) || null;
}
