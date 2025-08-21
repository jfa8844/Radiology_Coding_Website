// supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM element references
const logoutButton = document.getElementById('logout-btn');
const saveLayoutButton = document.getElementById('save-layout-btn');
const resetLayoutButton = document.getElementById('reset-layout-btn');
const shiftStartTimeInput = document.getElementById('shift-start-time');
const goalWrvuPerHourInput = document.getElementById('goal-wrvu-per-hr');
const totalWrvuValue = document.querySelector('.live-metrics .metric-item:nth-child(1) .metric-value');
const wrvuPerHourValue = document.querySelector('.live-metrics .metric-item:nth-child(2) .metric-value');
const paceValue = document.querySelector('.live-metrics .metric-item:nth-child(3) .metric-value');
const totalCasesValue = document.querySelector('.modality-trackers .modality-item:nth-child(1) .modality-value');
const modalityValues = {
    CT: document.querySelector('.modality-trackers .modality-item:nth-child(2) .modality-value'),
    MRI: document.querySelector('.modality-trackers .modality-item:nth-child(3) .modality-value'),
    XR: document.querySelector('.modality-trackers .modality-item:nth-child(4) .modality-value'),
    US: document.querySelector('.modality-trackers .modality-item:nth-child(5) .modality-value'),
    NM: document.querySelector('.modality-trackers .modality-item:nth-child(6) .modality-value')
};

// Logout functionality
logoutButton.addEventListener('click', async () => {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
});

// Save layout functionality
saveLayoutButton.addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        alert('You must be logged in to save a layout.');
        return;
    }

    const cards = document.querySelectorAll('.procedure-grid .procedure-card');
    const layoutData = [];
    const columns = 5;

    cards.forEach((card, index) => {
        const procedureId = card.getAttribute('data-procedure-id');
        layoutData.push({
            user_id: user.id,
            procedure_id: parseInt(procedureId),
            display_row: Math.floor(index / columns) + 1,
            display_column: (index % columns) + 1,
        });
    });

    const { error } = await supaClient
        .from('user_procedure_preferences')
        .upsert(layoutData, { onConflict: 'user_id, procedure_id' });

    if (error) {
        console.error('Error saving layout:', error);
        alert('Failed to save layout.');
    } else {
        alert('Layout saved successfully!');
    }
});

// Reset layout functionality
resetLayoutButton.addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        alert('You must be logged in to reset a layout.');
        return;
    }

    try {
        const { error } = await supaClient
            .from('user_procedure_preferences')
            .update({ display_column: null, display_row: null })
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        alert('Layout has been reset.');
        loadProcedures();
    } catch (error) {
        console.error('Error resetting layout:', error);
        alert('Failed to reset layout.');
    }
});


function updateDashboard() {
    const cards = document.querySelectorAll('.procedure-card');
    let totalWrvu = 0;
    let totalCases = 0;
    const modalityCounts = { CT: 0, MRI: 0, XR: 0, US: 0, NM: 0 };

    cards.forEach(card => {
        const count = parseInt(card.querySelector('.case-count').textContent, 10);
        const wrvu = parseFloat(card.getAttribute('data-wrvu'));
        const modality = card.getAttribute('data-modality');

        if (!isNaN(count) && !isNaN(wrvu)) {
            totalWrvu += count * wrvu;
            totalCases += count;
            if (modality in modalityCounts) {
                modalityCounts[modality] += count;
            }
        }
    });

    totalWrvuValue.textContent = totalWrvu.toFixed(2);
    totalCasesValue.textContent = totalCases;
    modalityValues.CT.textContent = modalityCounts.CT;
    modalityValues.MRI.textContent = modalityCounts.MRI;
    modalityValues.XR.textContent = modalityCounts.XR;
    modalityValues.US.textContent = modalityCounts.US;
    modalityValues.NM.textContent = modalityCounts.NM;

    // Time-based calculations
    const shiftStartTime = shiftStartTimeInput.value;
    const goalWrvuPerHour = parseFloat(goalWrvuPerHourInput.value);

    if (!shiftStartTime) {
        wrvuPerHourValue.textContent = "0";
        paceValue.textContent = "0h 0m";
        return;
    }

    const elapsedHours = (new Date() - new Date(shiftStartTime)) / (1000 * 60 * 60);

    if (elapsedHours <= 0) {
        wrvuPerHourValue.textContent = "0";
        paceValue.textContent = "0h 0m";
        return;
    }

    const actualWrvuPerHour = totalWrvu / elapsedHours;
    wrvuPerHourValue.textContent = actualWrvuPerHour.toFixed(2);

    if (isNaN(goalWrvuPerHour) || goalWrvuPerHour <= 0) {
        paceValue.textContent = "0h 0m";
        return;
    }

    const targetWrvus = goalWrvuPerHour * elapsedHours;
    const wrvuDifference = totalWrvu - targetWrvus;
    const paceMinutes = (wrvuDifference / goalWrvuPerHour) * 60;

    const sign = paceMinutes < 0 ? "-" : "+";
    const absPaceMinutes = Math.abs(paceMinutes);
    const hours = Math.floor(absPaceMinutes / 60);
    const minutes = Math.round(absPaceMinutes % 60);

    paceValue.textContent = `${sign}${hours}h ${minutes}m`;
}

