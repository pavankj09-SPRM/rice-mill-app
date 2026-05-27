/**
 * js/app.js - Shri Parshwanatha Rice Mill (Enterprise Edition)
 * Master Consolidated Application Interface Script
 */

// --- 1. GLOBAL CHART CONFIGURATION POINTERS ---
let expenseChartInstance = null;
let stockChartInstance = null;

// --- 2. CORE SYSTEM REFRESH LOGIC ---
window.refreshAll = async () => {
    try {
        await viewDayLog();
        await generateSummary();
        await refreshSettingsList();
    } catch (e) {
        console.error("Refresh Performance Error:", e);
    }
};

// --- 3. DYNAMIC TAB CONTAINER ROUTING SWITCHER ---
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

    // Trigger calculations and graph generation only when viewing active metrics areas
    if (['dashboard-tab', 'history-tab', 'stock-tab', 'settings-tab'].includes(tabId)) {
        window.refreshAll();
    }
};

// --- 4. HARDWARE RUNTIME INITIALIZATION BLOCK ---
window.onload = () => {
    // 1. Assign local date defaults to global picker
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.value = today;
        datePicker.onchange = window.refreshAll;
    }

    // 2. Attach clean, non-clashing routing events
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // 3. Mount Database Transaction Bindings
    const bindAction = (id, targetFunction) => {
        const component = document.getElementById(id);
        if (component) component.onclick = targetFunction;
    };

    bindAction('btn_save_hulling', saveHulling);
    bindAction('btn_save_stock', saveStock);
    bindAction('btn_add_variety', addNewVariety);
    bindAction('btn_backup', exportData);
    
    bindAction('btn_master_reset', async () => {
        if (confirm("🚨 DANGER: This will permanently wipe your database! Proceed?")) {
            await db.delete();
            location.reload();
        }
    });

    // 4. Secure Backup Import Handlers (Isolated names eliminate "Already Declared" engine crashes)
    const systemRestoreBtn = document.getElementById('btn_restore_trigger');
    const systemFileInput = document.getElementById('import_file');

    if (systemRestoreBtn && systemFileInput) {
        systemRestoreBtn.onclick = () => systemFileInput.click();
        systemFileInput.onchange = (e) => importData(e);
    }

    const stockTypeSelector = document.getElementById('st_type');
    if (stockTypeSelector) {
        stockTypeSelector.onchange = toggleStockInputs;
    }

    // 5. Fire background calculations and components
    setupAutoCalculations();

    // 6. Launch into main screen
    switchTab('hulling-tab');
    window.refreshAll();
};

// --- 5. MATHEMATICAL FORMULATION INTERFACES ---
function setupAutoCalculations() {
    // A. Hulling Service Auto-Calculations
    const hWeight = document.getElementById('h_weight');
    const hRate = document.getElementById('h_rate');
    const hTotal = document.getElementById('h_total_input');

    const runHullingCalc = () => {
        if (document.activeElement !== hTotal) {
            const kg = (typeof Logic !== 'undefined' && Logic.processWeight) ? Logic.processWeight(hWeight.value) : (parseFloat(hWeight.value) * 100 || 0);
            const rate = parseFloat(hRate.value) || 0;
            hTotal.value = Math.round((kg / 100) * rate);
        }
    };

    if (hWeight && hRate) {
        hWeight.oninput = runHullingCalc;
        hRate.oninput = runHullingCalc;
    }

    // B. Complete Inventory Operational Calculations
    const stWeight = document.getElementById('st_weight');
    const stRate = document.getElementById('st_rate');
    const stAmount = document.getElementById('st_amount');
    const stBags = document.getElementById('st_bags');
    const stBagWeight = document.getElementById('st_bag_weight');

    const runStockCalc = () => {
        if (!stWeight || !stRate || !stAmount) return;
        const type = document.getElementById('st_type').value.toLowerCase();
        const bags = parseFloat(stBags?.value) || 0;
        const bagWeight = parseFloat(stBagWeight?.value) || 0;
        const weight = parseFloat(stWeight.value) || 0;
        const rate = parseFloat(stRate.value) || 0;
        let total = 0;

        if (bags > 0 && bagWeight > 0) {
            const calculatedTotalKg = bags * bagWeight;
            stWeight.value = calculatedTotalKg;
            total = calculatedTotalKg * rate;
        } else {
            total = weight * rate;
        }
        stAmount.value = Math.round(total);
    };

    if (stWeight && stRate) {
        stWeight.oninput = runStockCalc;
        stRate.oninput = runStockCalc;
    }
    if (stBags && stBagWeight) {
        stBags.oninput = runStockCalc;
        stBagWeight.oninput = runStockCalc;
    }
}

