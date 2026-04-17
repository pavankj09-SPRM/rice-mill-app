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
    // 1. Remove 'active' from all contents and all buttons
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    // 2. Add 'active' to the chosen tab and button
    const targetContent = document.getElementById(tabId);
    const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);

    if (targetContent) targetContent.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    // 3. Optional: Refresh data when switching to summary or history
    if (tabId === 'history' || tabId === 'summary') refreshAll();
}

// Add event listeners to your nav items
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});
