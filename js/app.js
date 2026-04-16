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
   /* document.getElementById('btn_restore_trigger').addEventListener('click', () => document.getElementById('import_file').click());
    document.getElementById('import_file').addEventListener('change', importJSON);
*/
    
    // Add this to your attachListeners() function in app.js
const restoreBtn = document.getElementById('btn_restore_trigger');
const fileInput = document.getElementById('import_file');

if (restoreBtn && fileInput) {
    restoreBtn.onclick = () => {
        fileInput.value = null; // Clear old selection
        fileInput.click();      // Trigger the hidden file browser
    };

    fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // IMPORTANT: Use a transaction for safety
                await db.transaction('rw', [db.settings, db.hulling, db.stock, db.expenses], async () => {
                    await Promise.all([
                        db.settings.clear(),
                        db.hulling.clear(),
                        db.stock.clear(),
                        db.expenses.clear()
                    ]);

                    if (data.settings) await db.settings.bulkAdd(data.settings);
                    if (data.hulling) await db.hulling.bulkAdd(data.hulling);
                    if (data.stock) await db.stock.bulkAdd(data.stock);
                    if (data.expenses) await db.expenses.bulkAdd(data.expenses);
                });

                alert("Data Restored Successfully!");
                window.location.reload(); // Hard refresh to update UI
            } catch (err) {
                console.error("Restore Error:", err);
                alert("Failed to restore. Check Console for details.");
            }
        };
        reader.readAsText(file);
    };
}
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
    const selectedDate = document.getElementById('main_date_picker').value;
    
    // Fetch all needed data
    const [hEntries, sEntries, eEntries] = await Promise.all([
        db.hulling.where('date').equals(selectedDate).toArray(),
        db.stock.where('date').equals(selectedDate).toArray(),
        db.expenses.where('date').equals(selectedDate).toArray()
    ]);

    // 1. Calculate Daily Hulling Qnt
    const totalHullingKg = hEntries.reduce((acc, curr) => acc + Logic.processWeight(curr.weight, 'paddy'), 0);

    // 2. Calculate Cash In (Paid Hulling + Sales)
    const income = hEntries.filter(x => x.status === 'Paid').reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0) +
                   sEntries.filter(x => x.action === 'Sale').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    // 3. Calculate Cash Out (Purchases + Expenses)
    const expense = sEntries.filter(x => x.action === 'Purchase').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) +
                    eEntries.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    // Update the Stat Boxes
    document.getElementById('dash_stats_container').innerHTML = `
        <div class="stat-box stat-hulling"><span>Daily Hulling</span><span class="stat-val">${Logic.formatDisplay(totalHullingKg)}</span></div>
        <div class="stat-box stat-income"><span>Income</span><span class="stat-val">₹${income.toLocaleString()}</span></div>
        <div class="stat-box stat-expense"><span>Expense</span><span class="stat-val">₹${expense.toLocaleString()}</span></div>
    `;

    renderChart(income, expense);
}

function renderChart(inc, exp) {
    const canvas = document.getElementById('financeChart');
    if (!canvas) return;

    if (myChart) myChart.destroy();
    
    // Only show chart if there is data
    if (inc === 0 && exp === 0) {
        canvas.style.display = 'none';
        return;
    }
    canvas.style.display = 'block';

    myChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [inc, exp],
                backgroundColor: ['#2e7d32', '#c62828'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
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
