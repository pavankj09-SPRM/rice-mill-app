/**
 * js/app.js - Final Verified Logic for Parshwanatha Rice Mill
 */

// --- 1. CORE REFRESH LOGIC ---
const refreshAll = async () => {
    try {
        await viewDayLog();
        await generateSummary();
    } catch (e) { console.error("Refresh Error:", e); }
};

// --- 2. TAB SWITCHER ---
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

    if (tabId === 'history-tab' || tabId === 'stock-tab') refreshAll();
};

// --- 3. INITIALIZATION ---
window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    const dp = document.getElementById('main_date_picker');
    if (dp) {
        dp.value = today;
        dp.onchange = refreshAll;
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    if (document.getElementById('btn_save_hulling')) document.getElementById('btn_save_hulling').onclick = saveHulling;
    if (document.getElementById('btn_save_stock')) document.getElementById('btn_save_stock').onclick = saveStock;

    switchTab('hulling-tab');
    refreshAll();
};

// --- 4. HULLING & STOCK LOGIC ---
async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weightVal = document.getElementById('h_weight').value;
    if (!name || !weightVal) return alert("Fill Name and Weight");

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

// --- 5. SETTINGS & DATA MANAGEMENT ---
function addNewVariety() {
    const name = document.getElementById('new_item_name').value.trim();
    const cat = document.getElementById('new_item_category').value;
    if (!name) return alert("Enter name");

    const select = document.getElementById('st_type');
    const opt = document.createElement("option");
    opt.text = `${name} (${cat})`;
    select.add(opt);

    document.getElementById('new_item_name').value = "";
    showToast(`${name} added!`);
}

async function exportData() {
    const hulling = await db.hulling.toArray();
    const stock = await db.stock.toArray();
    const blob = new Blob([JSON.stringify({hulling, stock})], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Mill_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await db.hulling.clear(); await db.stock.clear();
            await db.hulling.bulkAdd(data.hulling);
            await db.stock.bulkAdd(data.stock);
            alert("Restored!"); location.reload();
        } catch (err) { alert("Invalid File"); }
    };
    reader.readAsText(file);
}

// --- 6. UI HELPERS ---
async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const items = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    items.forEach(x => {
        html += `<div class="log-card">
            <div><b>${x.name}</b><br><small>${Logic.formatDisplay(Logic.processWeight(x.weight))}</small></div>
            <div class="log-actions">
                <span style="color:${x.status==='Paid'?'green':'red'}">${x.status}</span>
            </div>
        </div>`;
    });
    document.getElementById('day_log').innerHTML = html || "No records.";
}

async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = Logic.processWeight(i.weight);
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });
    let html = "<table class='summary-table'><tr><th>Variety</th><th>Stock</th></tr>";
    Object.keys(inv).forEach(k => {
        const val = inv[k];
        const disp = k.toLowerCase().includes("bag") ? `${val} Pcs` : Logic.formatDisplay(val);
        html += `<tr><td>${k}</td><td style="color:${val < 0 ? 'red':'green'}"><b>${disp}</b></td></tr>`;
    });
    document.getElementById('summary_display').innerHTML = html + "</table>";
}

function showToast(text) {
    const t = document.getElementById('toast');
    if (t) { t.innerText = text; t.className = "show"; setTimeout(() => t.className = "", 3000); }
}
