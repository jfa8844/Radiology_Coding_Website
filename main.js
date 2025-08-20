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

function updateDashboard() {
    const cards = document.querySelectorAll('.procedure-card');
    let totalWrvu = 0;
    let totalCases = 0;
    const modalityCounts = {
        CT: 0,
        MRI: 0,
        XR: 0,
        US: 0,
        NM: 0
    };

    cards.forEach(card => {
        const count = parseInt(card.querySelector('.case-count').textContent, 10);
        const wrvu = parseFloat(card.getAttribute('data-wrvu'));
        const modality = card.getAttribute('data-modality');

        totalWrvu += count * wrvu;
        totalCases += count;

        if (modality in modalityCounts) {
            modalityCounts[modality] += count;
        }
    });

    // Update Dashboard DOM
    document.querySelector('.live-metrics .metric-item:nth-child(1) .metric-value').textContent = totalWrvu.toFixed(2);
    // Assuming the "Total" cases are the sum of all cases
    document.querySelector('.modality-trackers .modality-item:nth-child(1) .modality-value').textContent = totalCases;


    document.querySelector('.modality-trackers .modality-item:nth-child(2) .modality-value').textContent = modalityCounts.CT;
    document.querySelector('.modality-trackers .modality-item:nth-child(3) .modality-value').textContent = modalityCounts.MRI;
    document.querySelector('.modality-trackers .modality-item:nth-child(4) .modality-value').textContent = modalityCounts.XR;
    document.querySelector('.modality-trackers .modality-item:nth-child(5) .modality-value').textContent = modalityCounts.US;
    document.querySelector('.modality-trackers .modality-item:nth-child(6) .modality-value').textContent = modalityCounts.NM;

}

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
    updateDashboard(); // Initial call to set dashboard to 0
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

        // Add a blur event listener to handle empty input and update dashboard
        countElement.addEventListener('blur', () => {
            if (countElement.textContent.trim() === '') {
                countElement.textContent = '0';
            }
            updateDashboard(); // Update dashboard after manual edit
        });
    });
}

loadProcedures();
