/** * PARSHWANATHA RICE MILL - STABLE CORE 
 */

// 1. DEFINE FUNCTIONS FIRST (So they are ready before window.onload)
const refreshAll = async () => {
    console.log("Refreshing UI...");
    if (typeof viewDayLog === "function") await viewDayLog();
    if (typeof generateSummary === "function") await generateSummary();
};

const switchTab = (tabName) => {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show selected (Matches your "hulling-tab" structure)
    const target = document.getElementById(tabName + "-tab");
    const nav = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (target) target.classList.add('active');
    if (nav) nav.classList.add('active');

    if (tabName === 'history' || tabName === 'summary') refreshAll();
};

// 2. INITIALIZATION
window.onload = () => {
    // Set Date
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.value = new Date().toISOString().split('T')[0];
        datePicker.onchange = refreshAll;
    }

    // Bind Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // Bind Save Button
    const saveBtn = document.getElementById('btn_save_hulling');
    if (saveBtn) saveBtn.onclick = saveHulling;

    // Start App
    switchTab('hulling');
    refreshAll();
};

// 3. CORE LOGIC FUNCTIONS
async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weight = document.getElementById('h_weight').value;
    if (!name || !weight) return alert("Enter Name and Weight");

    const kg = Logic.processWeight(weight);
    const rate = document.getElementById('h_rate').value || 150;

    await db.hulling.add({
        name,
        weight,
        rate,
        total: Math.round((kg / 100) * rate),
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });

    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    alert("Saved Successfully!");
    refreshAll();
}

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const data = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    data.forEach(x => {
        html += `<div class="card" style="border-left:5px solid #ff9800; display:flex; justify-content:space-between; margin-bottom:10px;">
            <div><b>${x.name}</b><br><small>${Logic.formatDisplay(Logic.processWeight(x.weight))}</small></div>
            <button onclick="editHulling(${x.id})" style="background:#ff9800; color:white; border:none; padding:5px; border-radius:4px;">✏️</button>
        </div>`;
    });
    const container = document.getElementById('day_log');
    if (container) container.innerHTML = html || "No entries today.";
}

async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = Logic.processWeight(i.weight);
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });

    let html = "<table style='width:100%; border-collapse:collapse;'><tr><th>Item</th><th>Stock</th></tr>";
    Object.keys(inv).forEach(k => {
        const val = inv[k];
        const display = k.toLowerCase().includes("bag") ? `${val} Pcs` : Logic.formatDisplay(val);
        html += `<tr style="border-bottom:1px solid #eee; height:40px;"><td>${k}</td><td style="color:${val < 0 ? 'red':'green'}"><b>${display}</b></td></tr>`;
    });
    const container = document.getElementById('summary_display');
    if (container) container.innerHTML = html + "</table>";
}
