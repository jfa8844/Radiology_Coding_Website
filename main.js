// supabase initialization
let activeShiftId = null;

function getCombinedStartTime() {
    const date = shiftStartDateInput.value;
    const time = shiftStartTimeField.value;
    if (date && time) {
        return `${date}T${time}`;
    }
    return null;
}
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM element references
const settingsButton = document.getElementById('settings-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const logoutButton = document.getElementById('logout-btn');
const saveLayoutButton = document.getElementById('save-layout-btn');
const resetLayoutButton = document.getElementById('reset-layout-btn');
const clearCountsButton = document.getElementById('clear-counts-btn');
const addColumnButton = document.getElementById('add-column-btn');
const endShiftButton = document.getElementById('end-shift-btn');
const shiftTitleInput = document.getElementById('shift-title');
const shiftTypeInput = document.getElementById('shift-type');
const shiftLengthHrsInput = document.getElementById('shift-length-hrs');
const shiftStartDateInput = document.getElementById('shift-start-date');
const shiftStartTimeField = document.getElementById('shift-start-time-field');
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

// Dropdown menu functionality
settingsButton.addEventListener('click', () => {
    dropdownMenu.classList.toggle('show');
});

window.addEventListener('click', (event) => {
    if (!event.target.matches('#settings-btn')) {
        if (dropdownMenu.classList.contains('show')) {
            dropdownMenu.classList.remove('show');
        }
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
});

endShiftButton.addEventListener('click', async () => {
    // The confirm() popup does not work in this environment, so we proceed directly.
    const totalWrvu = parseFloat(totalWrvuValue.textContent);
    const actualWrvuPerHour = parseFloat(wrvuPerHourValue.textContent);

    const shiftUpdate = {
        shift_end_time: new Date().toISOString(),
        total_wrvu: totalWrvu,
        actual_wrvu_per_hour: actualWrvuPerHour,
    };

    await updateShiftData(shiftUpdate);
    // The alert() popup is also removed. The page will redirect to the start page.
    window.location.href = 'start.html';
});

async function saveLayout(showAlert = true) {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        if (showAlert) alert('You must be logged in to save a layout.');
        return;
    }

    const layoutData = [];
    const columns = document.querySelectorAll('.procedure-grid .grid-column');

    columns.forEach((column, columnIndex) => {
        const cards = column.querySelectorAll('.procedure-card');
        cards.forEach((card, rowIndex) => {
            const procedureId = card.getAttribute('data-procedure-id');
            layoutData.push({
                user_id: user.id,
                procedure_id: parseInt(procedureId),
                display_row: rowIndex + 1,
                display_column: columnIndex + 1,
                is_visible: true
            });
        });
    });

    // First, delete all existing preferences for the user.
    const { error: deleteError } = await supaClient
        .from('user_procedure_preferences')
        .delete()
        .eq('user_id', user.id);

    if (deleteError) {
        console.error('Error clearing previous layout:', deleteError);
        if (showAlert) alert('Failed to save layout: Could not clear previous preferences.');
        return;
    }

    // Then, insert the new layout data.
    if (layoutData.length > 0) {
        const { error: insertError } = await supaClient
            .from('user_procedure_preferences')
            .insert(layoutData);

        if (insertError) {
            console.error('Error inserting new layout:', insertError);
            if (showAlert) alert('Failed to save layout: Could not insert new preferences.');
            return;
        }
    }

    // Update column order
    const columnUpdates = [];
    document.querySelectorAll('.procedure-grid .grid-column').forEach((column, index) => {
        const columnId = column.getAttribute('data-column-id');
        if (columnId && !isNaN(parseInt(columnId))) {
            columnUpdates.push({
                id: parseInt(columnId),
                display_order: index + 1
            });
        }
    });

    for (const update of columnUpdates) {
        await supaClient
            .from('user_columns')
            .update({ display_order: update.display_order })
            .match({ id: update.id, user_id: user.id });
    }


    if (showAlert) {
        alert('Layout saved successfully!');
    }
}

async function deleteColumn(columnIdToDelete) {
    const columnElement = document.querySelector(`.grid-column[data-column-id="${columnIdToDelete}"]`);
    if (!columnElement) return;

    const firstColumn = document.querySelector('.grid-column[data-display-order="1"]');
    if (!firstColumn) {
        alert('Error: Could not find the first column to move items to.');
        return;
    }
    const cardsToMove = Array.from(columnElement.querySelectorAll('.procedure-card'));

    const { error: deleteError } = await supaClient
        .from('user_columns')
        .delete()
        .eq('id', columnIdToDelete);

    if (deleteError) {
        console.error('Failed to delete column:', deleteError);
        alert('Error: Could not delete the column. Please try again.');
        return;
    }

    columnElement.remove();
    cardsToMove.forEach(card => firstColumn.appendChild(card));

    await saveLayout(false);
}

// Save layout functionality
saveLayoutButton.addEventListener('click', () => saveLayout(true));

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

// Clear all counts functionality
clearCountsButton.addEventListener('click', async () => {
    const isConfirmed = confirm('Are you sure you want to clear all counts for the current shift? This cannot be undone.');
    if (!isConfirmed) {
        return;
    }

    const activeShiftId = await getOrCreateActiveShift();
    if (!activeShiftId) {
        alert('No active shift found. Cannot clear counts.');
        return;
    }

    // The delete call returns an error object if it fails
    const { error } = await supaClient
        .from('shift_entries')
        .delete()
        .eq('shift_id', activeShiftId);

    // If the error object is not null, something went wrong.
    if (error) {
        alert('Error: Could not clear counts in the database. Please try again or refresh the page.');
        console.error('Error clearing counts:', error);
        return; // Stop the function here
    }

    // Loop through all procedure cards and set their display count to 0
    document.querySelectorAll('.procedure-card').forEach(card => {
        const countElement = card.querySelector('.case-count');
        if (countElement) {
            countElement.textContent = '0';
        }
    });

    // Finally, update the main dashboard metrics
    updateDashboard();
});

// Add column functionality
addColumnButton.addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        alert('You must be logged in to add a column.');
        return;
    }

    const procedureGrid = document.querySelector('.procedure-grid');
    const existingColumns = procedureGrid.querySelectorAll('.grid-column');
    const newDisplayOrder = existingColumns.length + 1;

    const { data: newColumn, error } = await supaClient
        .from('user_columns')
        .insert({
            user_id: user.id,
            title: null, // Title is not used for now
            display_order: newDisplayOrder
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding column:', error);
        alert('Failed to add new column.');
        return;
    }

    const column = document.createElement('div');
    column.className = 'grid-column';
    column.setAttribute('data-column-id', newColumn.id);
    column.setAttribute('data-display-order', newColumn.display_order);

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column-header';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-column-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteColumn(newColumn.id);
    });
    columnHeader.appendChild(deleteBtn);

    column.appendChild(columnHeader);
    procedureGrid.appendChild(column);

    const placeholder = document.createElement('div');
    placeholder.className = 'column-placeholder';
    placeholder.textContent = 'Drag cards here';
    column.appendChild(placeholder);

    new Sortable(column, {
        group: 'procedures',
        animation: 150,
        ghostClass: 'sortable-ghost',
        filter: '.column-placeholder',
        onEnd: function (evt) {
            // Check source column. If it's empty, show placeholder.
            if (evt.from.querySelectorAll('.procedure-card').length === 0) {
                const fromPlaceholder = evt.from.querySelector('.column-placeholder');
                if (fromPlaceholder) fromPlaceholder.style.display = 'flex';
            }
            // Check destination column. If it has cards, hide placeholder.
            const toPlaceholder = evt.to.querySelector('.column-placeholder');
            if (toPlaceholder) toPlaceholder.style.display = 'none';
        }
    });
});

