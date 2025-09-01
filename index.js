const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const app = express();
const port = 3000;

// This line tells Express to serve any static files from the same directory this script is in
// This will make index.html, signup.html, and style.css available.
app.use(express.static(path.join(__dirname)));

// NEW: Add an endpoint to provide the Supabase config to the client
app.get('/config', (req, res) => {
  let supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // If running in a GitHub Codespace, override the URL for the client.
  // This is necessary because the client needs the public URL, not the internal one.
  if (process.env.CODESPACE_NAME) {
    const codespaceName = process.env.CODESPACE_NAME;
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    // The Supabase API is on port 54321
    supabaseUrl = `https://${codespaceName}-54321.${domain}`;
  }

  res.json({
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey
  });
});


const supabase = require('./lib/supabaseClient'); // Import the server-side client

app.get('/test', async (req, res) => {
  // This route now uses the server-side Supabase client to test the connection.
  const { data, error } = await supabase.from('procedures').select('id').limit(1);

  if (error) {
    console.error('Supabase query error:', error);
    return res.status(500).json({ error: 'Failed to connect to Supabase.', details: error.message });
  }

  if (data) {
    res.json({ success: true, message: 'Successfully connected to Supabase and fetched data.', data });
  } else {
    res.status(404).json({ error: 'Could not fetch test data from Supabase.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running and listening on port ${port}. You can now view your website.`);
});