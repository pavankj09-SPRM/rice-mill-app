/**
 * js/app.js - Stable, Integrated Version for Parshwanatha Rice Mill
 */

// --- 1. INITIALIZATION & REFRESH ---
// Defined at the very top so the browser always finds it
async function refreshAll() {
    try {
        await viewDayLog();
        await generateSummary();
    } catch (error) {
        console.error("Refresh Error:", error);
    }
}

window.onload = () => {
    // 1. Set default date
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.value = today;
        datePicker.onchange = refreshAll;
    }

    // 2. Initialize Tab
    switchTab('hulling'); 

    // 3. Auto-calculate Total in Hulling Form
    const wInput = document.getElementById('h_weight');
    const rInput = document.getElementById('h_rate');
    const tInput = document.getElementById('h_total_input');

    if (wInput && rInput && tInput) {
        const updateTotal = () => {
            const kg = Logic.processWeight(wInput.value);
            tInput.value = Math.round((kg / 100) * rInput.value);
        };
        wInput.oninput = updateTotal;
        rInput.oninput = updateTotal;
    }

    // 4. Bind the Save Button
    const saveBtn = document.getElementById('btn_save_hulling');
    if (saveBtn) saveBtn.onclick = saveHulling;

    refreshAll();
};

// --- 2. TAB SWITCHER (Matches your prefix-tab IDs) ---
function switchTab(tabName) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active from nav buttons
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // Show target tab (e.g., hulling-tab)
    const targetId = tabName + "-tab"; 
    const targetContent = document.getElementById(targetId);
    if (targetContent) targetContent.classList.add('active');

    // Highlight nav button
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Refresh when switching to data tabs
    if (tabName === 'history' || tabName === 'summary') refreshAll();
}

// Bind Navigation Clicks
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    };
});

// --- 3. DATA SAVING LOGIC ---

async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weightVal = document.getElementById('h_weight').value;
    const rate = document.getElementById('h_rate').value;
    const status = document.getElementById('h_status').value;
    const date = document.getElementById('main_date_picker').value;

    if (!name || !weightVal) return alert("Please enter Customer Name and Weight");

    const kg = Logic.processWeight(weightVal);
    const total = Math.round((kg / 100) * rate);

    await db.hulling.add({
        name, weight: weightVal, rate, total, status, date
    });

    // Reset Form
    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    
    alert("Saved Successfully!");
    refreshAll();
}

// --- 4. DATA DISPLAY LOGIC ---

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const data = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    data.forEach(x => {
        html += `
        <div class="card" style="border-left: 5px solid #ff9800; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <b>${x.name}</b><br>
                <small>${Logic.formatDisplay(Logic.processWeight(x.weight))}</small>
            </div>
            <div>
                <button onclick="editHulling(${x.id})" class="btn-sm" style="background:#ff9800; width:auto; padding:5px 10px;">✏️</button>
            </div>
        </div>`;
    });
    const logContainer = document.getElementById('day_log');
    if (logContainer) logContainer.innerHTML = html || "No entries for this date.";
}

async function generateSummary() {
    const allStock = await db.stock.toArray();
    const inventory = {};
    
    allStock.forEach(item => {
        if (!inventory[item.type]) inventory[item.type] = 0;
        const w = Logic.processWeight(item.weight);
        if (item.action === 'Purchase' || item.action === 'Inward') {
            inventory[item.type] += w;
        } else {
            inventory[item.type] -= w;
        }
    });

    let html = "<table class='summary-table'><tr><th>Variety</th><th>Net Stock</th></tr>";
    Object.keys(inventory).forEach(key => {
        const val = inventory[key];
        const display = key.toLowerCase().includes("bag") ? `${val} Pcs` : Logic.formatDisplay(val);
        html += `<tr><td>${key}</td><td style="color:${val < 0 ? 'red':'green'}"><b>${display}</b></td></tr>`;
    });
    
    const summaryContainer = document.getElementById('summary_display');
    if (summaryContainer) summaryContainer.innerHTML = html + "</table>";
}
