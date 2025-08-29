// history.js

// DOM element references
const logoutButton = document.getElementById('logout-btn');
const historyTableBody = document.getElementById('history-table-body');
const exportCsvButton = document.getElementById('export-csv-btn');

let supaClient; // Declare Supabase client at the top level

// Main function to initialize the page
async function initializeHistoryPage() {
    try {
        // Fetch config and initialize the client first
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Once the client is ready, run the page logic
        await checkUserSession();
        await loadHistory();
        attachEventListeners();

    } catch (error) {
        console.error('Failed to initialize history page:', error);
        // Optionally, display an error message to the user on the page
    }
}

function attachEventListeners() {
    // Event listener for clicking on a shift row
    historyTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (row && row.dataset.shiftId) {
            const shiftId = row.dataset.shiftId;
            window.location.href = `shift-detail.html?shift_id=${shiftId}`;
        }
    });

    // Logout functionality
    logoutButton.addEventListener('click', async () => {
        await supaClient.auth.signOut();
        window.location.href = 'index.html';
    });

    // Export to CSV functionality
    exportCsvButton.addEventListener('click', () => {
        const table = document.getElementById('history-table');
        const rows = table.querySelectorAll('tr');
        let csvContent = '';

        // Add header row
        const headers = [];
        rows[0].querySelectorAll('th').forEach(header => {
            headers.push(`"${header.innerText}"`); // Wrap headers in quotes
        });
        csvContent += headers.join(',') + '\n';

        // Add data rows
        for (let i = 1; i < rows.length; i++) {
            const row = [];
            rows[i].querySelectorAll('td').forEach(cell => {
                // Wrap each cell's content in quotes to handle commas within the data
                row.push(`"${cell.innerText.replace(/"/g, '""')}"`);
            });
            csvContent += row.join(',') + '\n';
        }

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'radticker_history.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Check for user session
async function checkUserSession() {
    const { data: { session } } = await supaClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
}

// Load shift history
async function loadHistory() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return;

    const { data: shifts, error } = await supaClient
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .not('shift_end_time', 'is', null)
        .order('shift_start_time', { ascending: false });

    if (error) {
        console.error('Error fetching shift history:', error);
        return;
    }

    historyTableBody.innerHTML = ''; // Clear existing rows
    shifts.forEach(shift => {
        const row = document.createElement('tr');
        row.setAttribute('data-shift-id', shift.id);
        row.style.cursor = 'pointer';

        const startDate = new Date(shift.shift_start_time).toLocaleDateString();

        row.innerHTML = `
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${startDate}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${shift.shift_title || ''}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${shift.shift_type || ''}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${shift.shift_length_hours || ''}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${shift.total_wrvu ? shift.total_wrvu.toFixed(2) : '0.00'}</td>
            <td style="padding: 12px; border: 1px solid var(--border-primary);">${shift.actual_wrvu_per_hour ? shift.actual_wrvu_per_hour.toFixed(2) : '0.00'}</td>
        `;
        historyTableBody.appendChild(row);
    });
}

// Start the page initialization process
initializeHistoryPage();