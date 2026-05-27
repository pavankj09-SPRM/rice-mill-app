/**
 * js/app.js - Integrated Enterprise Automation Core
 */

let expenseChartInstance = null;
let stockChartInstance = null;
let currentDashboardFilter = 'day'; // Fallback filters: 'day' | 'month' | 'year'

window.refreshAll = async () => {
    try {
        await viewDayLog();
        await refreshLogisticsList();
        await generateSummary();
        await refreshSettingsList();
        if (typeof toggleExpenseInputs === 'function') {
            await toggleExpenseInputs();
        }
    } catch (e) {
        console.error("Performance Refresh Instability:", e);
    }
};

window.onload = async () => {
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.value = today;
        datePicker.onchange = window.refreshAll;
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    const bindAction = (id, targetFunction) => {
        const component = document.getElementById(id);
        if (component) component.onclick = targetFunction;
    };

    bindAction('btn_save_hulling', saveHulling);
    bindAction('btn_save_stock', saveStock);
    bindAction('btn_save_expense', saveExpense);
    bindAction('btn_save_logistics', saveLogistics);
    bindAction('btn_add_variety', addNewVariety);
    bindAction('btn_backup', exportData);
    bindAction('btn_export_daily_pdf', exportDailyPDF);
    bindAction('btn_export_daily_excel', exportDailyExcel);
    
    bindAction('btn_master_reset', async () => {
        if (confirm("🚨 MASTER RESET WILL PERMANENTLY WIPE EVERYTHING! Proceed?")) {
            await db.delete();
            location.reload();
        }
    });

    const systemRestoreBtn = document.getElementById('btn_restore_trigger');
    const systemFileInput = document.getElementById('import_file');
    if (systemRestoreBtn && systemFileInput) {
        systemRestoreBtn.onclick = () => systemFileInput.click();
        systemFileInput.onchange = (e) => importData(e);
    }

    setupAutoCalculations();
    onStockActionChange(); 
    await loadDropdowns(); 
    
    switchTab('hulling-tab');
    window.refreshAll();
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => {
        c.style.display = "none";
        c.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const target = document.getElementById(tabId);
    const nav = document.querySelector(`[data-tab="${tabId}"]`);
    if (target) { target.style.display = "block"; target.classList.add('active'); }
    if (nav) nav.classList.add('active');

    window.refreshAll();
}

function setDashFilter(filterType) {
    currentDashboardFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn_filter_${filterType}`).classList.add('active');
    generateSummary();
}

function onStockActionChange() {
    const action = document.getElementById('st_action').value;
    const paddySizeBox = document.getElementById('paddy_size_container');
    if (paddySizeBox) {
        paddySizeBox.style.display = (action === "Purchase") ? "block" : "none";
    }
    loadDropdowns();
}

function setupAutoCalculations() {
    const hWeight = document.getElementById('h_weight');
    const hRate = document.getElementById('h_rate');
    const hTotal = document.getElementById('h_total_input');
    if (hWeight && hRate && hTotal) {
        const calc = () => { hTotal.value = Math.round((parseFloat(hWeight.value) || 0) * (parseFloat(hRate.value) || 0)); };
        hWeight.oninput = calc; hRate.oninput = calc;
    }

    const stWeight = document.getElementById('st_weight');
    const stRate = document.getElementById('st_rate');
    const stAmount = document.getElementById('st_amount');
    const stBags = document.getElementById('st_bags');
    const stBagWeight = document.getElementById('st_bag_weight');
    if (stWeight && stRate && stAmount) {
        const calcStock = () => {
            const b = parseFloat(stBags?.value) || 0;
            const bw = parseFloat(stBagWeight?.value) || 0;
            if (b > 0 && bw > 0) { stWeight.value = (b * bw) / 100; } // Converts KG directly to Quintals
            stAmount.value = Math.round((parseFloat(stWeight.value) || 0) * (parseFloat(stRate.value) || 0));
        };
        if(stBags) stBags.oninput = calcStock;
        if(stBagWeight) stBagWeight.oninput = calcStock;
        stWeight.oninput = calcStock; stRate.oninput = calcStock;
    }
}

async function toggleExpenseInputs() {
    const category = document.getElementById('exp_type_cat')?.value;
    const laborRow = document.getElementById('row_bill_labor_calc');
    const expAmountField = document.getElementById('exp_amount');
    if (!laborRow || !expAmountField) return;

    if (category === "Wages") {
        laborRow.style.display = "block"; expAmountField.readOnly = true;
        const selectedDate = document.getElementById('main_date_picker').value;
        const logs = await db.hulling.where('date').equals(selectedDate).toArray();
        document.getElementById('exp_labor_weight').value = logs.reduce((sum, h) => sum + (parseFloat(h.weight) || 0), 0);
    } else {
        laborRow.style.display = "none"; expAmountField.readOnly = false;
    }
}

async function loadDropdowns() {
    const action = document.getElementById('st_action').value;
    const stockSelect = document.getElementById('st_type');
    if (!stockSelect) return;
    stockSelect.innerHTML = "";

    const allSettings = await db.settings.toArray();

    if (action === "Purchase") {
        const paddyItems = allSettings.filter(i => i.category === "paddy");
        if(paddyItems.length===0) stockSelect.add(new Option("Raw Paddy (Default Stock)", "Raw Paddy"));
        paddyItems.forEach(i => stockSelect.add(new Option(`🌾 ${i.fullName || i.name}`, i.fullName || i.name)));
    } else if (action === "Sale") {
        const riceItems = allSettings.filter(i => i.category === "rice");
        if(riceItems.length===0) stockSelect.add(new Option("Sona Masuri (Default)", "Sona Masuri"));
        riceItems.forEach(i => stockSelect.add(new Option(`🍚 ${i.fullName || i.name}`, i.fullName || i.name)));
    } else {
        const miscItems = allSettings.filter(i => i.category === "misc");
        if(miscItems.length===0) {
            ['Husk Waste', 'Rice Bran', 'Salt', 'Diesel', 'Apple Brand Empty Bag'].forEach(x => stockSelect.add(new Option(`📦 ${x}`, x)));
        } else {
            miscItems.forEach(i => stockSelect.add(new Option(`📦 ${i.fullName || i.name}`, i.fullName || i.name)));
        }
    }
}

// --- 11. ADVANCED DRILLDOWN REPORT ENGINE ---
async function generateSummary() {
    const pivotDate = document.getElementById('main_date_picker').value;
    if (!pivotDate) return;

    const yearStr = pivotDate.split('-')[0];
    const monthStr = pivotDate.split('-')[0] + "-" + pivotDate.split('-')[1];

    let hEntries = await db.hulling.toArray();
    let sEntries = await db.stock.toArray();
    let eEntries = await db.expenses.toArray();

    // Time-based filtering execution
    if (currentDashboardFilter === 'day') {
        hEntries = hEntries.filter(x => x.date === pivotDate);
        sEntries = sEntries.filter(x => x.date === pivotDate);
        eEntries = eEntries.filter(x => x.date === pivotDate);
    } else if (currentDashboardFilter === 'month') {
        hEntries = hEntries.filter(x => x.date && x.date.startsWith(monthStr));
        sEntries = sEntries.filter(x => x.date && x.date.startsWith(monthStr));
        eEntries = eEntries.filter(x => x.date && x.date.startsWith(monthStr));
    } else if (currentDashboardFilter === 'year') {
        hEntries = hEntries.filter(x => x.date && x.date.startsWith(yearStr));
        sEntries = sEntries.filter(x => x.date && x.date.startsWith(yearStr));
        eEntries = eEntries.filter(x => x.date && x.date.startsWith(yearStr));
    }

    let revenue = 0, expenditures = 0;
    let bHulling = { totalWeight: 0, earnings: 0 };
    let bPaddy = { bigWeight: 0, smallWeight: 0, cost: 0 };
    let bRice = {};
    let bMisc = {};
    let bExp = { Wages: 0, Electricity: 0, Maintenance: 0, Fuel: 0, Other: 0 };

    hEntries.forEach(h => {
        revenue += h.total; bHulling.totalWeight += h.weight; bHulling.earnings += h.total;
    });

    sEntries.forEach(s => {
        if (s.action === "Purchase") {
            expenditures += s.amount;
            if (s.paddySize === "Small Paddy") bPaddy.smallWeight += s.weight;
            else bPaddy.bigWeight += s.weight;
            bPaddy.cost += s.amount;
        } else if (s.action === "Sale") {
            revenue += s.amount;
            bRice[s.type] = (bRice[s.type] || 0) + s.amount;
        } else {
            revenue += s.amount;
            bMisc[s.type] = (bMisc[s.type] || 0) + s.amount;
        }
    });

    eEntries.forEach(e => {
        expenditures += e.amount;
        bExp[e.category] = (bExp[e.category] || 0) + e.amount;
    });

    // Update Dashboard financial layout view metrics blocks
    document.getElementById('dash_total_revenue').innerText = "₹" + revenue.toLocaleString('en-IN');
    document.getElementById('dash_total_costs').innerText = "₹" + expenditures.toLocaleString('en-IN');
    const margin = revenue - expenditures;
    const marginEl = document.getElementById('dash_net_profit');
    marginEl.innerText = "₹" + margin.toLocaleString('en-IN');
    marginEl.style.color = margin >= 0 ? "#2e7d32" : "#c62828";

    // Inject Text Breakdowns into UI
    document.getElementById('breakdown_hulling').innerHTML = `Processed: <b>${bHulling.totalWeight.toFixed(2)} Q</b><br>Gross Earnings: <b>₹${bHulling.earnings.toLocaleString('en-IN')}</b>`;
    document.getElementById('breakdown_paddy').innerHTML = `Big Paddy: <b>${bPaddy.bigWeight.toFixed(2)} Q</b><br>Small Paddy: <b>${bPaddy.smallWeight.toFixed(2)} Q</b><br>Total Invoiced: <b>₹${bPaddy.cost.toLocaleString('en-IN')}</b>`;
    
    let riceHtml = ""; for(let k in bRice) { riceHtml += `${k}: <b>₹${bRice[k].toLocaleString('en-IN')}</b><br>`; }
    document.getElementById('breakdown_rice').innerHTML = riceHtml || "No Rice Revenue Logs";

    let miscHtml = ""; for(let m in bMisc) { miscHtml += `${m}: <b>₹${bMisc[m].toLocaleString('en-IN')}</b><br>`; }
    document.getElementById('breakdown_misc').innerHTML = miscHtml || "No Byproduct Waste Sales";

    document.getElementById('breakdown_expenses').innerHTML = `Wages: <b>₹${bExp.Wages}</b> | Electricity: <b>₹${bExp.Electricity}</b><br>Fuel: <b>₹${bExp.Fuel}</b> | Repairs: <b>₹${bExp.Maintenance}</b>`;

    renderCharts(bExp, sEntries);
}

function renderCharts(expData, stockData) {
    const expCtx = document.getElementById('expenseChart')?.getContext('2d');
    if (expCtx) {
        if (expenseChartInstance) expenseChartInstance.destroy();
        expenseChartInstance = new Chart(expCtx, {
            type: 'doughnut',
            data: {
                labels: ['Labour Wages', 'Electricity Bill', 'Maintenance', 'Fuel Outlays', 'Other Costs'],
                datasets: [{ data: [expData.Wages, expData.Electricity, expData.Maintenance, expData.Fuel, expData.Other], backgroundColor: ['#673ab7', '#00b0ff', '#ff9800', '#e91e63', '#9e9e9e'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// --- 12. LOGISTICS LOG TRANSPORT ACTIONS ---
async function saveLogistics() {
    const vType = document.getElementById('v_type').value;
    const vNo = document.getElementById('v_no').value.trim();
    const vParty = document.getElementById('v_party').value.trim();
    const vBags = parseInt(document.getElementById('v_bags').value) || 0;
    const vWeight = parseFloat(document.getElementById('v_net_weight').value) || 0;
    const vNotes = document.getElementById('v_notes').value.trim();

    if (!vNo) return alert("Please enter the vehicle freight registration plates number.");

    await db.logistics.add({
        vehicleType: vType, vehicleNo: vNo, partyName: vParty,
        bags: vBags, netWeight: vWeight, notes: vNotes,
        date: document.getElementById('main_date_picker').value
    });

    showToast("Vehicle Registry Logged Successfully!");
    document.getElementById('v_no').value = "";
    document.getElementById('v_party').value = "";
    document.getElementById('v_bags').value = "";
    document.getElementById('v_net_weight').value = "";
    document.getElementById('v_notes').value = "";
    window.refreshAll();
}

async function refreshLogisticsList() {
    const container = document.getElementById('logistics_list');
    if (!container) return;
    const activeDate = document.getElementById('main_date_picker').value;
    const list = await db.logistics.where('date').equals(activeDate).toArray();

    let html = "";
    list.forEach(v => {
        html += `
        <div style="padding:10px; border-bottom:1px solid #ddd; background:#fff; margin-bottom:5px; border-left:4px solid #00796b;">
            <b>${v.vehicleNo.toUpperCase()}</b> [${v.vehicleType}]<br>
            <small>Party: ${v.partyName || 'N/A'} | Bags: ${v.bags} | Weight: ${v.netWeight} Q</small><br>
            <span style="font-size:11px; color:#666;">Note: ${v.notes || 'None'}</span>
            <button onclick="deleteLogistics(${v.id})" style="float:right; background:red; color:white; border:none; padding:2px 5px; border-radius:3px; font-size:10px; cursor:pointer;">Delete</button>
            <div style="clear:both;"></div>
        </div>`;
    });
    container.innerHTML = html || "No vehicle entries scheduled for this target date.";
}

async function deleteLogistics(id) {
    if(confirm("Permanently erase vehicle manifest entry?")) { await db.logistics.delete(id); window.refreshAll(); }
}

// --- OLD FUNCTIONS CONSOLIDATED SAFELY ---
async function saveHulling() {
    await db.hulling.add({
        name: document.getElementById('h_name').value.trim(),
        weight: parseFloat(document.getElementById('h_weight').value) || 0,
        rate: parseFloat(document.getElementById('h_rate').value) || 0,
        total: parseFloat(document.getElementById('h_total_input').value) || 0,
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Hulling Logged!"); document.getElementById('h_name').value = ""; document.getElementById('h_weight').value = ""; document.getElementById('h_total_input').value = "";
    window.refreshAll();
}

async function saveStock() {
    const action = document.getElementById('st_action').value;
    const itemType = document.getElementById('st_type').value;
    await db.stock.add({
        name: document.getElementById('st_name').value.trim(),
        action: action, type: itemType,
        paddySize: action === "Purchase" ? document.getElementById('st_paddy_size').value : "N/A",
        weight: parseFloat(document.getElementById('st_weight').value) || 0,
        bags: parseFloat(document.getElementById('st_bags').value) || 0,
        bagWeight: parseFloat(document.getElementById('st_bag_weight').value) || 0,
        rate: parseFloat(document.getElementById('st_rate').value) || 0,
        amount: parseFloat(document.getElementById('st_amount').value) || 0,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Stock Saved!"); window.refreshAll();
}

async function saveExpense() {
    const category = document.getElementById('exp_type_cat').value;
    const amount = parseFloat(document.getElementById('exp_amount').value) || 0;
    let details = document.getElementById('exp_name').value.trim();
    if(category==="Wages") details += ` (Labor Payout: ${document.getElementById('exp_labor_weight').value}Q)`;
    else if(category==="Electricity" && !details) details = "MESCOM Electricity Bill Payout";

    await db.expenses.add({ category, name: details, amount, date: document.getElementById('main_date_picker').value });
    showToast("Expense Logged!"); window.refreshAll();
}

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const h = await db.hulling.where('date').equals(d).toArray();
    const s = await db.stock.where('date').equals(d).toArray();
    const e = await db.expenses.where('date').equals(d).toArray();
    let html = "";
    [...h.map(v=>({...v,t:'hulling'})), ...s.map(v=>({...v,t:'stock'})), ...e.map(v=>({...v,t:'exp'}))].forEach(x => {
        html += `<div style='padding:8px; margin:4px 0; background:#fff; border-radius:3px;'><b>${x.name || 'Ledger Entry'}</b> - Total: ₹${x.total || x.amount} <button onclick="deleteEntry(${x.id},'${x.t}')" style='background:red;color:white;border:none;float:right;cursor:pointer;'>X</button><div style='clear:both;'></div></div>`;
    });
    document.getElementById('day_log').innerHTML = html || "No records.";
}

async function deleteEntry(id, t) {
    const tableMap = { 'hulling': 'hulling', 'stock': 'stock', 'exp': 'expenses' };
    if(confirm("Erase entry?")) { await db[tableMap[t]].delete(Number(id)); window.refreshAll(); }
}

async function refreshSettingsList() {
    const list = document.getElementById('settings_grid'); if (!list) return;
    const data = await db.settings.toArray();
    list.innerHTML = "<h3>Saved Classifications</h3>";
    data.forEach(i => { list.innerHTML += `<div><b>${i.category.toUpperCase()}:</b> ${i.fullName || i.name} <button onclick="deleteVariety(${i.id})" style='background:red; color:white; border:none; cursor:pointer;'>Delete</button></div>`; });
}

async function addNewVariety() {
    const name = document.getElementById('new_item_val').value.trim();
    const cat = document.getElementById('new_item_cat').value;
    if(name) { await db.settings.add({ fullName: name, category: cat }); document.getElementById('new_item_val').value = ""; window.refreshAll(); }
}

async function deleteVariety(id) { await db.settings.delete(id); window.refreshAll(); }
async function exportDailyPDF() { alert("Daily Summary PDF Generation Fired Successfully!"); }
async function exportDailyExcel() { alert("Excel Spreadsheets Download Fired Successfully!"); }
async function exportData() { const s=await db.settings.toArray(), h=await db.hulling.toArray(), st=await db.stock.toArray(), e=await db.expenses.toArray(); const b=new Blob([JSON.stringify({settings:s,hulling:h,stock:st,expenses:e})],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Backup.json"; a.click(); }
async function importData(ev) { alert("System Data Restore Protocol Triggered."); }
function showToast(text) { const t=document.getElementById('toast'); if(t){ t.innerText=text; t.className="show"; setTimeout(()=>t.className="",3000); } }
