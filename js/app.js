let myChart = null;
let currentSummaryView = 'month';

// Initialization
window.onload = () => {
    document.getElementById('main_date_picker').valueAsDate = new Date();
    attachListeners();
    refreshAll();
};

function attachListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.getElementById(e.target.dataset.tab).classList.add('active');
            e.target.classList.add('active');
        });
    });

    // Date Picker
    document.getElementById('main_date_picker').addEventListener('change', refreshAll);

    // Save Buttons
    document.getElementById('btn_save_hulling').addEventListener('click', saveHulling);
    document.getElementById('btn_save_stock').addEventListener('click', saveStock);
    document.getElementById('btn_save_expense').addEventListener('click', saveExpense);
    document.getElementById('btn_add_variety').addEventListener('click', addVariety);

    // Utility Buttons
    document.getElementById('btn_auto_labour').addEventListener('click', autoLabour);
    document.getElementById('btn_set_elec').addEventListener('click', () => {
        document.getElementById('exp_name').value = "Electricity Bill";
    });

    // History View Toggles
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentSummaryView = e.target.dataset.view;
            document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            generateSummary();
        });
    });

    // Backup/Restore
    document.getElementById('btn_backup').addEventListener('click', exportJSON);
    document.getElementById('btn_restore_trigger').addEventListener('click', () => document.getElementById('import_file').click());
    document.getElementById('import_file').addEventListener('change', importJSON);
}

// --- CORE ACTIONS ---

async function refreshAll() {
    updateSettingsGrid();
    viewDayLog();
    refreshDashboard();
    generateSummary();
}

async function saveHulling() {
    const name = document.getElementById('h_name').value;
    const weight = document.getElementById('h_weight').value;
    if(!name || !weight) return alert("Fill required fields");

    await db.hulling.add({
        name, weight,
        total: document.getElementById('h_total_input').value,
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Hulling Saved");
    refreshAll();
}

async function refreshDashboard() {
    const d = document.getElementById('main_date_picker').value;
    
    // Fetch data for the selected date
    const h = await db.hulling.where('date').equals(d).toArray();
    const s = await db.stock.where('date').equals(d).toArray();
    const e = await db.expenses.where('date').equals(d).toArray();

    // Calculations using Logic.js helpers
    const tKg = h.reduce((sum, item) => sum + Logic.processWeight(item.weight, 'paddy'), 0);
    const income = h.filter(x => x.status === 'Paid').reduce((sum, item) => sum + parseFloat(item.total || 0), 0) +
                   s.filter(x => x.action === 'Sale').reduce((sum, item) => sum + (item.amount || 0), 0);
    const expense = e.reduce((sum, item) => sum + (item.amount || 0), 0) +
                    s.filter(x => x.action === 'Purchase').reduce((sum, item) => sum + (item.amount || 0), 0);

    // Update the UI boxes
    const statsContainer = document.getElementById('dash_stats_container');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-box stat-hulling"><span>Daily Hulling</span><span class="stat-val">${Logic.formatDisplay(tKg)}</span></div>
            <div class="stat-box stat-income"><span>Income</span><span class="stat-val">₹${income}</span></div>
            <div class="stat-box stat-expense"><span>Expense</span><span class="stat-val">₹${expense}</span></div>
        `;
    }

    renderChart(income, expense);
}

function renderChart(inc, exp) {
    const canvas = document.getElementById('financeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (myChart) myChart.destroy(); // Always destroy old chart before drawing new one

    myChart = new Chart(ctx, {
        type: 'doughnut', // Doughnut looks great on mobile dashboards
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [inc, exp],
                backgroundColor: ['#2e7d32', '#c62828'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
/* async function refreshDashboard() {
    const d = document.getElementById('main_date_picker').value;
    const h = await db.hulling.where('date').equals(d).toArray();
    const s = await db.stock.where('date').equals(d).toArray();
    const e = await db.expenses.where('date').equals(d).toArray();

    const tKg = h.reduce((a, b) => a + Logic.processWeight(b.weight, 'paddy'), 0);
    const inc = h.filter(x => x.status === 'Paid').reduce((a,b) => a + parseFloat(b.total), 0);
    const exp = e.reduce((a,b) => a + b.amount, 0);

    document.getElementById('dash_stats_container').innerHTML = `
        <div class="stat-box stat-hulling"><span>Daily Hulling</span><span class="stat-val">${Logic.formatDisplay(tKg)}</span></div>
        <div class="stat-box stat-income"><span>Income</span><span class="stat-val">₹${inc}</span></div>
        <div class="stat-box stat-expense"><span>Expense</span><span class="stat-val">₹${exp}</span></div>
    `;
}*/

// (Remaining viewDayLog, generateSummary, updateSettingsGrid, export/import functions here...)
// Note: Ensure functions like generateSummary use Logic.processWeight and Logic.formatDisplay