function getUnitLabel(type = "") {
    type = type.toLowerCase();
    if (type.includes("white-new") || type.includes("white-old") || type.includes("red-new") || type.includes("red-old")) return "Q";
    if (type.includes("husk")) return "KG";
    if (type.includes("diesel")) return "Ltr";
    if (type.includes("salt")) return "Bag";
    if (type.includes("empty bag") || type.includes("bag 25") || type.includes("bag 50")) return "Nos";
    return "KG";
}

function toggleStockInputs() {
    const action = document.getElementById('st_action').value;
    const type = document.getElementById('st_type').value.toLowerCase();
    const weightField = document.getElementById('st_weight');
    const bagsField = document.getElementById('st_bags');
    const bagWeightField = document.getElementById('st_bag_weight');

    if (!bagsField || !bagWeightField || !weightField) return;

    bagsField.style.display = "none";
    bagWeightField.style.display = "none";

    if (action === "Purchase") {
        weightField.style.display = "block";
    } else if (action === "Sale") {
        if (type.includes("salt") || type.includes("empty bag") || type.includes("diesel") || type.includes("husk")) {
            weightField.style.display = "block";
        } else {
            weightField.style.display = "none";
            bagsField.style.display = "block";
            bagWeightField.style.display = "block";
        }
    } else {
        weightField.style.display = "block";
    }
}

// --- 6. SMART CONFIGURATIONS MANAGEMENT ---
async function loadDropdowns() {
    const action = document.getElementById('st_action').value;
    const allSettings = await db.settings.toArray();
    const stockSelect = document.getElementById('st_type');
    if (!stockSelect) return;
    stockSelect.innerHTML = ""; 

    allSettings.forEach(item => {
        const itemName = item.fullName || item.name;
        if (action === "Purchase" && item.category === "paddy") {
            ["White-New", "White-Old", "Red-New", "Red-Old"].forEach(t => {
                stockSelect.add(new Option(`🌾 ${itemName} (${t})`, `${itemName} (${t})`));
            });
        } else if (action === "Sale" && item.category === "rice") {
            stockSelect.add(new Option(`🍚 ${itemName}`, itemName));
        } else if (action === "Misc" && item.category === "misc") {
            stockSelect.add(new Option(`📦 ${itemName}`, itemName));
        }
    });
    toggleStockInputs();
}

async function refreshSettingsList() {
    const list = document.getElementById('settings_grid');
    if (!list) return;
    const data = await db.settings.toArray();
    list.innerHTML = "<h3 style='margin-top:0;'>Saved System Configurations</h3>";
    data.forEach(item => {
        list.innerHTML += `
            <div class="item-row" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                <span><b>${item.category.toUpperCase()}:</b> ${item.fullName || item.name}</span>
                <button class="btn-sm" style="background:#d32f2f; color:white; border:none; padding:3px 8px; border-radius:4px; cursor:pointer;" onclick="deleteVariety(${item.id})">Delete</button>
            </div>`;
    });
    loadDropdowns();
}

async function addNewVariety() {
    const name = document.getElementById('new_item_val').value.trim();
    const cat = document.getElementById('new_item_cat').value;
    if (!name) return alert("Please enter a clear classification label.");
    await db.settings.add({ fullName: name, category: cat });
    document.getElementById('new_item_val').value = "";
    window.refreshAll();
}

