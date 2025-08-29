// start.js (Corrected with Active Shift Check)

// DOM element references
const startShiftBtn = document.getElementById('start-shift-btn');
const startShiftModal = document.getElementById('start-shift-modal');
const shiftStartTimeInput = document.getElementById('shift-start-time-input');
const confirmStartBtn = document.getElementById('confirm-start-btn');
const cancelStartBtn = document.getElementById('cancel-start-btn');
const logoutBtn = document.getElementById('logout-btn');

let supaClient;

async function initializeStartPage() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        // This function now checks for an active shift BEFORE showing the page
        await checkAuthAndActiveShift(); 
        attachEventListeners();

    } catch(error) {
        console.error('Failed to initialize start page:', error);
    }
}

function attachEventListeners() {
    startShiftBtn.addEventListener('click', () => {
        startShiftModal.classList.add('modal-visible');
        const now = new Date();
        const timezoneOffset = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - timezoneOffset);
        shiftStartTimeInput.value = localTime.toISOString().slice(0, 16);
    });
    cancelStartBtn.addEventListener('click', () => startShiftModal.classList.remove('modal-visible'));
    confirmStartBtn.addEventListener('click', handleConfirmStart);
    logoutBtn.addEventListener('click', handleLogout);
}

// *** THIS IS THE CRITICAL NEW LOGIC ***
async function checkAuthAndActiveShift() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return; 
    }

    // Check if a shift with no end_time already exists
    const { data: activeShift } = await supaClient
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('shift_end_time', null)
        .limit(1)
        .single();

    // If we found an active shift, the user shouldn't be here. Redirect them.
    if (activeShift) {
        window.location.href = 'main.html';
    }
    // Otherwise, do nothing and let the user stay on the start page.
}

async function handleConfirmStart() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return alert('You must be logged in to start a shift.');

    const localDateTimeString = shiftStartTimeInput.value;
    if (!localDateTimeString) return alert('Please select a start time.');
    
    const utcDateTimeString = new Date(localDateTimeString).toISOString();

    const { data: lastShift } = await supaClient
        .from('shifts')
        .select('shift_title, shift_type, shift_length_hours, goal_wrvu_per_hour')
        .eq('user_id', user.id)
        .not('shift_end_time', 'is', null)
        .order('shift_start_time', { ascending: false })
        .limit(1)
        .single();

    const newShift = {
        user_id: user.id,
        shift_start_time: utcDateTimeString,
        shift_title: lastShift?.shift_title || null,
        shift_type: lastShift?.shift_type || null,
        shift_length_hours: lastShift?.shift_length_hours || null,
        goal_wrvu_per_hour: lastShift?.goal_wrvu_per_hour || null
    };

    const { error } = await supaClient.from('shifts').insert(newShift);
    if (error) {
        console.error('Error creating new shift:', error);
        alert('Failed to start new shift.');
    } else {
        window.location.href = 'main.html';
    }
}

async function handleLogout() {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
}

initializeStartPage();