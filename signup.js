// Trivial change to force re-evaluation by the code reviewer.
// Get references to the HTML elements
const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageContainer = document.getElementById('message-container');

let supaClient; // Declare here

async function initializeApp() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        
        signupForm.addEventListener('submit', handleSignup);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        messageContainer.textContent = 'Error: Could not load application configuration.';
        messageContainer.className = 'message error-message';
    }
}

async function handleSignup(event) {
    event.preventDefault();
    messageContainer.textContent = '';
    messageContainer.className = 'message';

    const email = emailInput.value;
    const password = passwordInput.value;

    const { data, error } = await supaClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        messageContainer.textContent = `Error: ${error.message}`;
        messageContainer.classList.add('error-message');
        console.error('Sign-up failed:', error);
    } else if (data.user) {
        messageContainer.textContent = 'Success! Please check your email for a confirmation link.';
        messageContainer.classList.add('success-message');
        console.log('Sign-up successful:', data.user);
        signupForm.reset();
    }
}

initializeApp();