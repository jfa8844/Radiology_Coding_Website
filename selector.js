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

    if (isVisible) {
        let targetColumnDisplayOrder;

        // Check session storage for a display order from this session
        const storedOrder = sessionStorage.getItem('targetColumnDisplayOrder');

        if (storedOrder) {
            targetColumnDisplayOrder = parseInt(storedOrder, 10);
        } else {
            // If no order in session, find the max display order from the DB
            const { data: maxOrder, error: maxOrderError } = await supaClient
                .from('user_columns')
                .select('display_order')
                .eq('user_id', user.id)
                .order('display_order', { ascending: false })
                .limit(1)
                .single();

            if (maxOrderError && maxOrderError.code !== 'PGRST116') {
                console.error('Error fetching max column order:', maxOrderError);
                return; // Stop if we can't determine the next column
            }

            targetColumnDisplayOrder = (maxOrder ? maxOrder.display_order : 0) + 1;

            // Create the new column in the user_columns table
            const { error: insertError } = await supaClient
                .from('user_columns')
                .insert({ user_id: user.id, display_order: targetColumnDisplayOrder });

            if (insertError) {
                console.error('Error creating new column:', insertError);
                return; // Stop if the column can't be created
            }

            // Store the new display order in session storage for next time
            sessionStorage.setItem('targetColumnDisplayOrder', targetColumnDisplayOrder);
        }

        // Find the next available row in the target column
        const { data: lastCard, error: lastCardError } = await supaClient
            .from('user_procedure_preferences')
            .select('display_row')
            .eq('user_id', user.id)
            .eq('display_column', targetColumnDisplayOrder)
            .order('display_row', { ascending: false })
            .limit(1)
            .single();

        if (lastCardError && lastCardError.code !== 'PGRST116') {
            console.error('Error finding last card in column:', lastCardError);
            // Don't return, we can still try to place it at row 1
        }

        const nextRow = lastCard ? lastCard.display_row + 1 : 1;

        // Upsert the procedure preference with the new position
        const { error: upsertError } = await supaClient
            .from('user_procedure_preferences')
            .upsert({
                user_id: user.id,
                procedure_id: procedureId,
                is_visible: true,
                display_column: targetColumnDisplayOrder,
                display_row: nextRow
            }, { onConflict: 'user_id, procedure_id' });

        if (upsertError) {
            console.error('Error upserting procedure preference:', upsertError);
        }

    } else {
        // If toggling off, just set is_visible to false and null out the position
        const { error: upsertError } = await supaClient
            .from('user_procedure_preferences')
            .upsert({
                user_id: user.id,
                procedure_id: procedureId,
                is_visible: false,
                display_column: null,
                display_row: null
            }, { onConflict: 'user_id, procedure_id' });

        if (upsertError) {
            console.error('Error hiding procedure:', upsertError);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', filterProcedures);
    }
});

function filterProcedures() {
    // 1. Get the search term, trim whitespace, and split it into individual words (tokens).
    // The regular expression /\s+/ splits on one or more spaces, preventing empty array elements.
    const searchInput = document.getElementById('search-bar').value.toLowerCase().trim();
    const searchTokens = searchInput.split(/\s+/).filter(Boolean); // .filter(Boolean) removes any empty strings

    const procedureRows = document.querySelectorAll('.procedure-list-container tr');

    procedureRows.forEach(row => {
        // 2. For each row, get its combined text content in lowercase.
        const rowText = row.textContent.toLowerCase();
        
        // 3. Check if EVERY search token is present in the row's text.
        // The Array.every() method is perfect for this "AND" logic. It returns true
        // only if the callback function returns true for every item in the array.
        const isMatch = searchTokens.every(token => rowText.includes(token));
        
        // 4. Show or hide the row based on the result.
        row.style.display = isMatch ? '' : 'none';
    });
}
