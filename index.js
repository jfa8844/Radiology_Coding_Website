require('dotenv').config();
const express = require('express');
const path = require('path');
const supabase = require('./lib/supabaseClient');
const app = express();
const port = 3000;

// This line tells Express to serve any static files from the same directory this script is in
// This will make index.html, signup.html, and style.css available.
app.use(express.static(path.join(__dirname)));

app.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('test').select('*');
    if (error) {
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching from test table:', error);
    res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running and listening on port ${port}. You can now view your website.`);
});
