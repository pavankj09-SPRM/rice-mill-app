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
function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    // Deactivate all buttons
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    // Show selected
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    if (tabId === 'history' || tabId === 'summary') refreshAll();
}

// Add event listeners to your nav items
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});
