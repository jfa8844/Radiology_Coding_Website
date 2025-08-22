// Supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM element references
const startShiftBtn = document.getElementById('start-shift-btn');
const startShiftModal = document.getElementById('start-shift-modal');
const shiftStartTimeInput = document.getElementById('shift-start-time-input');
const confirmStartBtn = document.getElementById('confirm-start-btn');
const cancelStartBtn = document.getElementById('cancel-start-btn');
const logoutBtn = document.getElementById('logout-btn');

// Check user auth status
async function checkAuth() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
    }
}

// Event Listeners
startShiftBtn.addEventListener('click', () => {
    startShiftModal.classList.add('modal-visible');
    // Set default time to now
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - timezoneOffset);
    shiftStartTimeInput.value = localTime.toISOString().slice(0, 16);
});

cancelStartBtn.addEventListener('click', () => {
    startShiftModal.classList.remove('modal-visible');
});

confirmStartBtn.addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        alert('You must be logged in to start a shift.');
        return;
    }

    const startTime = shiftStartTimeInput.value;
    if (!startTime) {
        alert('Please select a start time.');
        return;
    }

    const newShift = {
        user_id: user.id,
        shift_start_time: startTime,
    };

    const { error } = await supaClient
        .from('shifts')
        .insert(newShift);

    if (error) {
        console.error('Error creating new shift:', error);
        alert('Failed to start new shift.');
    } else {
        window.location.href = 'main.html';
    }
});

logoutBtn.addEventListener('click', async () => {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
});

// Initial check
checkAuth();
