// IMPORTANT: Replace with your Supabase project's URL and Anon Key
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM'

// Initialize the Supabase client
// We are calling the createClient function from the global `supabase` object provided by the CDN script.
// We are storing the created client in a new variable `supaClient` to avoid naming conflicts.
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get references to the HTML elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Add an event listener to the login form
loginForm.addEventListener('submit', async (event) => {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Clear any previous error messages
    errorMessage.textContent = '';

    // Get the user's email and password from the form
    const email = emailInput.value;
    const password = passwordInput.value;

    // Use the Supabase client to sign in the user
    const { data, error } = await supaClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // If there was an error, display it to the user
        errorMessage.textContent = `Error: ${error.message}`;
        console.error('Login failed:', error);
    } else if (data.user) {
        // If login was successful, redirect to the main page
        console.log('Login successful:', data.user);
        // We will create main.html in a later step
        window.location.href = 'main.html';
    }
});
