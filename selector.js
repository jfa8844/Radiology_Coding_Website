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

    let { data: currentPreferences, error: prefError } = await supaClient
        .from('user_procedure_preferences')
        .select('*')
        .eq('user_id', user.id);

    if (prefError) {
        console.error('Error fetching preferences', prefError);
        return;
    }

    // If the user has no preferences, this is their first customization.
    // We need to create a "snapshot" of the default layout for them.
    if (currentPreferences.length === 0) {
        let { data: allProcedures, error: procError } = await supaClient
            .from('procedures')
            .select('id, default_display, default_column, default_row');

        if (procError) {
            console.error('Error fetching all procedures for snapshot', procError);
            return;
        }

        // Create a preference object for every procedure based on its default state.
        currentPreferences = allProcedures.map(p => ({
            user_id: user.id,
            procedure_id: p.id,
            is_visible: p.default_display,
            display_column: p.default_column,
            display_row: p.default_row,
        }));
    }

    // Now, `currentPreferences` holds the full layout state (either from a previous save or a new snapshot).
    // Find the specific procedure the user just toggled.
    const preferenceToUpdate = currentPreferences.find(p => p.procedure_id === procedureId);

    if (!preferenceToUpdate) {
        console.error("Logic error: Could not find the toggled procedure in the preferences list.");
        return;
    }

    // Update the visibility of the toggled procedure.
    preferenceToUpdate.is_visible = isVisible;

    // If a procedure is being made visible and it doesn't have a display position, assign it one.
    if (isVisible && (preferenceToUpdate.display_column === null || preferenceToUpdate.display_row === null)) {
        const existingColumns = new Set(currentPreferences.filter(p => p.is_visible).map(p => p.display_column).filter(c => c !== null));
        const maxColumn = existingColumns.size > 0 ? Math.max(...existingColumns) : 0;
        const nextColumn = maxColumn + 1;

        preferenceToUpdate.display_column = nextColumn;
        preferenceToUpdate.display_row = 1; // It's the first item in a new column.

        // Ensure the new column exists in the user_columns table.
        let { data: userColumns, error: columnsError } = await supaClient
            .from('user_columns').select('display_order').eq('user_id', user.id);

        if (columnsError) {
            console.error('Error fetching user columns:', columnsError);
            return;
        }

        const columnExists = userColumns.some(c => c.display_order === nextColumn);
        if (!columnExists) {
            const { error: newColumnError } = await supaClient
                .from('user_columns')
                .insert({ user_id: user.id, display_order: nextColumn });

            if (newColumnError) {
                console.error('Error creating new column:', newColumnError);
                return;
            }
        }
    }

    // Finally, upsert the ENTIRE set of preferences. This preserves the layout.
    const { error: upsertError } = await supaClient
        .from('user_procedure_preferences')
        .upsert(currentPreferences, { onConflict: 'user_id, procedure_id' });

    if (upsertError) {
        console.error('Error upserting full preference set:', upsertError);
    }
}
