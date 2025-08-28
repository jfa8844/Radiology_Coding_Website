// supabase initialization
let activeShiftId = null;
let shiftTemplates = []; // To store all loaded templates
let selectedShiftTemplateId = null; // To store the ID of the chosen template

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

async function loadAndPopulateShiftTemplates() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supaClient
        .from('shift_templates')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching shift templates:', error);
        return;
    }
    shiftTemplates = data || [];

    const dataList = document.getElementById('shift-titles-list');
    dataList.innerHTML = ''; // Clear existing options
    shiftTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.title;
        dataList.appendChild(option);
    });
}

async function setupNewUser(userId) {
    console.log("Setting up new user with default data...");
    try {
        // 1. Fetch default procedures
        const { data: allProcedures, error: procError } = await supaClient
            .from('procedures')
            .select('id, default_display, default_column, default_row');
        if (procError) throw procError;

        // 2. Prepare default preferences
        const defaultPrefs = allProcedures.map(p => ({
            user_id: userId,
            procedure_id: p.id,
            is_visible: p.default_display,
            display_column: p.default_column,
            display_row: p.default_row
        }));

        // 3. Prepare default columns
        const defaultColumns = Array.from({ length: 6 }, (_, i) => ({
            user_id: userId,
            title: null,
            display_order: i + 1
        }));

        // 4. Insert all default data
        const { error: prefsError } = await supaClient.from('user_procedure_preferences').insert(defaultPrefs);
        if (prefsError) throw prefsError;

        const { error: colsError } = await supaClient.from('user_columns').insert(defaultColumns);
        if (colsError) throw colsError;

        console.log("New user setup complete.");
        return true;

    } catch (error) {
        console.error('Error during new user setup:', error);
        return false;
    }
}

// DOM element references
const settingsButton = document.getElementById('settings-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const logoutButton = document.getElementById('logout-btn');
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
    const totalWrvu = parseFloat(totalWrvuValue.textContent);
    const actualWrvuPerHour = parseFloat(wrvuPerHourValue.textContent);

    const shiftUpdate = {
        shift_end_time: new Date().toISOString(),
        total_wrvu: totalWrvu,
        actual_wrvu_per_hour: actualWrvuPerHour,
    };

    await updateShiftData(shiftUpdate);
    window.location.href = 'start.html';
});

// In main.js, replace your entire saveLayout function with this one.

async function saveLayout(showAlert = true) {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        if (showAlert) alert('You must be logged in to save a layout.');
        return;
    }

    // 1. Build the new layout data from what's currently on the screen.
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
                is_visible: true // Ensure the card remains visible
            });
        });
    });

    try {
        // 2. "Clear the board": Detach all procedures from their current positions.
        // This prevents the unique constraint error.
        const { error: clearError } = await supaClient
            .from('user_procedure_preferences')
            .update({ display_column: null, display_row: null })
            .eq('user_id', user.id);

        if (clearError) throw clearError;

        // 3. "Place the cards": Now that all positions are free, upsert the new layout.
        if (layoutData.length > 0) {
            const { error: upsertError } = await supaClient
                .from('user_procedure_preferences')
                .upsert(layoutData, { onConflict: 'user_id, procedure_id' });

            if (upsertError) throw upsertError;
        }

        if (showAlert) {
            alert('Layout saved successfully!');
        }

    } catch (error) {
        console.error('Error saving layout:', error);
        if (showAlert) alert(`Error saving layout: ${error.message}`);
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



// Reset layout functionality
// New and corrected reset layout function
resetLayoutButton.addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        alert('You must be logged in to reset a layout.');
        return;
    }

    if (!confirm("Are you sure you want to reset all layout and visibility settings to the application default? This cannot be undone.")) {
        return;
    }

    try {
        console.log("Resetting user data to default...");

        // Step 1: Delete the user's existing preferences and columns first.
        const { error: deletePrefsError } = await supaClient
            .from('user_procedure_preferences')
            .delete()
            .eq('user_id', user.id);
        if (deletePrefsError) throw deletePrefsError;

        const { error: deleteColsError } = await supaClient
            .from('user_columns')
            .delete()
            .eq('user_id', user.id);
        if (deleteColsError) throw deleteColsError;

        console.log("Existing data deleted. Populating defaults...");

        // Step 2: Now that the tables are clean, call the setup function to insert the defaults.
        const success = await setupNewUser(user.id);
        if (!success) {
            throw new Error("Failed to populate default settings after reset.");
        }

        alert('Layout has been reset to default.');
        
        // Step 3: Reload the UI to show the new default layout.
        loadProcedures();

    } catch (error) {
        console.error('Error resetting layout:', error);
        alert(`Failed to reset layout: ${error.message}`);
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

    const { error } = await supaClient
        .from('shift_entries')
        .delete()
        .eq('shift_id', activeShiftId);

    if (error) {
        alert('Error: Could not clear counts in the database.');
        console.error('Error clearing counts:', error);
        return;
    }

    document.querySelectorAll('.procedure-card .case-count').forEach(countElement => {
        countElement.textContent = '0';
    });

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
    const newDisplayOrder = procedureGrid.querySelectorAll('.grid-column').length + 1;

    const { data: newColumn, error } = await supaClient
        .from('user_columns')
        .insert({ user_id: user.id, title: null, display_order: newDisplayOrder })
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
        onEnd: function(evt) {
            if (evt.from.querySelectorAll('.procedure-card').length === 0) {
                const fromPlaceholder = evt.from.querySelector('.column-placeholder');
                if (fromPlaceholder) fromPlaceholder.style.display = 'flex';
            }
            const toPlaceholder = evt.to.querySelector('.column-placeholder');
            if (toPlaceholder) toPlaceholder.style.display = 'none';
            saveLayout(false);
        }
    });
});