async function getOrCreateActiveShift() {
    if (activeShiftId) {
        return activeShiftId;
    }

    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        // Redirect to login or handle error if no user is found
        window.location.href = 'index.html';
        return null;
    }

    // Check for an existing unfinished shift
    const { data: existingShift, error: existingShiftError } = await supaClient
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .is('shift_end_time', null)
        .single();

    if (existingShiftError && existingShiftError.code !== 'PGRST116') { // Ignore 'single row not found' error
        console.error('Error fetching existing shift:', existingShiftError);
        return null;
    }

    if (existingShift) {
        // Populate dashboard with existing shift data
        activeShiftId = existingShift.id;
        shiftTitleInput.value = existingShift.shift_title || '';
        shiftTypeInput.value = existingShift.shift_type || '';
        shiftLengthHrsInput.value = existingShift.shift_length_hours || '';
        goalWrvuPerHourInput.value = existingShift.goal_wrvu_per_hour || '';

        if (existingShift.shift_start_time) {
            const startTime = new Date(existingShift.shift_start_time);

            // Correctly format for the date input (YYYY-MM-DD)
            const year = startTime.getFullYear();
            const month = String(startTime.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(startTime.getDate()).padStart(2, '0');
            shiftStartDateInput.value = `${year}-${month}-${day}`;

            // Correctly format for the time input (HH:mm)
            const hours = String(startTime.getHours()).padStart(2, '0');
            const minutes = String(startTime.getMinutes()).padStart(2, '0');
            shiftStartTimeField.value = `${hours}:${minutes}`;
        }

        return activeShiftId;
    } else {
        // If no active shift is found, redirect to the start page.
        window.location.href = 'start.html';
        return null; // Return null to stop further execution
    }
}

