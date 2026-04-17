/**
 * js/app.js - Shri Parshwanatha Rice Mill (Enterprise Edition)
 */

// --- 1. CORE REFRESH LOGIC ---
const refreshAll = async () => {
    try {
        await viewDayLog();
        await generateSummary();
        // If you have dashboard logic, call it here:
        // if (typeof updateDashboard === "function") updateDashboard();
    } catch (e) { 
        console.error("Refresh Error:", e); 
    }
};

// --- 2. THE TAB SWITCHER ---
const switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = "none";
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    const nav = document.querySelector(`[data-tab="${tabId}"]`);

    if (target) {
        target.classList.add('active');
        target.style.display = "block";
    }
    if (nav) nav.classList.add('active');

    // Auto-refresh when entering data-heavy tabs
    if (['history-tab', 'stock-tab', 'dashboard-tab'].includes(tabId)) {
        refreshAll();
    }
};

// --- 3. INITIALIZATION ---
window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    const dp = document.getElementById('main_date_picker');
    if (dp) {
        dp.value = today;
        dp.onchange = refreshAll;
    }

    // Auto-calculate Hulling Total but keep it editable
    const weightInput = document.getElementById('h_weight');
    const rateInput = document.getElementById('h_rate');
    const totalInput = document.getElementById('h_total_input');
    
    const calcHulling = () => {
    // Only auto-calc if the user isn't actively typing in the total box
    if (document.activeElement !== totalInput) {
        const kg = Logic.processWeight(weightInput.value);
        const rate = parseFloat(rateInput.value) || 0;
        totalInput.value = Math.round((kg / 100) * rate);
        }
    };

    weightInput.addEventListener('input', calcHulling);
    rateInput.addEventListener('input', calcHulling);

    // Add this to your window.onload so it updates when you toggle Purchase/Sale
    document.getElementById('st_action').onchange = loadDropdowns;
    
    // Navigation Binding
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // Button Bindings
    const bindClick = (id, func) => {
        const el = document.getElementById(id);
        if (el) el.onclick = func;
    };

    bindClick('btn_save_hulling', saveHulling);
    bindClick('btn_save_stock', saveStock);
    bindClick('btn_backup', exportData);
    
    // Restore Trigger
    const restoreBtn = document.getElementById('btn_restore_trigger');
    const fileInput = document.getElementById('import_file');
    if (restoreBtn && fileInput) {
        restoreBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => importData(e);
    }

    // Add Variety Binding
    bindClick('btn_add_variety', addNewVariety);
    
    // Default Startup
    switchTab('hulling-tab');
    refreshAll();
};

// --- 4. DATA LOGIC ---
async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weightVal = document.getElementById('h_weight').value;
    if (!name || !weightVal) return alert("Please fill Name and Weight");

    const kg = Logic.processWeight(weightVal);
    const rate = document.getElementById('h_rate').value || 150;

    await db.hulling.add({
        name, weight: weightVal, rate,
        total: Math.round((kg / 100) * rate),
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });

    showToast("Hulling Saved!");
    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    refreshAll();
}

async function saveStock() {
    const weightVal = document.getElementById('st_weight').value;
    if (!weightVal) return alert("Enter weight");

    await db.stock.add({
        name: document.getElementById('st_name').value.trim() || "Self",
        action: document.getElementById('st_action').value,
        type: document.getElementById('st_type').value,
        weight: weightVal,
        date: document.getElementById('main_date_picker').value
    });

    showToast("Stock Updated!");
    document.getElementById('st_weight').value = "";
    refreshAll();
}

// --- 5. SETTINGS & VARIETIES ---
// Save a new variety to the database
async function addNewVariety() {
    const name = document.getElementById('new_item_val').value.trim();
    const category = document.getElementById('new_item_cat').value; // paddy, rice, or misc
    
    if (!name) return alert("Enter variety name");

    await db.settings.put({ name, category });
    document.getElementById('new_item_val').value = "";
    showToast(`${name} saved!`);
    loadDropdowns(); // Refresh the dropdowns immediately
}

// Populate the Stock Dropdown with smart filtering
async function loadDropdowns() {
    const action = document.getElementById('st_action').value; // Purchase, Sale, etc.
    const allSettings = await db.settings.toArray();
    const stockSelect = document.getElementById('st_type');
    const settingsList = document.getElementById('settings_grid'); // For the Settings Tab list
    
    stockSelect.innerHTML = ""; 
    if (settingsList) settingsList.innerHTML = ""; // Clear the list in Settings tab

    allSettings.forEach(item => {
        // 1. Update the list visibility in the SETTINGS TAB
        if (settingsList) {
            settingsList.innerHTML += `
                <div class="item-row">
                    <span>${item.name} (${item.category})</span>
                    <button class="btn-sm" style="background:red" onclick="deleteVariety('${item.name}')">Delete</button>
                </div>`;
        }

        // 2. Filter the STOCK dropdown based on Action
        if (action === "Purchase" && item.category === "paddy") {
            ["New-White", "Old-White", "New-Red", "Old-Red"].forEach(t => {
                stockSelect.add(new Option(`🌾 ${item.name} - ${t}`, `${item.name} (${t})`));
            });
        } 
        else if (action === "Sale" && item.category === "rice") {
            stockSelect.add(new Option(`🍚 ${item.name}`, item.name));
        }
        else if (item.category === "misc") {
            stockSelect.add(new Option(`📦 ${item.name}`, item.name));
        }
    });
}



// --- 6. BACKUP & RESTORE ---
async function exportData() {
    const hulling = await db.hulling.toArray();
    const stock = await db.stock.toArray();
    const blob = new Blob([JSON.stringify({hulling, stock})], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Mill_Backup_${new Date().toLocaleDateString()}.json`;
    link.click();
    showToast("Backup Created!");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm("Restore this backup? Current data will be replaced.")) {
                await db.hulling.clear();
                await db.stock.clear();
                await db.hulling.bulkAdd(data.hulling);
                await db.stock.bulkAdd(data.stock);
                alert("Restore Successful!");
                location.reload();
            }
        } catch (err) {
            alert("Error: Invalid backup file format.");
        }
    };
    reader.readAsText(file);
}

// --- 7. UI HELPERS ---
async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const items = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    items.forEach(x => {
        html += `<div class="log-card" style="border-left: 5px solid orange; display:flex; justify-content:space-between; margin-bottom:8px; padding:10px; background:#fff; border-radius:8px;">
            <div><b>${x.name}</b><br><small>${x.weight} Q</small></div>
            <span style="color:${x.status==='Paid'?'green':'red'}">${x.status}</span>
        </div>`;
    });
    const log = document.getElementById('day_log');
    if (log) log.innerHTML = html || "No records.";
}

async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = Logic.processWeight(i.weight);
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });
    let html = "<table class='summary-table' style='width:100%'><tr><th>Variety</th><th>Net Stock</th></tr>";
    Object.keys(inv).forEach(k => {
        html += `<tr><td>${k}</td><td><b>${inv[k].toFixed(2)} Q</b></td></tr>`;
    });
    const display = document.getElementById('summary_display');
    if (display) display.innerHTML = html + "</table>";
}

function showToast(text) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = text;
        t.className = "show";
        setTimeout(() => t.className = "", 3000);
    }
}
