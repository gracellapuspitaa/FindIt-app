const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Membuat koneksi ke Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;