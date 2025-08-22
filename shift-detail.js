// Supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM element references
const logoutButton = document.getElementById('logout-btn');
const shiftDetailTitle = document.getElementById('shift-detail-title');
const shiftDetailTableBody = document.getElementById('shift-detail-table-body');

// Check for user session
async function checkUserSession() {
    const { data: { session } } = await supaClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
}

// Load shift details
async function loadShiftDetails(shiftId) {
    // Fetch shift details
    const { data: shift, error: shiftError } = await supaClient
        .from('shifts')
        .select('shift_title, shift_start_time')
        .eq('id', shiftId)
        .single();

    if (shiftError) {
        console.error('Error fetching shift details:', shiftError);
        shiftDetailTitle.textContent = 'Error loading shift details.';
        return;
    }

    const shiftDate = new Date(shift.shift_start_time).toLocaleDateString();
    shiftDetailTitle.textContent = `Details for '${shift.shift_title}' on ${shiftDate}`;

    // Fetch shift entries and related procedures
    const { data: entries, error: entriesError } = await supaClient
        .from('shift_entries')
        .select('count, procedures (abbreviation, description, wrvu)')
        .eq('shift_id', shiftId);

    if (entriesError) {
        console.error('Error fetching shift procedures:', entriesError);
        return;
    }

    shiftDetailTableBody.innerHTML = ''; // Clear existing rows
    entries.forEach(entry => {
        const row = document.createElement('tr');
        const procedure = entry.procedures;

        row.innerHTML = `
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.abbreviation}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.description}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.wrvu.toFixed(2)}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${entry.count}</td>
        `;
        shiftDetailTableBody.appendChild(row);
    });
}

// Logout functionality
logoutButton.addEventListener('click', async () => {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
});

// Initial load
async function initializeApp() {
    await checkUserSession();

    const urlParams = new URLSearchParams(window.location.search);
    const shiftId = urlParams.get('shift_id');

    if (shiftId) {
        await loadShiftDetails(shiftId);
    } else {
        shiftDetailTitle.textContent = 'No shift ID provided.';
    }
}

initializeApp();
