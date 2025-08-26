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

    let preferenceData = {
        user_id: user.id,
        procedure_id: procedureId,
        is_visible: isVisible
    };

    if (isVisible) {
        // When a procedure is made visible, find a place for it in the grid.
        const [
            { data: visiblePreferences, error: prefError },
            { data: userColumns, error: columnsError }
        ] = await Promise.all([
            supaClient.from('user_procedure_preferences').select('display_column').eq('user_id', user.id).eq('is_visible', true),
            supaClient.from('user_columns').select('display_order').eq('user_id', user.id)
        ]);

        if (prefError || columnsError) {
            console.error('Error fetching preferences or columns:', prefError || columnsError);
            return;
        }

        // Determine the next column number by finding the max of existing visible columns
        const existingColumns = new Set(visiblePreferences.map(p => p.display_column).filter(c => c !== null));
        const maxColumn = existingColumns.size > 0 ? Math.max(...existingColumns) : 0;
        const nextColumn = maxColumn + 1;

        preferenceData.display_column = nextColumn;
        preferenceData.display_row = 1; // It's a new column, so it will be the first item.

        // Check if the new column exists in user_columns and create it if it doesn't
        const columnExists = userColumns.some(c => c.display_order === nextColumn);
        if (!columnExists) {
            const { error: newColumnError } = await supaClient
                .from('user_columns')
                .insert({ user_id: user.id, display_order: nextColumn });

            if (newColumnError) {
                console.error('Error creating new column:', newColumnError);
                return; // Stop if we can't create the column, as the card would be orphaned.
            }
        }
    }

    // Upsert the final preference data
    const { error } = await supaClient
        .from('user_procedure_preferences')
        .upsert(preferenceData, { onConflict: 'user_id, procedure_id' });

    if (error) {
        console.error('Error updating preference:', error);
    }
}
