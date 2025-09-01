const { createClient } = require('@supabase/supabase-js');

// It's safe to use environment variables here because `dotenv` will be configured in `index.js` before this module is loaded.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
