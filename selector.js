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

        const procedureRow = document.createElement('tr');
        procedureRow.classList.add('procedure-item');

        procedureRow.innerHTML = `
            <td>${procedure.cpt_code}</td>
            <td>${procedure.abbreviation}</td>
            <td>${procedure.description}</td>
            <td>${procedure.modality}</td>
            <td>${procedure.wrVU}</td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${isVisible ? 'checked' : ''} data-procedure-id="${procedure.id}">
                    <span class="slider round"></span>
                </label>
            </td>
        `;

        procedureListContainer.appendChild(procedureRow);
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

    // First, get the current preference for this specific procedure
    let { data: preference, error: fetchError } = await supaClient
        .from('user_procedure_preferences')
        .select('display_column, display_row')
        .eq('user_id', user.id)
        .eq('procedure_id', procedureId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = single row not found
        console.error('Error fetching procedure preference:', fetchError);
        return;
    }

    const upsertData = {
        user_id: user.id,
        procedure_id: procedureId,
        is_visible: isVisible,
        display_column: preference ? preference.display_column : null,
        display_row: preference ? preference.display_row : null,
    };

    // If making visible and it has no position, assign one.
    if (isVisible && (upsertData.display_column === null || upsertData.display_row === null)) {
        // Find the last row in the first column to append the new procedure
        const { data: lastCardInCol1, error: lastCardError } = await supaClient
            .from('user_procedure_preferences')
            .select('display_row')
            .eq('user_id', user.id)
            .eq('display_column', 1)
            .order('display_row', { ascending: false })
            .limit(1)
            .single();

        if (lastCardError && lastCardError.code !== 'PGRST116') {
            console.error('Error finding last card in column 1:', lastCardError);
            // Fallback to a default position
            upsertData.display_column = 1;
            upsertData.display_row = 999;
        } else {
            upsertData.display_column = 1;
            upsertData.display_row = lastCardInCol1 ? lastCardInCol1.display_row + 1 : 1;
        }
    }

    const { error: upsertError } = await supaClient
        .from('user_procedure_preferences')
        .upsert(upsertData, { onConflict: 'user_id, procedure_id' });

    if (upsertError) {
        console.error('Error upserting procedure preference:', upsertError);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', filterProcedures);
    }
});

function filterProcedures() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const procedureRows = document.querySelectorAll('.procedure-list-container tr');

    procedureRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
