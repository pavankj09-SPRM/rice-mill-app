// --- INITIALIZATION ---
window.onload = () => {
    // Default to 'hulling' tab on startup
    switchTab('hulling');
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('main_date_picker').value = today;
    
    refreshAll();
};

// --- PROFESSIONAL TAB SWITCHER ---
// --- INITIALIZATION ---
window.onload = () => {
    switchTab('hulling'); // Start here
    
    // Auto-calculate Total in Hulling Form
    const wInput = document.getElementById('h_weight');
    const rInput = document.getElementById('h_rate');
    const tInput = document.getElementById('h_total_input');

    const updateTotal = () => {
        const kg = Logic.processWeight(wInput.value);
        tInput.value = Math.round((kg / 100) * rInput.value);
    };

    wInput.oninput = updateTotal;
    rInput.oninput = updateTotal;

    refreshAll();
};

// --- TAB SWITCHER (Matches hulling-tab, stock-tab, etc.) ---
function switchTab(tabName) {
    // 1. Hide all sections that have the class 'tab-content'
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 2. Remove 'active' class from all nav items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // 3. Show the correct tab by ID (Adding the "-tab" suffix)
    const targetId = tabName + "-tab"; 
    const targetContent = document.getElementById(targetId);
    if (targetContent) targetContent.classList.add('active');

    // 4. Highlight the nav button
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetNav) targetNav.classList.add('active');

    if (tabName === 'history' || tabName === 'summary') refreshAll();
}

// Ensure Nav Items call the function
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    };
});

// Add event listeners to your nav items
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});
