/** * PARSHWANATHA RICE MILL - STABLE CORE 
 */

// 1. DEFINE FUNCTIONS FIRST (So they are ready before window.onload)
const refreshAll = async () => {
    console.log("Refreshing UI...");
    if (typeof viewDayLog === "function") await viewDayLog();
    if (typeof generateSummary === "function") await generateSummary();
};

const switchTab = (tabId) => {
    console.log("Attempting to show:", tabId);

    // 1. Hide all tab content sections
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = "none"; // Safety force hide
    });

    // 2. Remove 'active' styling from all navigation items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // 3. Show the target content (Exactly matching the ID in your HTML)
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = "block"; // Safety force show
    } else {
        console.error("Could not find a <div> with id:", tabId);
    }

    // 4. Highlight the clicked navigation item
    const targetNav = document.querySelector(`[data-tab="${tabId}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // 5. Refresh data if switching to data tabs
    // Note: Use the IDs exactly as they appear in your HTML
    if (tabId === 'history-tab' || tabId === 'stock-tab') {
        refreshAll();
    }
};

// Re-bind your nav items to use the new logic
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    };
});

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
