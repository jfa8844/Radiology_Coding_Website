// supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const procedureListContainer = document.querySelector('.procedure-list-container');

async function loadProceduresAndPreferences() {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Fetch all procedures
    const { data: procedures, error: proceduresError } = await supaClient
        .from('procedures')
        .select('*');

    if (proceduresError) {
        console.error('Error fetching procedures:', proceduresError);
        return;
    }

    // Fetch user preferences
    const { data: preferences, error: preferencesError } = await supaClient
        .from('user_procedure_preferences')
        .select('*')
        .eq('user_id', user.id);

    if (preferencesError) {
        console.error('Error fetching user preferences:', preferencesError);
        return;
    }

    // Create a map of preferences for easy lookup
    const preferencesMap = new Map(preferences.map(p => [p.procedure_id, p]));

    // Clear the container
    procedureListContainer.innerHTML = '';

    // Create and append procedure items
    procedures.forEach(procedure => {
        const userPreference = preferencesMap.get(procedure.id);
        const isVisible = userPreference ? userPreference.is_visible : procedure.default_display;

        const procedureItem = document.createElement('div');
        procedureItem.classList.add('procedure-item');

        procedureItem.innerHTML = `
            <span class="procedure-name">${procedure.description}</span>
            <label class="switch">
                <input type="checkbox" ${isVisible ? 'checked' : ''} data-procedure-id="${procedure.id}">
                <span class="slider round"></span>
            </label>
        `;

        procedureListContainer.appendChild(procedureItem);
    });
}

document.addEventListener('DOMContentLoaded', loadProceduresAndPreferences);

procedureListContainer.addEventListener('change', async (event) => {
    if (event.target.type === 'checkbox') {
        const procedureId = event.target.dataset.procedureId;
        const isVisible = event.target.checked;
        await handleToggle(parseInt(procedureId), isVisible);
    }
});

async function handleToggle(procedureId, isVisible) {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return;

    // Read the full UI state of all toggles to use as the source of truth for visibility.
    const allCheckboxes = document.querySelectorAll('.procedure-list-container input[type="checkbox"]');
    const uiVisibilityState = new Map();
    allCheckboxes.forEach(checkbox => {
        uiVisibilityState.set(parseInt(checkbox.dataset.procedureId), checkbox.checked);
    });

    // Fetch existing preferences for layout data, or create a snapshot if none exist.
    let { data: currentPreferences, error: prefError } = await supaClient
        .from('user_procedure_preferences')
        .select('*')
        .eq('user_id', user.id);

    if (prefError) {
        console.error('Error fetching preferences', prefError);
        return;
    }

    if (currentPreferences.length === 0) {
        let { data: allProcedures, error: procError } = await supaClient
            .from('procedures')
            .select('id, default_display, default_column, default_row');

        if (procError) {
            console.error('Error fetching all procedures for snapshot', procError);
            return;
        }
        currentPreferences = allProcedures.map(p => ({
            user_id: user.id,
            procedure_id: p.id,
            is_visible: p.default_display,
            display_column: p.default_column,
            display_row: p.default_row,
        }));
    }

    // Merge the UI visibility state into our preference data.
    currentPreferences.forEach(pref => {
        const uiState = uiVisibilityState.get(pref.procedure_id);
        if (uiState !== undefined) {
            pref.is_visible = uiState;
        }
    });

    // If the toggled procedure was made visible and needs a position, calculate it.
    const preferenceToUpdate = currentPreferences.find(p => p.procedure_id === procedureId);
    if (preferenceToUpdate && preferenceToUpdate.is_visible && (preferenceToUpdate.display_column === null || preferenceToUpdate.display_row === null)) {
        const existingColumns = new Set(currentPreferences.filter(p => p.is_visible && p.display_column !== null).map(p => p.display_column));
        const maxColumn = existingColumns.size > 0 ? Math.max(...existingColumns) : 0;
        const nextColumn = maxColumn + 1;

        preferenceToUpdate.display_column = nextColumn;
        preferenceToUpdate.display_row = 1;

        let { data: userColumns, error: columnsError } = await supaClient
            .from('user_columns').select('display_order').eq('user_id', user.id);

        if (columnsError) { console.error('Error fetching user columns:', columnsError); return; }

        const columnExists = userColumns.some(c => c.display_order === nextColumn);
        if (!columnExists) {
            const { error: newColumnError } = await supaClient
                .from('user_columns')
                .insert({ user_id: user.id, display_order: nextColumn });

            if (newColumnError) { console.error('Error creating new column:', newColumnError); return; }
        }
    }

    // Upsert the final, merged state, ensuring what the user sees is what gets saved.
    const { error: upsertError } = await supaClient
        .from('user_procedure_preferences')
        .upsert(currentPreferences, { onConflict: 'user_id, procedure_id' });

    if (upsertError) {
        console.error('Error upserting full preference set:', upsertError);
    }
}
