import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://fiyrygxnqexjyvimdjps.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeXJ5Z3hucWV4anl2aW1kanBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk5MTU1MCwiZXhwIjoyMTAzNTY3NTUwfQ.s5pSS5G2IXCn0WSuDSc-ujM2gzi9kOmJAo5VXZjFLyc';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl).trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || defaultKey).trim();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


