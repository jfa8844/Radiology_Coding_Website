// test-env.js
require('dotenv').config();

console.log('--- TEST SCRIPT ---');
console.log('URL from env is:', process.env.SUPABASE_URL);
console.log('KEY from env is:', process.env.SUPABASE_ANON_KEY);
console.log('-------------------');