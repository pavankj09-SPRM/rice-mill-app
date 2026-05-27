/**
 * js/app.js - Operations Application Engine
 */

// Establish local working date footprint on startup sequence execution
document.addEventListener("DOMContentLoaded", () => {
    const picker = document.getElementById('main_date_picker');
    if (picker && !picker.value) {
        const today = new Date().toISOString().split('T')[0];
        picker.value = today;
    }
    window.refreshAll();
});

// Navigation Tab Routing Controller Engine Block 
function switchTab(tabId, element) {
    // Hide all view panels
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    // Activate requested module target view container 
    document.getElementById(tabId).style.display = 'block';
    
    // Clear out navigation highlight active states
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Anchor marker feedback into active clicked element
    element.classList.add('active');
}

// Dynamic Form Field Visibility Engine for Transport Logic
function toggleLogisticsPaddyFields() {
    const vType = document.getElementById('v_type').value;
    const paddyContainer = document.getElementById('v_paddy_type_container');
    if (paddyContainer) {
        if (vType.includes("Paddy Load")) {
            paddyContainer.style.display = "block";
        } else {
            paddyContainer.style.display = "none";
            document.getElementById('v_paddy_size').value = "N/A";
        }
    }
}

// Master Automation Sync Pipelines Refreshes
window.refreshAll = async () => {
    try {
        await viewDayLog();
        await refreshLogisticsList();
        await generateSummary();
        await refreshSettingsList();
        toggleLogisticsPaddyFields();
    } catch (e) {
        console.error("Pipeline Core Sync Refresh Failure Node:", e);
    }
};

/* --- CALCULATOR LOGIC ENGINES --- */
function calculateHullingTotal() {
    const w = parseFloat(document.getElementById('h_weight').value) || 0;
    const r = parseFloat(document.getElementById('h_rate').value) || 0;
    document.getElementById('h_total').value = (w * r).toFixed(2);
}

// Fixed minor typing reference block
function calculateBillingTotal() {
    const q = parseFloat(document.getElementById('b_qty').value) || 0;
    const r = parseFloat(document.getElementById('b_rate').value) || 0;
    document.getElementById('b_total').value = (q * r).toFixed(2);
}

/* --- STORAGE COMMIT ACTIONS DATA-LAYERS --- */
async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const w = parseFloat(document.getElementById('h_weight').value) || 0;
    const r = parseFloat(document.getElementById('h_rate').value) || 0;
    const tot = w * r;
    const date = document.getElementById('main_date_picker').value;

    if (!name) return alert("Please specify customer identity batch tag account.");

    await db.hulling.add({ name, weight: w, rate: r, total: tot, status: "Pending", date });
    showToast("Hulling Transaction Batch Recorded Successfully.");
    
    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    document.getElementById('h_rate').value = "";
    document.getElementById('h_total').value = "0.00";
    window.refreshAll();
}

async function saveStock() {
    const type = document.getElementById('s_item_type').value;
    const action = document.getElementById('s_action').value;
    const pSize = document.getElementById('s_paddy_size').value;
    const bags = parseInt(document.getElementById('s_bags').value) || 0;
    const bWeight = parseFloat(document.getElementById('s_bag_weight').value) || 0;
    const date = document.getElementById('main_date_picker').value;

    await db.stock.add({ name: type, action, type, paddySize: pSize, weight: (bags * bWeight)/100, bags, bagWeight: bWeight, rate:0, amount:0, date });
    showToast("Inventory Adjustment Committed.");
    
    document.getElementById('s_bags').value = "";
    document.getElementById('s_bag_weight').value = "";
    window.refreshAll();
}