async function loadProcedures() {
    const procedureGrid = document.querySelector('.procedure-grid');
    procedureGrid.innerHTML = ''; // Clear existing cards

    const { data: { user } } = await supaClient.auth.getUser();

    let procedureDetails;

    if (user) {
        // User is logged in, try to fetch their preferences
        const { data: preferences, error: prefError } = await supaClient
            .from('user_procedure_preferences')
            .select('procedure_id, display_row, display_column')
            .eq('user_id', user.id);

        if (prefError) {
            console.error('Error fetching user preferences:', prefError);
        }

        if (preferences && preferences.length > 0) {
            // User has a saved layout
            const procedureIds = preferences.map(p => p.procedure_id);
            const { data, error } = await supaClient
                .from('procedures')
                .select('id, abbreviation, description, wrvu, modality')
                .in('id', procedureIds);

            if (error) {
                console.error('Error fetching procedures based on preferences:', error);
                // Fallback to default in case of error
            } else {
                 procedureDetails = data.map(proc => {
                    const pref = preferences.find(p => p.procedure_id === proc.id);
                    return { ...proc, display_row: pref.display_row, display_column: pref.display_column };
                }).sort((a, b) => {
                    if (a.display_row !== b.display_row) {
                        return a.display_row - b.display_row;
                    }
                    return a.display_column - b.display_column;
                });
            }
        }
    }

    // If procedureDetails is not set yet (no user, no preferences, or an error), load default
    if (!procedureDetails) {
        const { data, error } = await supaClient
            .from('procedures')
            .select('id, abbreviation, description, wrvu, modality, default_row, default_column')
            .eq('default_display', true);

        if (error) {
            console.error('Error fetching default procedures:', error);
            return;
        }
        procedureDetails = data.map(proc => ({
            ...proc,
            display_row: proc.default_row,
            display_column: proc.default_column
        })).sort((a,b) => {
            if (a.display_row !== b.display_row) {
                return a.display_row - b.display_row;
            }
            return a.display_column - b.display_column;
        });
    }

    procedureDetails.forEach(procedure => {
        const cardHTML = `
            <div class="procedure-card" data-procedure-id="${procedure.id}" data-wrvu="${procedure.wrvu}" data-modality="${procedure.modality}">
                <div class="card-header">
                    <h3>${procedure.abbreviation} (${procedure.wrvu})</h3>
                </div>
                <div class="card-controls">
                    <div class="case-count">0</div>
                    <button class="increment-btn">+</button>
                </div>
            </div>
        `;
        procedureGrid.innerHTML += cardHTML;
    });

    // Initialize SortableJS
    new Sortable(procedureGrid, {
        animation: 150,
        ghostClass: 'sortable-ghost',
    });

    attachEventListeners();
    updateDashboard();
}


function attachEventListeners() {
    // Increment button functionality
    document.querySelectorAll('.increment-btn').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.procedure-card');
            const countElement = card.querySelector('.case-count');
            let currentCount = parseInt(countElement.textContent, 10);
            countElement.textContent = currentCount + 1;
            updateDashboard(); // Update dashboard on increment
        });
    });

    // Manual count editing
    document.querySelectorAll('.case-count').forEach(countElement => {
        countElement.contentEditable = true;

        countElement.addEventListener('keydown', (event) => {
            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(event.key)) {
                 if (event.key === 'Enter') {
                    event.preventDefault();
                    countElement.blur();
                }
                return;
            }
            if (!/^[0-9]$/.test(event.key)) {
                event.preventDefault();
            }
        });

        countElement.addEventListener('blur', () => {
            if (countElement.textContent.trim() === '') {
                countElement.textContent = '0';
            }
            updateDashboard(); // Update dashboard after manual edit
        });
    });

    // Listen for changes on the new inputs
    shiftStartTimeInput.addEventListener('change', updateDashboard);
    goalWrvuPerHourInput.addEventListener('change', updateDashboard);
}

loadProcedures();

setInterval(updateDashboard, 60000);