async function updateProcedureCount(procedureId, newCount) {
    const activeShiftId = await getOrCreateActiveShift();
    if (!activeShiftId) {
        console.error("No active shift ID found. Cannot update procedure count.");
        return;
    }

    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        console.error("No user found. Cannot update procedure count.");
        return;
    }

    const { error } = await supaClient
        .from('shift_entries')
        .upsert({
            shift_id: activeShiftId,
            procedure_id: parseInt(procedureId),
            user_id: user.id,
            count: newCount
        }, {
            onConflict: 'shift_id, procedure_id'
        });

    if (error) {
        console.error('Error updating procedure count:', error);
    }
}

async function updateShiftData(updateObject) {
    const activeShiftId = await getOrCreateActiveShift();
    if (!activeShiftId) {
        console.error("No active shift ID found. Cannot update shift data.");
        return;
    }

    const { error } = await supaClient
        .from('shifts')
        .update(updateObject)
        .eq('id', activeShiftId);

    if (error) {
        console.error(`Error updating shift:`, error);
    }
}


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
    const shiftStartTime = getCombinedStartTime();
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

    const paceBox = document.getElementById('pace-metric-item');

    if (isNaN(goalWrvuPerHour) || goalWrvuPerHour <= 0) {
        paceValue.textContent = "0h 0m";
        paceBox.classList.remove('pace-ahead', 'pace-behind');
        paceBox.classList.add('pace-neutral');
        return;
    }

    const targetWrvus = goalWrvuPerHour * elapsedHours;
    const wrvuDifference = totalWrvu - targetWrvus;
    const paceMinutes = (wrvuDifference / goalWrvuPerHour) * 60;

    paceBox.classList.remove('pace-ahead', 'pace-behind', 'pace-neutral');

    if (paceMinutes > 0) {
        paceBox.classList.add('pace-ahead');
    } else if (paceMinutes < 0) {
        paceBox.classList.add('pace-behind');
    } else {
        paceBox.classList.add('pace-neutral');
    }

    const sign = paceMinutes < 0 ? "-" : "+";
    const absPaceMinutes = Math.abs(paceMinutes);
    const hours = Math.floor(absPaceMinutes / 60);
    const minutes = Math.round(absPaceMinutes % 60);

    paceValue.textContent = `${sign}${hours}h ${minutes}m`;
}