async function saveBill() {
    const cust = document.getElementById('b_customer').value.trim();
    const prod = document.getElementById('b_product').value;
    const qty = parseFloat(document.getElementById('b_qty').value) || 0;
    const rate = parseFloat(document.getElementById('b_rate').value) || 0;
    const date = document.getElementById('main_date_picker').value;

    if (!cust) return alert("Customer buyer registry context label identity missing.");

    await db.stock.add({ name: prod, action: "Remove", type: "Rice", paddySize: "N/A", weight: qty, bags: 0, bagWeight: 0, rate: rate, amount: (qty * rate), date });
    showToast("Invoice Entry Successfully Billed!");

    document.getElementById('b_customer').value = "";
    document.getElementById('b_qty').value = "";
    document.getElementById('b_rate').value = "";
    document.getElementById('b_total').value = "0.00";
    window.refreshAll();
}

async function saveLogistics() {
    const vType = document.getElementById('v_type').value;
    const vNo = document.getElementById('v_no').value.trim();
    const vParty = document.getElementById('v_party').value.trim();
    const vDriver = document.getElementById('v_driver').value.trim();
    const vPaddySize = document.getElementById('v_paddy_size').value;
    const vBags = parseInt(document.getElementById('v_bags').value) || 0;
    const vWeight = parseFloat(document.getElementById('v_net_weight').value) || 0;
    const vNotes = document.getElementById('v_notes').value.trim();

    if (!vNo) return alert("Please enter the vehicle freight registration plate number.");
    if (!vParty) return alert("Please fill out Vendor/Party configuration column.");

    await db.logistics.add({
        vehicleType: vType, vehicleNo: vNo.toUpperCase(), partyName: vParty,
        driverName: vDriver || 'N/A', paddySize: vPaddySize, bags: vBags, netWeight: vWeight, notes: vNotes,
        date: document.getElementById('main_date_picker').value
    });

    showToast("Vehicle Registry Logged Cleanly!");
    document.getElementById('v_no').value = "";
    document.getElementById('v_party').value = "";
    document.getElementById('v_driver').value = "";
    document.getElementById('v_bags').value = "";
    document.getElementById('v_net_weight').value = "";
    document.getElementById('v_notes').value = "";
    window.refreshAll();
}

async function deleteLogistics(id) {
    if(confirm("Delete this transport log permanently?")) {
        await db.logistics.delete(id);
        window.refreshAll();
    }
}

async function saveSetting() {
    const cat = document.getElementById('cfg_category').value;
    const name = document.getElementById('cfg_name').value.trim();
    const full = document.getElementById('cfg_full_name').value.trim();

    if(!name) return alert("Short identification key entry necessary.");
    await db.settings.add({ category: cat, name, fullName: full });
    showToast("Entity Account Saved.");
    document.getElementById('cfg_name').value = "";
    document.getElementById('cfg_full_name').value = "";
    window.refreshAll();
}

/* --- OUTPUT RENDERING ARCHITECTURE SYSTEMS --- */
async function refreshLogisticsList() {
    const container = document.getElementById('logistics_list');
    if (!container) return;
    const activeDate = document.getElementById('main_date_picker').value;
    const list = await db.logistics.where('date').equals(activeDate).toArray();

    let html = "";
    list.forEach(v => {
        const isPaddy = v.vehicleType.includes("Paddy Load");
        html += `
        <div style="padding:15px; border-bottom:1px solid #eee; background:#fff; margin-bottom:12px; border-left:5px solid #00796b; border-radius:6px;">
            <div style="float:right;">
                <span style="background:#e0f2f1; color:#004d40; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">${v.vehicleType}</span>
                <button onclick="deleteLogistics(${v.id})" style="background:#ffcdd2; color:#b71c1c; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; margin-top:8px; display:block; width:auto;">Delete</button>
            </div>
            <b style="font-size:15px;">${v.vehicleNo}</b><br>
            <div style="margin-top:5px; font-size:13px; color:#546e7a;">
                🏢 Vendor/Party: <b>${v.partyName}</b> | 🧑 Driver: <b>${v.driverName}</b><br>
                📦 Load Vol: <b>${v.bags} Bags</b> | ⚖️ Net Weight: <b>${v.netWeight} Qtl</b>
                ${isPaddy ? `<br>🌾 Variety Size: <b style="color:#4a148c;">${v.paddySize}</b>` : ''}
            </div>
            ${v.notes ? `<div style="margin-top:6px; font-size:12px; color:#78909c; background:#f5f7f8; padding:4px;">📝 ${v.notes}</div>` : ''}
            <div style="clear:both;"></div>
        </div>`;
    });
    container.innerHTML = html || "No vehicle entries logged for this date.";
}

