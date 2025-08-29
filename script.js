// Get references to the HTML elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

let supaClient; // Declare supaClient here

// NEW: Create an async function to initialize the app
async function initializeApp() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        
        // Add the event listener AFTER the client is initialized
        loginForm.addEventListener('submit', handleLogin);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        errorMessage.textContent = 'Error: Could not load application configuration.';
    }
}

// NEW: Move the login logic into its own function
async function handleLogin(event) {
    event.preventDefault();
    errorMessage.textContent = '';

    const email = emailInput.value;
    const password = passwordInput.value;

    const { data, error } = await supaClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorMessage.textContent = `Error: ${error.message}`;
        console.error('Login failed:', error);
    } else if (data.user) {
        console.log('Login successful:', data.user);
        window.location.href = 'start.html'; // Redirect to start.html, not main.html
    }
}

// Start the initialization process
initializeApp();


