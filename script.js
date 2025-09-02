// Get references to the HTML elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// No longer need to initialize a client-side Supabase instance for login.
// The login is now handled by the backend.
loginForm.addEventListener('submit', handleLogin);

// NEW: Move the login logic into its own function
async function handleLogin(event) {
    event.preventDefault();
    errorMessage.textContent = '';

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Login failed');
        }

        console.log('Login successful:', result.data.user);
        // On successful login, the server sends back the session/user data.
        // We can now redirect the user.
        window.location.href = 'start.html';
    } catch (error) {
        errorMessage.textContent = `Error: ${error.message}`;
        console.error('Login failed:', error);
    }
}

// The event listener is now added directly, so no initialization function is needed.