async function refreshSettingsList() {
    const container = document.getElementById('settings_list');
    if (!container) return;
    const array = await db.settings.toArray();
    let html = "";
    array.forEach(item => {
        html += `<div style='padding:10px; border-bottom:1px solid #eee; font-size:13px;'>💼 [${item.category}] <b>${item.name}</b> - <i>${item.fullName || 'No details'}</i></div>`;
    });
    container.innerHTML = html || "No custom profile entities mapped yet.";
}

// Master History Engine loop feeding both Dashboard and History Tabs concurrently
async function viewDayLog() {
    const mainDashboardContainer = document.getElementById('day_log_summary');
    const dedicatedHistoryContainer = document.getElementById('history_day_log_feed');
    
    const targetDate = document.getElementById('main_date_picker').value;
    const hullList = await db.hulling.where('date').equals(targetDate).toArray();
    const stockList = await db.stock.where('date').equals(targetDate).toArray();
    const logiList = await db.logistics.where('date').equals(targetDate).toArray();
    
    let html = "";
    
    hullList.forEach(h => {
        html += `<div style="padding:12px; border-bottom:1px solid #eee; font-size:13px; background:#fff; margin-bottom:6px; border-left:3px solid var(--primary-color);">⚙️ <b>Hulling Run:</b> Customer <b>${h.name}</b> processed ${h.weight} Qtl (₹${h.total})</div>`;
    });
    
    stockList.forEach(s => {
        html += `<div style="padding:12px; border-bottom:1px solid #eee; font-size:13px; background:#fff; margin-bottom:6px; border-left:3px solid var(--success-color);">📦 <b>Stock Shift:</b> ${s.action} ${s.type} - ${s.bags} Bags (${s.paddySize})</div>`;
    });

    logiList.forEach(l => {
        html += `<div style="padding:12px; border-bottom:1px solid #eee; font-size:13px; background:#fff; margin-bottom:6px; border-left:3px solid #00796b;">🚛 <b>Logistics entry:</b> ${l.vehicleNo} | ${l.vehicleType} (${l.bags} Bags)</div>`;
    });
    
    const finalHtml = html || "<div style='color:#546e7a; padding:10px; font-size:13px;'>No mill operations or entries recorded on this calendar date frame.</div>";
    
    if (mainDashboardContainer) mainDashboardContainer.innerHTML = finalHtml;
    if (dedicatedHistoryContainer) dedicatedHistoryContainer.innerHTML = finalHtml;
}

async function generateSummary() {
    const targetDate = document.getElementById('main_date_picker').value;
    const hullingData = await db.hulling.where('date').equals(targetDate).toArray();
    const stockData = await db.stock.toArray();

    // Today's Hulling Math
    let totalHullingWt = 0;
    hullingData.forEach(h => totalHullingWt += h.weight);
    document.getElementById('dash_hulling_summary').innerText = `${totalHullingWt.toFixed(2)} Quintals processed`;

    // Global Accumulative Stock Math Engine
    let paddyBags = 0;
    let riceBags = 0;

    stockData.forEach(s => {
        if (s.type === "Paddy") {
            paddyBags += (s.action === "Add") ? s.bags : -s.bags;
        } else if (s.type === "Rice") {
            riceBags += (s.action === "Add") ? s.bags : -s.bags;
        }
    });

    document.getElementById('dash_rice_stock').innerText = `${riceBags} Bags`;
    document.getElementById('dash_paddy_stock').innerText = `${paddyBags} Bags`;
}

/* --- TOAST DISPLAY BANNER ACTION EFFECT --- */
function showToast(msg) {
    const el = document.getElementById("toast");
    el.innerText = msg;
    el.classList.add("show");
    setTimeout(() => { el.classList.remove("show"); }, 2800);
}
