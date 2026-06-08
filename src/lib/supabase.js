import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://zmoowkmsdxaezzbhqivu.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptb293a21zZHhhZXp6YmhxaXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQwOTYsImV4cCI6MjA5NjQ1MDA5Nn0.CAC2oesw3nuzaMSpbEtmc7JIKW6Hm2Sm8vsWt77UqJ0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