async function getOrCreateActiveShift() {
    if (activeShiftId) return activeShiftId;

    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: existingShift, error } = await supaClient
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .is('shift_end_time', null)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching existing shift:', error);
        return null;
    }

    if (existingShift) {
        activeShiftId = existingShift.id;
        selectedShiftTemplateId = existingShift.shift_template_id; // Store the template ID

        // Find the template that matches the ID and set the title
        const currentTemplate = shiftTemplates.find(t => t.id === selectedShiftTemplateId);
        if (currentTemplate) {
            shiftTitleInput.value = currentTemplate.title;
        } else {
            // Fallback for older shifts that might not have a template ID
            shiftTitleInput.value = existingShift.shift_title || '';
        }

        // The rest of the input population can remain the same
        shiftTypeInput.value = existingShift.shift_type || '';
        shiftLengthHrsInput.value = existingShift.shift_length_hours || '';
        goalWrvuPerHourInput.value = existingShift.goal_wrvu_per_hour || '';

        if (existingShift.shift_start_time) {
            const startTime = new Date(existingShift.shift_start_time);
            const year = startTime.getFullYear();
            const month = String(startTime.getMonth() + 1).padStart(2, '0');
            const day = String(startTime.getDate()).padStart(2, '0');
            shiftStartDateInput.value = `${year}-${month}-${day}`;
            const hours = String(startTime.getHours()).padStart(2, '0');
            const minutes = String(startTime.getMinutes()).padStart(2, '0');
            shiftStartTimeField.value = `${hours}:${minutes}`;
        }
        return activeShiftId;
    } else {
        window.location.href = 'start.html';
        return null;
    }
}

async function updateProcedureCount(procedureId, newCount) {
    const shiftId = await getOrCreateActiveShift();
    if (!shiftId) return;

    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return;

    const { error } = await supaClient
        .from('shift_entries')
        .upsert({
            shift_id: shiftId,
            procedure_id: parseInt(procedureId),
            user_id: user.id,
            count: newCount
        }, { onConflict: 'shift_id, procedure_id' });

    if (error) console.error('Error updating procedure count:', error);
}

async function updateShiftData(updateObject) {
    const shiftId = await getOrCreateActiveShift();
    if (!shiftId) return;

    const { error } = await supaClient
        .from('shifts')
        .update(updateObject)
        .eq('id', shiftId);

    if (error) console.error(`Error updating shift:`, error);
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
    Object.keys(modalityValues).forEach(key => {
        if (modalityValues[key]) {
            modalityValues[key].textContent = modalityCounts[key] || 0;
        }
    });

    const shiftStartTime = getCombinedStartTime();
    const goalWrvuPerHour = parseFloat(goalWrvuPerHourInput.value);

    if (!shiftStartTime) {
        wrvuPerHourValue.textContent = "0.00";
        paceValue.textContent = "0h 0m";
        return;
    }

    const elapsedHours = (new Date() - new Date(shiftStartTime)) / (3600 * 1000);
    if (elapsedHours <= 0) {
        wrvuPerHourValue.textContent = "0.00";
        paceValue.textContent = "0h 0m";
        return;
    }

    const actualWrvuPerHour = totalWrvu / elapsedHours;
    wrvuPerHourValue.textContent = actualWrvuPerHour.toFixed(2);

    const paceBox = document.getElementById('pace-metric-item');
    if (isNaN(goalWrvuPerHour) || goalWrvuPerHour <= 0) {
        paceValue.textContent = "0h 0m";
        paceBox.className = 'metric-item pace-neutral';
        return;
    }

    const targetWrvus = goalWrvuPerHour * elapsedHours;
    const wrvuDifference = totalWrvu - targetWrvus;
    const paceMinutes = (wrvuDifference / goalWrvuPerHour) * 60;

    paceBox.className = 'metric-item'; // Reset classes
    if (paceMinutes > 5) paceBox.classList.add('pace-ahead');
    else if (paceMinutes < -5) paceBox.classList.add('pace-behind');
    else paceBox.classList.add('pace-neutral');

    const sign = paceMinutes < 0 ? "-" : "+";
    const absPaceMinutes = Math.abs(paceMinutes);
    const hours = Math.floor(absPaceMinutes / 60);
    const minutes = Math.round(absPaceMinutes % 60);
    paceValue.textContent = `${sign}${hours}h ${minutes}m`;
}