async function deleteVariety(id) {
    if (confirm("Delete this setup item?")) {
        await db.settings.delete(id);
        window.refreshAll();
    }
}

// --- 7. FILE STORAGE AND ACCOUNT METRICS CALCULATOR ---
async function generateSummary() {
    try {
        const stockEntries = await db.stock.toArray();
        const hullingEntries = await db.hulling.toArray();
        const settingsEntries = await db.settings.toArray();
        let expenseEntries = [];
        if (db.expenses) expenseEntries = await db.expenses.toArray();

        let totalRevenue = 0;
        let totalExpenses = 0;

        let costCategories = { paddy_purchases: 0, labor_wages: 0, electricity: 0, diesel: 0, miscellaneous: 0 };
        let stockInventory = {};
        const categoryMap = {};

        settingsEntries.forEach(s => {
            const nameKey = (s.fullName || s.name || "").toLowerCase().trim();
            if (nameKey) categoryMap[nameKey] = (s.category || "").toLowerCase().trim();
        });

        hullingEntries.forEach(h => { totalRevenue += parseFloat(h.total) || 0; });

        stockEntries.forEach(item => {
            const amt = parseFloat(item.amount) || 0;
            const weight = parseFloat(item.weight) || 0;
            const itemTypeRaw = (item.type || "").trim();
            const itemTypeLower = itemTypeRaw.toLowerCase();

            if (item.action === "Sale") {
                totalRevenue += amt;
            } else if (item.action === "Purchase") {
                totalExpenses += amt;
                if (itemTypeLower.includes("diesel")) costCategories.diesel += amt;
                else if (itemTypeLower.includes("salt")) costCategories.miscellaneous += amt;
                else costCategories.paddy_purchases += amt;
            }

            if (itemTypeRaw) {
                if (!stockInventory[itemTypeRaw]) stockInventory[itemTypeRaw] = 0;
                stockInventory[itemTypeRaw] += (item.action === "Purchase" || item.action === "Inward") ? weight : -weight;
            }
        });

        expenseEntries.forEach(exp => {
            const amt = parseFloat(exp.amount) || 0;
            totalExpenses += amt;
            const expName = (exp.name || "").toLowerCase();
            const expType = (exp.type || "").toLowerCase();

            if (expName.includes("labour") || expName.includes("wage") || expType.includes("labour")) costCategories.labor_wages += amt;
            else if (expName.includes("electricity") || expName.includes("power") || expName.includes("mescom")) costCategories.electricity += amt;
            else if (expName.includes("diesel") || expType.includes("diesel")) costCategories.diesel += amt;
            else costCategories.miscellaneous += amt;
        });

        const netProfit = totalRevenue - totalExpenses;

        if (document.getElementById('dash_total_revenue')) document.getElementById('dash_total_revenue').innerText = "₹" + Math.round(totalRevenue).toLocaleString('en-IN');
        if (document.getElementById('dash_total_costs')) document.getElementById('dash_total_costs').innerText = "₹" + Math.round(totalExpenses).toLocaleString('en-IN');
        if (document.getElementById('dash_net_profit')) {
            const el = document.getElementById('dash_net_profit');
            el.innerText = "₹" + Math.round(netProfit).toLocaleString('en-IN');
            el.style.color = netProfit >= 0 ? "#2e7d32" : "#c62828";
        }

        renderExpensePieChart(costCategories);
        renderStockBarChart(stockInventory, categoryMap);
        renderInventoryTable(stockInventory);

    } catch (err) {
        console.error("Summary Matrix Computation Failure:", err);
    }
}