async function loadProcedures() {
    const procedureGrid = document.querySelector('.procedure-grid');
    procedureGrid.innerHTML = ''; // Clear existing cards

    // Fetch saved counts for the active shift
    let shiftEntries = [];
    if (activeShiftId) {
        const { data, error } = await supaClient
            .from('shift_entries')
            .select('procedure_id, count')
            .eq('shift_id', activeShiftId);

        if (error) {
            console.error('Error fetching shift entries:', error);
        } else {
            shiftEntries = data;
        }
    }

    const { data: { user } } = await supaClient.auth.getUser();

    let procedureDetails;
    let loadDefault = true;

    if (user) {
        const { data: preferences, error: prefError } = await supaClient
            .from('user_procedure_preferences')
            .select('procedure_id, display_row, display_column, is_visible')
            .eq('user_id', user.id);

        if (prefError) {
            console.error('Error fetching user preferences:', prefError);
        }

        if (preferences && preferences.length > 0) {
            // A custom layout exists if any preference has a display position.
            const hasCustomLayout = preferences.some(p => p.display_row !== null || p.display_column !== null);

            if (hasCustomLayout) {
                loadDefault = false;
                // Filter this custom layout for only the visible procedures.
                const visiblePreferences = preferences.filter(p => p.is_visible);

                const procedureIds = visiblePreferences.map(p => p.procedure_id);
                // If no procedures are visible, this will fetch an empty array, which is correct.
                const { data, error } = await supaClient
                    .from('procedures')
                    .select('id, abbreviation, description, wrvu, modality')
                    .in('id', procedureIds);

                if (error) {
                    console.error('Error fetching procedures based on preferences:', error);
                    loadDefault = true; // Fallback to default in case of error
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
    }

    if (loadDefault) {
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
        })).sort((a, b) => {
            if (a.display_row !== b.display_row) {
                return a.display_row - b.display_row;
            }
            return a.display_column - b.display_column;
        });
    }

    // Create column containers
    let userColumns = [];
    if (user) {
        let { data, error } = await supaClient
            .from('user_columns')
            .select('*')
            .eq('user_id', user.id)
            .order('display_order');

        if (error) {
            console.error('Error fetching user columns:', error);
            return;
        }
        userColumns = data;
    }

    if (user && userColumns.length === 0) {
        // First-time setup for a user, create 6 default columns
        const defaultColumns = [];
        for (let i = 1; i <= 6; i++) {
            // Title is not needed for now, but the schema has it.
            defaultColumns.push({ user_id: user.id, title: null, display_order: i });
        }

        const { data: newColumns, error: insertError } = await supaClient
            .from('user_columns')
            .insert(defaultColumns)
            .select();

        if (insertError) {
            console.error('Error creating default columns:', insertError);
            return;
        }
        userColumns = newColumns;
    } else if (userColumns.length === 0) {
        // Not logged in, show 6 default columns
        for (let i = 1; i <= 6; i++) {
            userColumns.push({ id: `default-${i}`, display_order: i, title: null });
        }
    }

    userColumns.forEach(c => {
        const column = document.createElement('div');
        column.className = 'grid-column';
        column.setAttribute('data-column-id', c.id);
        column.setAttribute('data-display-order', c.display_order);

        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';

        if (c.display_order > 6) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-column-btn';
            deleteBtn.innerHTML = '&times;'; // A simple 'x'
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteColumn(c.id);
            });
            columnHeader.appendChild(deleteBtn);
        }

        column.appendChild(columnHeader);
        procedureGrid.appendChild(column);
    });

    const columns = procedureGrid.querySelectorAll('.grid-column');

    procedureDetails.forEach(procedure => {
        const card = document.createElement('div');
        card.className = 'procedure-card';
        card.setAttribute('data-procedure-id', procedure.id);
        card.setAttribute('data-wrvu', procedure.wrvu);
        card.setAttribute('data-modality', procedure.modality);

        const entry = shiftEntries.find(e => e.procedure_id === procedure.id);
        const count = entry ? entry.count : 0;

        card.innerHTML = `
            <div class="card-header">
                <h3>${procedure.abbreviation} (${procedure.wrvu})</h3>
            </div>
            <div class="card-controls">
                <div class="case-count">${count}</div>
                <button class="increment-btn">+</button>
            </div>
        `;

        // Append to the correct column, adjusting for 1-based indexing
        const columnIndex = procedure.display_column - 1;
        if (columns[columnIndex]) {
            columns[columnIndex].appendChild(card);
        } else {
            console.warn(`Could not find column for procedure: ${procedure.abbreviation}`);
            // As a fallback, append to the first column
            columns[0].appendChild(card);
        }
    });

    // Initialize SortableJS for each column
    document.querySelectorAll('.grid-column').forEach(column => {
        const placeholder = document.createElement('div');
        placeholder.className = 'column-placeholder';
        placeholder.textContent = 'Drag cards here';
        column.appendChild(placeholder);

        if (column.querySelectorAll('.procedure-card').length > 0) {
            placeholder.style.display = 'none';
        }

        new Sortable(column, {
            group: 'procedures', // Allow dragging between columns
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.column-placeholder',
            onEnd: function (evt) {
                // Check source column
                if (evt.from.querySelectorAll('.procedure-card').length === 0) {
                    const fromPlaceholder = evt.from.querySelector('.column-placeholder');
                    if (fromPlaceholder) fromPlaceholder.style.display = 'flex';
                }
                // Check destination column
                const toPlaceholder = evt.to.querySelector('.column-placeholder');
                if (toPlaceholder) toPlaceholder.style.display = 'none';
            }
        });
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
            const newCount = currentCount + 1;
            countElement.textContent = newCount;
            updateDashboard(); // Update dashboard on increment
            const procedureId = card.getAttribute('data-procedure-id');
            updateProcedureCount(procedureId, newCount);
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
            let newCount;
            if (countElement.textContent.trim() === '') {
                countElement.textContent = '0';
                newCount = 0;
            } else {
                newCount = parseInt(countElement.textContent, 10);
            }
            updateDashboard(); // Update dashboard after manual edit
            const card = countElement.closest('.procedure-card');
            const procedureId = card.getAttribute('data-procedure-id');
            updateProcedureCount(procedureId, newCount);
        });
    });

    // Listen for changes on the new inputs
    goalWrvuPerHourInput.addEventListener('change', updateDashboard);

    // Add blur event listeners for real-time saving
    shiftTitleInput.addEventListener('blur', () => updateShiftData({ shift_title: shiftTitleInput.value }));
    shiftTypeInput.addEventListener('blur', () => updateShiftData({ shift_type: shiftTypeInput.value }));
    shiftLengthHrsInput.addEventListener('blur', () => updateShiftData({ shift_length_hours: shiftLengthHrsInput.value }));
    goalWrvuPerHourInput.addEventListener('blur', () => updateShiftData({ goal_wrvu_per_hour: goalWrvuPerHourInput.value }));

    function saveShiftStartTime() {
        const combinedStartTime = getCombinedStartTime();
        if (combinedStartTime) {
            updateShiftData({ shift_start_time: combinedStartTime });
        }
    }

    shiftStartDateInput.addEventListener('change', updateDashboard);
    shiftStartTimeField.addEventListener('change', updateDashboard);

    shiftStartDateInput.addEventListener('blur', saveShiftStartTime);
    shiftStartTimeField.addEventListener('blur', saveShiftStartTime);
}

async function initializeApp() {
    await getOrCreateActiveShift();
    await loadProcedures();
}

initializeApp();

setInterval(updateDashboard, 60000);