async function loadProcedures() {
    const procedureGrid = document.querySelector('.procedure-grid');
    procedureGrid.innerHTML = '';

    let shiftEntries = [];
    if (activeShiftId) {
        const { data, error } = await supaClient.from('shift_entries').select('procedure_id, count').eq('shift_id', activeShiftId);
        if (error) console.error('Error fetching shift entries:', error);
        else shiftEntries = data;
    }

    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        console.warn("No user is logged in. Cannot load procedures.");
        return;
    }

    const { data: preferences, error: prefError } = await supaClient.from('user_procedure_preferences').select('procedure_id, display_row, display_column').eq('user_id', user.id).eq('is_visible', true);
    if (prefError) {
        console.error('Error fetching user preferences:', prefError);
        return;
    }

    const visibleProcedureIds = preferences.map(p => p.procedure_id);
    let procedureData = [];
    if (visibleProcedureIds.length > 0) {
        const { data, error } = await supaClient.from('procedures').select('id, abbreviation, description, wrvu, modality').in('id', visibleProcedureIds);
        if (error) {
            console.error('Error fetching procedure details:', error);
            return;
        }
        procedureData = data;
    }

    const procedureDetails = procedureData.map(proc => {
        const pref = preferences.find(p => p.procedure_id === proc.id);
        return { ...proc, display_row: pref.display_row, display_column: pref.display_column };
    }).sort((a, b) => {
        if (a.display_column !== b.display_column) return a.display_column - b.display_column;
        return a.display_row - b.display_row;
    });

    let { data: userColumns, error: columnsError } = await supaClient.from('user_columns').select('*').eq('user_id', user.id).order('display_order');
    if (columnsError) {
        console.error('Error fetching user columns:', columnsError);
        return;
    }

    userColumns.forEach(c => {
        const column = document.createElement('div');
        column.className = 'grid-column';
        column.setAttribute('data-column-id', c.id);
        column.setAttribute('data-display-order', c.display_order);
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        if (userColumns.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-column-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteColumn(c.id); });
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
            <div class="card-header"><h3>${procedure.abbreviation} (${procedure.wrvu})</h3></div>
            <div class="card-controls">
                <div class="case-count">${count}</div>
                <button class="increment-btn">+</button>
            </div>`;
        const columnIndex = procedure.display_column - 1;
        if (columns[columnIndex]) {
            columns[columnIndex].appendChild(card);
        } else {
            if (columns[0]) columns[0].appendChild(card);
        }
    });

    document.querySelectorAll('.grid-column').forEach(column => {
        const placeholder = document.createElement('div');
        placeholder.className = 'column-placeholder';
        placeholder.textContent = 'Drag cards here';
        column.appendChild(placeholder);
        if (column.querySelectorAll('.procedure-card').length > 0) {
            placeholder.style.display = 'none';
        }
        new Sortable(column, {
            group: 'procedures',
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.column-placeholder',
            onEnd: function(evt) {
                if (evt.from.querySelectorAll('.procedure-card').length === 0) {
                    const fromPlaceholder = evt.from.querySelector('.column-placeholder');
                    if (fromPlaceholder) fromPlaceholder.style.display = 'flex';
                }
                const toPlaceholder = evt.to.querySelector('.column-placeholder');
                if (toPlaceholder) toPlaceholder.style.display = 'none';
                saveLayout(false);
            }
        });
    });

    attachEventListeners();
    updateDashboard();
}

function attachEventListeners() {
    document.querySelectorAll('.increment-btn').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.procedure-card');
            const countElement = card.querySelector('.case-count');
            const newCount = parseInt(countElement.textContent, 10) + 1;
            countElement.textContent = newCount;
            updateDashboard();
            const procedureId = card.getAttribute('data-procedure-id');
            updateProcedureCount(procedureId, newCount);
        });
    });

    document.querySelectorAll('.case-count').forEach(countElement => {
        countElement.contentEditable = true;
        countElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                countElement.blur();
                return;
            }
            if (!/^[0-9]$/.test(event.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
                event.preventDefault();
            }
        });
        countElement.addEventListener('blur', () => {
            let newCount = parseInt(countElement.textContent, 10) || 0;
            countElement.textContent = newCount; // Sanitize input
            updateDashboard();
            const card = countElement.closest('.procedure-card');
            const procedureId = card.getAttribute('data-procedure-id');
            updateProcedureCount(procedureId, newCount);
        });
    });

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

function handleShiftTitleChange() {
    const inputValue = shiftTitleInput.value.trim();
    if (!inputValue) {
        selectedShiftTemplateId = null;
        updateShiftData({ shift_template_id: null, shift_title: null });
        return;
    }

    const matchingTemplate = shiftTemplates.find(t => t.title.toLowerCase() === inputValue.toLowerCase());

    if (matchingTemplate) {
        // A template was found and selected
        selectedShiftTemplateId = matchingTemplate.id;
        shiftTitleInput.value = matchingTemplate.title; // Correct casing

        // Auto-fill other fields
        if (matchingTemplate.default_shift_type) shiftTypeInput.value = matchingTemplate.default_shift_type;
        if (matchingTemplate.default_length_hours) shiftLengthHrsInput.value = matchingTemplate.default_length_hours;
        if (matchingTemplate.default_goal_wrvu_per_hour) goalWrvuPerHourInput.value = matchingTemplate.default_goal_wrvu_per_hour;

        // Update the active shift with the selected template ID and title
        updateShiftData({
            shift_template_id: matchingTemplate.id,
            shift_title: matchingTemplate.title // Also save the title for compatibility
        });
    } else {
        // No match found, open the modal to confirm creation
        document.getElementById('new-template-name').textContent = inputValue;
        document.getElementById('new-shift-template-modal').classList.add('show');
    }
}

// --- Event Listeners for the new functionality ---

// Listen for when the user clicks away from the shift title input
shiftTitleInput.addEventListener('blur', handleShiftTitleChange);

// Modal close button
document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('new-shift-template-modal').classList.remove('show');
    shiftTitleInput.value = ''; // Clear the invalid input
});

// Modal cancel button
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    document.getElementById('new-shift-template-modal').classList.remove('show');
    shiftTitleInput.value = ''; // Clear the invalid input
});

// Modal create button
document.getElementById('modal-create-btn').addEventListener('click', async () => {
    const { data: { user } } = await supaClient.auth.getUser();
    const newTitle = document.getElementById('new-template-name').textContent;

    if (!user || !newTitle) return;

    // Insert the new template into the database
    const { data: newTemplate, error } = await supaClient
        .from('shift_templates')
        .insert({ user_id: user.id, title: newTitle })
        .select()
        .single();

    if (error) {
        console.error('Error creating new shift template:', error);
        alert('Could not create new shift location.');
        return;
    }

    // Close the modal and update the UI
    document.getElementById('new-shift-template-modal').classList.remove('show');
    shiftTitleInput.value = newTemplate.title;

    // Refresh the local list of templates and re-populate the datalist
    await loadAndPopulateShiftTemplates();

    // Trigger the 'blur' handler again to select and save the newly created template
    handleShiftTitleChange();
});

async function initializeApp() {
    sessionStorage.removeItem('targetColumnDisplayOrder');
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Check if user preferences exist
    const { data: prefs, error } = await supaClient
        .from('user_procedure_preferences')
        .select('user_id', { count: 'exact' })
        .eq('user_id', user.id);
    
    if (error) {
        console.error("Could not check user preferences:", error.message);
        return;
    }

    // If the user has no preferences, run the one-time setup
    if (prefs.length === 0) {
        await setupNewUser(user.id);
    }
    
    // Now that we know the user is set up, proceed with normal app loading
    await loadAndPopulateShiftTemplates(); // <-- ADD THIS LINE
    await getOrCreateActiveShift();
    await loadProcedures();
}

initializeApp();

setInterval(updateDashboard, 60000);