// IMPORTANT: Replace with your Supabase project's URL and Anon Key
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM'

// Initialize the Supabase client, avoiding the previous naming conflict.
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get references to the HTML elements
const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageContainer = document.getElementById('message-container');

// Add an event listener to the signup form
signupForm.addEventListener('submit', async (event) => {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Clear any previous messages
    messageContainer.textContent = '';
    messageContainer.className = 'message'; // Reset class

    // Get the user's email and password from the form
    const email = emailInput.value;
    const password = passwordInput.value;

    // Use the Supabase client to sign up the user
    const { data, error } = await supaClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        // If there was an error, display it to the user
        messageContainer.textContent = `Error: ${error.message}`;
        messageContainer.classList.add('error-message'); // Style as an error
        console.error('Sign-up failed:', error);
    } else if (data.user) {
        // If sign-up was successful, display a confirmation message
        // By default, Supabase sends a confirmation email.
        messageContainer.textContent = 'Success! Please check your email for a confirmation link to complete your registration.';
        messageContainer.classList.add('success-message'); // Style as a success
        console.log('Sign-up successful:', data.user);
        signupForm.reset(); // Clear the form
    }
});
