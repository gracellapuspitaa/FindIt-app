// js/supabase-frontend.js

const supabaseUrlFrontend = 'https://laypnvojvagehfgkixme.supabase.co'; 
const supabaseKeyFrontend = 'sb_publishable_FJjDoh8QiVknZwwVLke64A_zrZcSfft';

// Gunakan nama 'supabaseClient' agar tidak bentrok dengan bawaan CDN
const supabaseClient = supabase.createClient(supabaseUrlFrontend, supabaseKeyFrontend);