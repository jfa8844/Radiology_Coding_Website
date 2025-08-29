// shift-detail.js

// DOM element references
const logoutButton = document.getElementById('logout-btn');
const shiftDetailTitle = document.getElementById('shift-detail-title');
const shiftDetailTableBody = document.getElementById('shift-detail-table-body');

let supaClient; // Declare Supabase client at the top level

// Main function to initialize the page
async function initializeShiftDetailPage() {
    try {
        // Fetch config and initialize the client first
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Once the client is ready, run the page logic
        await checkUserSession();
        
        // Get shift_id from URL and load details
        const urlParams = new URLSearchParams(window.location.search);
        const shiftId = urlParams.get('shift_id');
        if (shiftId) {
            await loadShiftDetails(shiftId);
        } else {
            shiftDetailTitle.textContent = 'No shift ID provided.';
        }
        
        attachEventListeners();

    } catch (error) {
        console.error('Failed to initialize shift detail page:', error);
        shiftDetailTitle.textContent = 'Error loading page configuration.';
    }
}

function attachEventListeners() {
    // Logout functionality
    logoutButton.addEventListener('click', async () => {
        await supaClient.auth.signOut();
        window.location.href = 'index.html';
    });
}

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
    shiftDetailTitle.textContent = `Details for '${shift.shift_title || 'Untitled Shift'}' on ${shiftDate}`;

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

        if (procedure) { // Check if procedure data was successfully joined
            row.innerHTML = `
                <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.abbreviation}</td>
                <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.description}</td>
                <td style="padding: 12px; border: 1px solid var(--border-primary);">${procedure.wrvu.toFixed(2)}</td>
                <td style="padding: 12px; border: 1px solid var(--border-primary);">${entry.count}</td>
            `;
            shiftDetailTableBody.appendChild(row);
        }
    });
}

// Start the page initialization process
initializeShiftDetailPage();