// --- 8. ANTI-GLITCH CHART RENDERING FLOWS ---
function renderExpensePieChart(costs) {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
        expenseChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Paddy Material', 'Labour Wages', 'Electricity', 'Diesel Fuel', 'Other Outlays'],
            datasets: [{
                data: [costs.paddy_purchases, costs.labor_wages, costs.electricity, costs.diesel, costs.miscellaneous],
                backgroundColor: ['#512da8', '#f57c00', '#0288d1', '#d81b60', '#78909c'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
            }
        }
    });
}

function renderStockBarChart(inventory, categoryMap) {
    const canvas = document.getElementById('stockBarChart');
    if (!canvas) return;

    if (stockChartInstance) {
        stockChartInstance.destroy();
        stockChartInstance = null;
    }

    const labels = Object.keys(inventory);
    const dataValues = Object.values(inventory);

    if (labels.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const backgroundColors = labels.map(label => {
        const lowerLabel = label.toLowerCase();
        let cat = "paddy";
        for (const [key, val] of Object.entries(categoryMap)) {
            if (lowerLabel.includes(key)) { cat = val; break; }
        }
        if (cat === "rice" || lowerLabel.includes("rice")) return '#2e7d32';
        if (lowerLabel.includes("husk") || lowerLabel.includes("waste")) return '#b0bec5';
        return '#ffb300';
    });

    const ctx = canvas.getContext('2d');
    stockChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Stock Balance', data: dataValues, backgroundColor: backgroundColors, borderRadius: 4 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 1,
            scales: {
                y: { beginAtZero: true, grid: { color: '#eceff1' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, autoSkip: false, font: { size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderInventoryTable(stockInventory) {
    const target = document.getElementById('summary_display');
    if (!target) return;

    let html = `
        <table class="summary-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
            <thead>
                <tr style="background-color:#eff1f5; border-bottom:2px solid #cfd8dc;">
                    <th style="padding:10px;">Commodity Reference</th>
                    <th style="padding:10px; text-align:right;">Book Balance Balance</th>
                </tr>
            </thead>
            <tbody>`;

    const keys = Object.keys(stockInventory);
    if (keys.length === 0) {
        html += `<tr><td colspan="2" style="text-align:center; padding:15px; color:#999;">No logged warehouse adjustments found.</td></tr>`;
    } else {
        keys.forEach((k, idx) => {
            const unit = (k.toLowerCase().includes("husk") || k.toLowerCase().includes("rice")) ? "KG" : "Q";
            html += `
                <tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'}; border-bottom:1px solid #eee;">
                    <td style="padding:8px 10px;">${k}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:bold; color:${stockInventory[k] >= 0 ? '#2e7d32' : '#c62828'}">
                        ${stockInventory[k].toFixed(2)} ${unit}
                    </td>
                </tr>`;
        });
    }
    target.innerHTML = html + `</tbody></table>`;
}

// --- 9. DATA ACTIONS ENGINE ---
async function saveHulling() {
    await db.hulling.add({
        name: document.getElementById('h_name').value.trim(),
        weight: parseFloat(document.getElementById('h_weight').value) || 0,
        rate: parseFloat(document.getElementById('h_rate').value) || 0,
        total: parseFloat(document.getElementById('h_total_input').value) || 0,
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Hulling Record Logged!");
    window.refreshAll();
}

async function saveStock() {
    const bags = parseFloat(document.getElementById('st_bags')?.value) || 0;
    const bagWeight = parseFloat(document.getElementById('st_bag_weight')?.value) || 0;
    const totalWeight = parseFloat(document.getElementById('st_weight').value) || 0;
    const itemType = document.getElementById('st_type').value;

    await db.stock.add({
        name: document.getElementById('st_name').value.trim(),
        action: document.getElementById('st_action').value,
        type: itemType,
        weight: totalWeight,
        bags: bags,
        bagWeight: bagWeight,
        rate: parseFloat(document.getElementById('st_rate').value) || 0,
        amount: parseFloat(document.getElementById('st_amount').value) || 0,
        unit: getUnitLabel(itemType),
        date: document.getElementById('main_date_picker').value
    });

    showToast("Stock Entry Saved!");
    window.refreshAll();
}

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const hulling = await db.hulling.where('date').equals(d).toArray();
    const stock = await db.stock.where('date').equals(d).toArray();
    let html = "";

    [
        ...hulling.map(v => ({ ...v, table: 'hulling' })),
        ...stock.map(v => ({ ...v, table: 'stock' }))
    ].forEach(x => {
        let qtyText = x.table === 'hulling' ? `${x.weight} Q` : (x.bags ? `${x.bags} Bags × ${x.bagWeight}KG` : `${x.weight} ${x.unit || 'KG'}`);
        html += `
        <div class="log-card" style="border-left: 6px solid ${x.table === 'hulling' ? '#673ab7' : '#ff9800'}; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; background:#fff; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div><b>${x.name}</b><br><small>${qtyText} | ₹${x.total || x.amount}</small></div>
            <div>
                <button class="btn-sm" onclick="generateBillPDF('${x.id}', '${x.table}')">PDF</button>
                <button class="btn-sm" style="background:#c62828; color:#fff; border:none; border-radius:3px; margin-left:5px;" onclick="deleteEntry('${x.id}', '${x.table}')">Del</button>
            </div>
        </div>`;
    });
    document.getElementById('day_log').innerHTML = html || "No records logged for today.";
}

async function generateBillPDF(id, table) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = await db[table].get(Number(id));
    if (!data) return alert("Record fetch missing.");

    doc.setFontSize(18);
    doc.text("SHRI PARSHWANATHA RICE MILL", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("Proprietor: Jwalaprasad K J | Sullalli, Shimoga", 105, 22, { align: "center" });
    doc.text("Date: " + data.date, 105, 27, { align: "center" });
    doc.line(20, 30, 190, 30);
    doc.text("Account Name Reference: " + data.name, 20, 38);

    let rows = table === 'hulling' ? 
        [["Hulling Production Fee", `${data.weight} Q`, `Rs. ${data.rate}`, `Rs. ${data.total}`]] :
        [[data.type, data.bags ? `${data.bags} Bags × ${data.bagWeight}kg` : `${data.weight} ${data.unit}`, `Rs. ${data.rate}`, `Rs. ${data.amount}`]];

    doc.autoTable({
        startY: 45,
        head: [['Item Specifications', 'Calculated Weight', 'Unit Rate Base', 'Net Amount']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [81, 45, 168] }
    });

    doc.save(`${data.name || 'Receipt'}_Statement.pdf`);
}

async function deleteEntry(id, table) {
    if (confirm("Permanently erase record?")) {
        await db[table].delete(Number(id));
        window.refreshAll();
    }
}

// --- 10. SYSTEM DISASTER RESTORE AND BACKUP COMPONENT PROTOCOLS ---
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm("WARNING: Overwrite all operational records with this backup?")) {
                await Promise.all([db.settings.clear(), db.hulling.clear(), db.stock.clear()]);
                if (db.expenses) await db.expenses.clear();

                if (data.settings) await db.settings.bulkPut(data.settings);
                if (data.hulling) await db.hulling.bulkPut(data.hulling);
                if (data.stock) await db.stock.bulkPut(data.stock);
                if (data.expenses && db.expenses) await db.expenses.bulkPut(data.expenses);

                alert("Database Restored Successfully!");
                location.reload(); 
            }
        } catch (err) {
            alert("JSON Process Crash: " + err.message);
        }
    };
    reader.readAsText(file);
}

async function exportData() {
    const settings = await db.settings.toArray();
    const hulling = await db.hulling.toArray();
    const stock = await db.stock.toArray();
    const payload = { settings, hulling, stock };
    if (db.expenses) payload.expenses = await db.expenses.toArray();

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Backup_Mill_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function showToast(text) {
    const t = document.getElementById('toast');
    if (t) { t.innerText = text; t.className = "show"; setTimeout(() => t.className = "", 3000); }
}
