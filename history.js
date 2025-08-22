// Supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM element references
const logoutButton = document.getElementById('logout-btn');
const historyTableBody = document.getElementById('history-table-body');
const exportCsvButton = document.getElementById('export-csv-btn');

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
        headers.push(header.innerText);
    });
    csvContent += headers.join(',') + '\n';

    // Add data rows
    for (let i = 1; i < rows.length; i++) {
        const row = [];
        rows[i].querySelectorAll('td').forEach(cell => {
            row.push(cell.innerText);
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

// Initial load
async function initializeApp() {
    await checkUserSession();
    await loadHistory();
}

initializeApp();
