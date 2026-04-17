/**
 * js/app.js - Unified Enterprise Logic
 */

// --- 1. CORE REFRESH LOGIC ---
// Ensure this is only declared ONCE
const refreshAll = async () => {
    try {
        await viewDayLog();
        await generateSummary();
    } catch (e) { 
        console.error("Refresh Error:", e); 
    }
};

// --- 2. THE TAB SWITCHER ---
const switchTab = (tabId) => {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = "none";
    });
    // Deactivate all nav buttons
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    const nav = document.querySelector(`[data-tab="${tabId}"]`);

    if (target) {
        target.classList.add('active');
        target.style.display = "block";
    }
    if (nav) nav.classList.add('active');

    // Only refresh data on specific tabs to save memory
    if (tabId === 'history-tab' || tabId === 'stock-tab' || tabId === 'dashboard-tab') {
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

    // Bind Navigation Clicks
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // Bind Save Buttons (Matching your HTML IDs)
    if (document.getElementById('btn_save_hulling')) 
        document.getElementById('btn_save_hulling').onclick = saveHulling;
    
    if (document.getElementById('btn_save_stock')) 
        document.getElementById('btn_save_stock').onclick = saveStock;

    // Bind Backup/Restore Buttons
    if (document.getElementById('btn_backup')) 
        document.getElementById('btn_backup').onclick = exportData;
    
    if (document.getElementById('btn_restore_trigger')) {
        document.getElementById('btn_restore_trigger').onclick = () => {
            document.getElementById('import_file').click();
        };
    }

    // Default startup
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

// --- 5. BACKUP & RESTORE (MATCHING YOUR HTML) ---
async function exportData() {
    try {
        const hulling = await db.hulling.toArray();
        const stock = await db.stock.toArray();
        const backupData = JSON.stringify({ hulling, stock });
        
        const blob = new Blob([backupData], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Mill_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showToast("Backup Created!");
    } catch (err) {
        alert("Export Failed: " + err);
    }
}

// This function handles the actual file import
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.hulling || !data.stock) throw new Error("Invalid file format");

            // Confirmation before wiping data
            if (confirm("This will replace your current data with the backup. Continue?")) {
                await db.hulling.clear();
                await db.stock.clear();
                await db.hulling.bulkAdd(data.hulling);
                await db.stock.bulkAdd(data.stock);
                alert("Restore Successful!");
                location.reload();
            }
        } catch (err) {
            alert("Restore Failed: Make sure it's a valid .json backup file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// Add event listener for the file input itself
if (document.getElementById('import_file')) {
    document.getElementById('import_file').onchange = (e) => importData(e);
}

// --- 6. UI HELPERS ---
async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const items = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    items.forEach(x => {
        html += `<div class="card" style="border-left:5px solid orange; display:flex; justify-content:space-between; margin-bottom:10px;">
            <div><b>${x.name}</b><br><small>${x.weight} Q</small></div>
            <span style="color:${x.status==='Paid'?'green':'red'}">${x.status}</span>
        </div>`;
    });
    const log = document.getElementById('day_log');
    if (log) log.innerHTML = html || "No records for today.";
}

async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = Logic.processWeight(i.weight);
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });
    let html = "<table class='summary-table'><tr><th>Variety</th><th>Net Stock</th></tr>";
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
