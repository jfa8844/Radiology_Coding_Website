// supabase initialization
const SUPABASE_URL = 'https://byvclyemwwoxhhzsfwrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNseWVtd3dveGhoenNmd3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjYwNzYsImV4cCI6MjA3MTA0MjA3Nn0.6Wy4Xm02bskAZPXMJMudWgtoUqlZNIp0UDAQibr3jwM';
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Logout functionality
const logoutButton = document.getElementById('logout-btn');
logoutButton.addEventListener('click', async () => {
    await supaClient.auth.signOut();
    window.location.href = 'index.html';
});

async function loadProcedures() {
    const procedureGrid = document.querySelector('.procedure-grid');
    procedureGrid.innerHTML = ''; // Clear existing static cards

    const { data, error } = await supaClient
        .from('procedures')
        .select('id, abbreviation, description, wrvu, modality');

    if (error) {
        console.error('Error fetching procedures:', error);
        return;
    }

    data.forEach(procedure => {
        const cardHTML = `
            <div class="procedure-card" data-procedure-id="${procedure.id}" data-wrvu="${procedure.wrvu}" data-modality="${procedure.modality}">
                <div class="card-header">
                    <h3>${procedure.abbreviation}</h3>
                    <p>${procedure.description}</p>
                </div>
                <div class="card-controls">
                    <div class="case-count">0</div>
                    <button class="increment-btn">+</button>
                </div>
            </div>
        `;
        procedureGrid.innerHTML += cardHTML;
    });

    attachEventListeners();
}

function attachEventListeners() {
    // Increment button functionality
    document.querySelectorAll('.increment-btn').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.procedure-card');
            const countElement = card.querySelector('.case-count');
            let currentCount = parseInt(countElement.textContent, 10);
            countElement.textContent = currentCount + 1;
        });
    });

    // Manual count editing
    document.querySelectorAll('.case-count').forEach(countElement => {
        countElement.contentEditable = true;

        countElement.addEventListener('keydown', (event) => {
            // Allow control keys like backspace, delete, arrows
            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
                return;
            }
            // If the key is "Enter", remove focus from the element
            if (event.key === 'Enter') {
                event.preventDefault();
                countElement.blur();
                return;
            }
            // Prevent any key that is not a number
            if (!/^[0-9]$/.test(event.key)) {
                event.preventDefault();
            }
        });

        // Add a blur event listener to handle empty input
        countElement.addEventListener('blur', () => {
            if (countElement.textContent.trim() === '') {
                countElement.textContent = '0';
            }
        });
    });
}

loadProcedures();
