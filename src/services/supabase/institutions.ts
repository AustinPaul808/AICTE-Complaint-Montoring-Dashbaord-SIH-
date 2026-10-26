import { supabase, isSupabaseConfigured } from './client';
import type { Database } from '../../types/database.types';

export type Institution = Database['public']['Tables']['institutions']['Row'];
export type NewInstitution = Database['public']['Tables']['institutions']['Insert'];

export const DEFAULT_INSTITUTIONS: Institution[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    institution_name: 'Delhi Engineering & Technology Institute',
    aicte_permanent_id: '1-1049281941',
    address: 'Sector 12, Dwarka, New Delhi',
    state: 'Delhi',
    district: 'South West Delhi',
    institution_type: 'Self-Financed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    institution_name: 'College of Engineering Pune (COEP)',
    aicte_permanent_id: '1-2094819284',
    address: 'Wellesley Rd, Shivajinagar, Pune',
    state: 'Maharashtra',
    district: 'Pune',
    institution_type: 'Government-Aided',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    institution_name: 'National Institute of Advanced Technology',
    aicte_permanent_id: '1-3091829481',
    address: 'Electronic City, Phase 1, Hosur Road, Bengaluru',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    institution_type: 'Private Deemed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    institution_name: 'Apex Institute of Technology & Management',
    aicte_permanent_id: '1-4920194821',
    address: 'Knowledge Park III, Greater Noida',
    state: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    institution_type: 'Self-Financed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    institution_name: 'Vidyapeeth Institute of Science & Technology',
    aicte_permanent_id: '1-5918209412',
    address: 'Bhopal-Indore Bypass Road, Bhopal',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    institution_type: 'Self-Financed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    institution_name: 'Chennai Institute of Engineering & Research',
    aicte_permanent_id: '1-6819204912',
    address: 'Old Mahabalipuram Rd, Sholinganallur, Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    institution_type: 'Self-Financed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export async function getInstitutions(searchTerm?: string): Promise<Institution[]> {
  let list = DEFAULT_INSTITUTIONS;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('institutions')
        .select('*')
        .order('institution_name', { ascending: true });

      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`institution_name.ilike.${term},aicte_permanent_id.ilike.${term},state.ilike.${term}`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getInstitutions error, using defaults:', err);
    }
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    return list.filter(
      (inst) =>
        inst.institution_name.toLowerCase().includes(term) ||
        (inst.aicte_permanent_id || '').toLowerCase().includes(term) ||
        inst.state.toLowerCase().includes(term)
    );
  }

  return list;
}

export async function createInstitution(institution: NewInstitution): Promise<Institution> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .insert(institution)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase createInstitution error:', err);
    }
  }

  const created: Institution = {
    id: 'a' + Math.random().toString(36).substring(2, 9),
    institution_name: institution.institution_name,
    aicte_permanent_id: institution.aicte_permanent_id || null,
    address: institution.address || null,
    state: institution.state,
    district: institution.district || null,
    institution_type: institution.institution_type || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  DEFAULT_INSTITUTIONS.push(created);
  return created;
}
