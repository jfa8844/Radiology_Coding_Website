// selector.js

// DOM element references
const procedureListContainer = document.querySelector('.procedure-list-container');
const searchBar = document.getElementById('search-bar');

let supaClient; // Declare Supabase client at the top level

// Main function to initialize the page
async function initializeSelectorPage() {
    try {
        // Fetch config and initialize the client first
        const response = await fetch('/config');
        const config = await response.json();
        supaClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Once the client is ready, load data and attach listeners
        await loadProceduresAndPreferences();
        attachEventListeners();

    } catch (error) {
        console.error('Failed to initialize selector page:', error);
        // Optionally, display an error message to the user on the page
    }
}

function attachEventListeners() {
    // Listener for toggling procedure visibility
    procedureListContainer.addEventListener('change', async (event) => {
        if (event.target.type === 'checkbox') {
            const procedureId = event.target.dataset.procedureId;
            const isVisible = event.target.checked;
            await handleToggle(parseInt(procedureId), isVisible);
        }
    });

    // Listener for the search bar
    if (searchBar) {
        searchBar.addEventListener('input', filterProcedures);
    }
}

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

    const preferencesMap = new Map(preferences.map(p => [p.procedure_id, p]));
    procedureListContainer.innerHTML = ''; // Clear the container

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
            <td>${procedure.wrvu}</td>
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

async function handleToggle(procedureId, isVisible) {
    const { data: { user } } = await supaClient.auth.getUser();
    if (!user) return;

    if (isVisible) {
        let targetColumnDisplayOrder;
        const storedOrder = sessionStorage.getItem('targetColumnDisplayOrder');

        if (storedOrder) {
            targetColumnDisplayOrder = parseInt(storedOrder, 10);
        } else {
            const { data: maxOrder, error: maxOrderError } = await supaClient
                .from('user_columns')
                .select('display_order')
                .eq('user_id', user.id)
                .order('display_order', { ascending: false })
                .limit(1)
                .single();
            if (maxOrderError && maxOrderError.code !== 'PGRST116') {
                console.error('Error fetching max column order:', maxOrderError);
                return;
            }
            targetColumnDisplayOrder = (maxOrder ? maxOrder.display_order : 0) + 1;
            const { error: insertError } = await supaClient
                .from('user_columns')
                .insert({ user_id: user.id, display_order: targetColumnDisplayOrder });
            if (insertError) {
                console.error('Error creating new column:', insertError);
                return;
            }
            sessionStorage.setItem('targetColumnDisplayOrder', targetColumnDisplayOrder);
        }

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
        }
        const nextRow = lastCard ? lastCard.display_row + 1 : 1;
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

function filterProcedures() {
    const searchInput = searchBar.value.toLowerCase().trim();
    const searchTokens = searchInput.split(/\s+/).filter(Boolean);
    const procedureRows = document.querySelectorAll('.procedure-list-container tr');

    procedureRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const isMatch = searchTokens.every(token => rowText.includes(token));
        row.style.display = isMatch ? '' : 'none';
    });
}

// Start the page initialization process
initializeSelectorPage();