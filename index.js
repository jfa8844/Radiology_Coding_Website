require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// This line tells Express to serve any static files from the same directory this script is in
// This will make index.html, signup.html, and style.css available.
app.use(express.static(path.join(__dirname)));

// NEW: Add an endpoint to provide the Supabase config to the client
app.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});


app.get('/test', async (req, res) => {
  // This route will now fail because we removed the supabase client.
  // If you need server-side supabase access, you would re-import it
  // from a file that ALSO uses the environment variables.
  res.send("Test route is disabled for now.");
});

app.listen(port, () => {
  console.log(`Server is running and listening on port ${port}. You can now view your website.`);
});