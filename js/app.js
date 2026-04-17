/**
 * js/app.js - Full Integrated Logic for Parshwanatha Rice Mill
 */

// --- 1. CORE REFRESH LOGIC ---
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
    console.log("Switching to:", tabId);

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = "none";
    });

    // Reset all navigation buttons
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show the selected tab
    const target = document.getElementById(tabId);
    const nav = document.querySelector(`[data-tab="${tabId}"]`);

    if (target) {
        target.classList.add('active');
        target.style.display = "block";
    } else {
        console.error("Could not find a <div> with id:", tabId);
    }

    if (nav) nav.classList.add('active');

    // Refresh data when opening history or stock
    if (tabId === 'history-tab' || tabId === 'stock-tab') {
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
        btn.onclick = () => {
            const idFromHtml = btn.getAttribute('data-tab');
            switchTab(idFromHtml);
        };
    });

    // Bind Save Buttons
    const hBtn = document.getElementById('btn_save_hulling');
    if (hBtn) hBtn.onclick = saveHulling;

    const sBtn = document.getElementById('btn_save_stock');
    if (sBtn) sBtn.onclick = saveStock;

    // Default startup tab
    switchTab('hulling-tab');
    refreshAll();
};

// --- 4. HULLING & STOCK LOGIC ---

async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weightVal = document.getElementById('h_weight').value;
    const date = document.getElementById('main_date_picker').value;

    if (!name || !weightVal) return alert("Please fill Name and Weight");

    const kg = Logic.processWeight(weightVal);
    const rate = document.getElementById('h_rate').value || 150;

    await db.hulling.add({
        name, 
        weight: weightVal, 
        rate,
        total: Math.round((kg / 100) * rate),
        status: document.getElementById('h_status').value,
        date: date
    });

    showToast("Hulling Saved!");
    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    refreshAll();
}

async function saveStock() {
    const name = document.getElementById('st_name').value.trim();
    const weightVal = document.getElementById('st_weight').value;
    const type = document.getElementById('st_type').value;
    const action = document.getElementById('st_action').value;
    const date = document.getElementById('main_date_picker').value;

    if (!weightVal) return alert("Enter weight");

    // Manual Entry only - No auto-calculation
    await db.stock.add({
        name: name || "Self", 
        action: action, 
        type: type, 
        weight: weightVal, 
        date: date
    });

    showToast("Stock Updated!");
    
    // Clear inputs
    document.getElementById('st_weight').value = "";
    document.getElementById('st_name').value = "";
    
    refreshAll();
}

// --- 5. UI DISPLAY ---

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const items = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    
    items.forEach(x => {
        html += `<div class="card" style="border-left:5px solid #ff9800; display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
            <div>
                <b>${x.name}</b><br>
                <small>${Logic.formatDisplay(Logic.processWeight(x.weight))}</small>
            </div>
            <span style="color:${x.status==='Paid'?'green':'red'}; font-weight:bold;">${x.status}</span>
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

    let html = "<table class='summary-table' style='width:100%; border-collapse:collapse;'><tr><th style='text-align:left;'>Variety</th><th style='text-align:right;'>Net Stock</th></tr>";
    
    Object.keys(inv).forEach(k => {
        const val = inv[k];
        const isBag = k.toLowerCase().includes("bag");
        const display = isBag ? `${val} Pcs` : Logic.formatDisplay(val);
        
        html += `<tr style="border-bottom:1px solid #eee; height:40px;">
            <td>${k}</td>
            <td style="text-align:right; color:${val < 0 ? 'red':'green'}"><b>${display}</b></td>
        </tr>`;
    });
    
    const display = document.getElementById('summary_display');
    if (display) display.innerHTML = html + "</table>";
}

function showToast(text) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = text;
        t.className = "show";
        setTimeout(() => t.className = t.className.replace("show", ""), 3000);
    }
}
