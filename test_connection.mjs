import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Testing connection to Supabase project:', url);
const supabase = createClient(url, key);

async function test() {
  try {
    const { data: depts, error: deptError } = await supabase.from('departments').select('name, code');
    if (deptError) {
      console.error('Error querying departments:', deptError);
      return;
    }
    console.log('SUCCESS: Departments fetched from live Supabase DB:', depts);

    const { data: insts, error: instError } = await supabase.from('institutions').select('institution_name, aicte_permanent_id').limit(3);
    if (instError) {
      console.error('Error querying institutions:', instError);
      return;
    }
    console.log('SUCCESS: Institutions fetched:', insts);

    const { data: comps, count, error: compError } = await supabase.from('complaints').select('complaint_number, title, status, priority', { count: 'exact' });
    if (compError) {
      console.error('Error querying complaints:', compError);
      return;
    }
    console.log(`SUCCESS: Complaints fetched (${comps.length} records):`, comps);
  } catch (e) {
    console.error('Unexpected exception:', e);
  }
}

test();
