/**
 * js/app.js - Shri Parshwanatha Rice Mill (Enterprise Edition)
 * Updated: 2026-05-27
 */

// --- 1. CORE REFRESH LOGIC ---
window.refreshAll = async () => {
    try {
        await viewDayLog();
        await generateSummary();
        await refreshSettingsList();
    } catch (e) {
        console.error("Refresh Error:", e);
    }
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

    if (['history-tab', 'stock-tab', 'settings-tab'].includes(tabId)) {
        window.refreshAll();
    }
};

// --- 3. INITIALIZATION ---
window.onload = () => {
    // 1. Set Default Date
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.value = today;
        datePicker.onchange = window.refreshAll;
    }

    // 2. Bind Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // 3. Bind Main Action Buttons
    const bind = (id, func) => {
        const el = document.getElementById(id);
        if (el) el.onclick = func;
    };

    bind('btn_save_hulling', saveHulling);
    bind('btn_save_stock', saveStock);
    bind('btn_add_variety', addNewVariety);
    bind('btn_backup', exportData);
    
    bind('btn_master_reset', async () => {
        if(confirm("DANGER: This wipes everything! Continue?")) {
            await db.delete();
            location.reload();
        }
    });

    // 4. Bind Restore Logic
    const systemRestoreBtn = document.getElementById('btn_restore_trigger');
    const systemFileInput = document.getElementById('import_file');

    if (systemRestoreBtn && systemFileInput) {
        systemRestoreBtn.onclick = () => systemFileInput.click();
        systemFileInput.onchange = (e) => importData(e);
    }

    const stockType = document.getElementById('st_type');
    if (stockType) {
        stockType.onchange = toggleStockInputs;
    }

    // 5. Initial Calculations
    setupAutoCalculations();

    // 6. Start App
    switchTab('hulling-tab');
    window.refreshAll();
};

// Separate helper to keep window.onload clean
function setupAutoCalculations() {
    // ---------------- HULLING AUTO CALC ----------------
    const hWeight = document.getElementById('h_weight');
    const hRate = document.getElementById('h_rate');
    const hTotal = document.getElementById('h_total_input');

    const runHullingCalc = () => {
        if (document.activeElement !== hTotal) {
            // Checks global custom weights processor logic
            const kg = typeof Logic !== 'undefined' ? Logic.processWeight(hWeight.value) : parseFloat(hWeight.value) * 100 || 0;
            const rate = parseFloat(hRate.value) || 0;
            hTotal.value = Math.round((kg / 100) * rate);
        }
    };

    if (hWeight && hRate) {
        hWeight.oninput = runHullingCalc;
        hRate.oninput = runHullingCalc;
    }

    // ---------------- STOCK AUTO CALC ----------------
    const stWeight = document.getElementById('st_weight');
    const stRate = document.getElementById('st_rate');
    const stAmount = document.getElementById('st_amount');
    const stBags = document.getElementById('st_bags');
    const stBagWeight = document.getElementById('st_bag_weight');

    const runStockCalc = () => {
        const type = document.getElementById('st_type').value.toLowerCase();
        const bags = parseFloat(stBags?.value) || 0;
        const bagWeight = parseFloat(stBagWeight?.value) || 0;
        const weight = parseFloat(stWeight.value) || 0;
        const rate = parseFloat(stRate.value) || 0;
        let total = 0;

        // RICE BAG SALE
        if (bags > 0 && bagWeight > 0) {
            const totalKg = bags * bagWeight;
            stWeight.value = totalKg;
            total = totalKg * rate;
        }
        // SALT, EMPTY BAGS, DIESEL, HUSK & NORMAL VARIETIES
        else {
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
    if (type.includes("white-new") || type.includes("white-old") || type.includes("red-new") || type.includes("red-old")) {
        return "Q";
    }
    if (type.includes("husk")) return "KG";
    if (type.includes("diesel")) return "Ltr";
    if (type.includes("salt")) return "Bag";
    if (type.includes("empty bag") || type.includes("bag 25") || type.includes("bag 50")) {
        return "Nos";
    }
    return "KG"; // Default Rice variant label
}

function toggleStockInputs() {
    const action = document.getElementById('st_action').value;
    const type = document.getElementById('st_type').value.toLowerCase();
    const weightField = document.getElementById('st_weight');
    const bagsField = document.getElementById('st_bags');
    const bagWeightField = document.getElementById('st_bag_weight');

    if (!bagsField || !bagWeightField || !weightField) return;

    // DEFAULT HIDE
    bagsField.style.display = "none";
    bagWeightField.style.display = "none";

    if (action === "Purchase") {
        weightField.style.display = "block";
    } else if (action === "Sale") {
        if (type.includes("salt") || type.includes("empty bag") || type.includes("bag 25") || type.includes("bag 50") || type.includes("diesel") || type.includes("husk")) {
            weightField.style.display = "block";
        } else {
            // Normal Rice sales require Bag-Count entries
            weightField.style.display = "none";
            bagsField.style.display = "block";
            bagWeightField.style.display = "block";
        }
    } else {
        weightField.style.display = "block";
    }
}

// --- 4. SMART DROPDOWNS & SETTINGS ---
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
        } 
        else if (action === "Sale" && item.category === "rice") {
            stockSelect.add(new Option(`🍚 ${itemName}`, itemName));
        }
        else if (action === "Misc" && item.category === "misc") {
            stockSelect.add(new Option(`📦 ${itemName}`, itemName));
        }
    });
    toggleStockInputs();
}

async function refreshSettingsList() {
    const list = document.getElementById('settings_grid');
    if (!list) return;
    const data = await db.settings.toArray();
    list.innerHTML = "<h3>Saved Varieties</h3>";
    data.forEach(item => {
        list.innerHTML += `
            <div class="item-row">
                <span><b>${item.category.toUpperCase()}:</b> ${item.fullName || item.name}</span>
                <button class="btn-sm" style="background:red; color:white;" onclick="deleteVariety(${item.id})">Delete</button>
            </div>`;
    });
    loadDropdowns();
}

async function addNewVariety() {
    const name = document.getElementById('new_item_val').value.trim();
    const cat = document.getElementById('new_item_cat').value;
    if (!name) return alert("Enter variety name");
    await db.settings.add({ fullName: name, category: cat });
    document.getElementById('new_item_val').value = "";
    window.refreshAll();
}

async function deleteVariety(id) {
    if(confirm("Delete this variety?")) {
        await db.settings.delete(id);
        window.refreshAll();
    }
}

// --- 5. DATA ACTIONS ---
async function saveHulling() {
    await db.hulling.add({
        name: document.getElementById('h_name').value.trim(),
        weight: parseFloat(document.getElementById('h_weight').value) || 0,
        rate: parseFloat(document.getElementById('h_rate').value) || 0,
        total: parseFloat(document.getElementById('h_total_input').value) || 0,
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Hulling Saved!");
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

    showToast("Stock Saved!");
    window.refreshAll();
}

// --- 6. PDF & LOGS ---
async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const hulling = await db.hulling.where('date').equals(d).toArray();
    const stock = await db.stock.where('date').equals(d).toArray();
    let html = "";

    [
        ...hulling.map(v => ({ ...v, table: 'hulling' })),
        ...stock.map(v => ({ ...v, table: 'stock' }))
    ].forEach(x => {
        let qtyText = "";
        if (x.table === 'hulling') {
            qtyText = `${x.weight} Q`;
        } else {
            const unit = x.unit || "Qty";
            if (x.bags && x.bagWeight) {
                qtyText = `${x.bags} Bags × ${x.bagWeight}KG`;
            } else {
                qtyText = `${x.weight} ${unit}`;
            }
        }

        html += `
        <div class="log-card" style="border-left: 6px solid ${x.table === 'hulling' ? '#673ab7' : '#ff9800'}">
            <div>
                <b>${x.name}</b><br>
                <small>${qtyText} | ₹${x.total || x.amount}</small>
            </div>
            <div class="log-actions">
                <button class="btn-sm" onclick="generateBillPDF('${x.id}', '${x.table}')">PDF</button>
                <button class="btn-sm" style="background:red; color:white;" onclick="deleteEntry('${x.id}', '${x.table}')">Del</button>
            </div>
        </div>`;
    });

    document.getElementById('day_log').innerHTML = html || "No records.";
}

async function generateBillPDF(id, table) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = await db[table].get(Number(id));

    if (!data) {
        alert("Record not found");
        return;
    }

    // ---------------- HEADER ----------------
    doc.setFontSize(20);
    doc.text("SHRI PARSHWANATHA RICE MILL", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Proprietor: Jwalaprasad K J | Phone: +91 9482364402, +91 8861080602", 105, 27, { align: "center" });
    doc.text("Sullalli, Shimoga | Date: " + (data.date || "-"), 105, 32, { align: "center" });
    doc.line(20, 35, 190, 35);

    // ---------------- CUSTOMER NAME ----------------
    doc.setFontSize(12);
    doc.text("Name: " + (data.name || "-"), 20, 45);

    // ---------------- TABLE DATA ----------------
    let rows = [];
    if (table === 'hulling') {
        const weight = parseFloat(data.weight) || 0;
        const rate = parseFloat(data.rate) || 0;
        const total = parseFloat(data.total) || 0;
        rows = [["Hulling Service", weight.toFixed(2) + " Q", "Rs. " + rate.toFixed(2), "Rs. " + total.toFixed(2)]];
    } else {
        const weightText = data.bags ? `${data.bags} Bags × ${data.bagWeight}kg` : `${data.weight} ${data.unit || 'KG'}`;
        rows = [[data.type, weightText, "Rs. " + (parseFloat(data.rate) || 0).toFixed(2), "Rs. " + (parseFloat(data.amount) || 0).toFixed(2)]];
    }

    doc.autoTable({
        startY: 52,
        head: [['Description', 'Quantity/Weight', 'Rate', 'Total Amount']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [103, 58, 183] }
    });

    doc.save(`${data.name || 'Receipt'}_Bill.pdf`);
}

async function deleteEntry(id, table) {
    if(confirm("Delete record?")) {
        await db[table].delete(Number(id));
        window.refreshAll();
    }
}

// --- 7. BACKUP & RESTORE LOGIC ---
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm("WARNING: This will completely replace your current app data with the backup file. Proceed?")) {
                await Promise.all([
                    db.settings.clear(),
                    db.hulling.clear(),
                    db.stock.clear()
                ]);

                if (data.settings && data.settings.length > 0) await db.settings.bulkPut(data.settings);
                if (data.hulling && data.hulling.length > 0) await db.hulling.bulkPut(data.hulling);
                if (data.stock && data.stock.length > 0) await db.stock.bulkPut(data.stock);

                alert("System Data Restored Successfully!");
                location.reload(); 
            }
        } catch (err) {
            alert("Restore Failed: " + err.message);
        }
    };
    reader.readAsText(file);
}

async function exportData() {
    const settings = await db.settings.toArray();
    const hulling = await db.hulling.toArray();
    const stock = await db.stock.toArray();
    const blob = new Blob([JSON.stringify({settings, hulling, stock})], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Backup_Mill_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

/*async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = parseFloat(i.weight) || 0;
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });
    
    let html = "<table class='summary-table' style='width:100%'><tr><th>Variety Name</th><th>Net Stock Quantity</th></tr>";
    const keys = Object.keys(inv);
    if(keys.length === 0) {
        html += "<tr><td colspan='2' style='text-align:center;'>No transactional stock records found.</td></tr>";
    } else {
        keys.forEach(k => {
            html += `<tr><td>${k}</td><td><b>${inv[k].toFixed(2)}</b></td></tr>`;
        });
    }
    const targetDisplay = document.getElementById('summary_display');
    if (targetDisplay) targetDisplay.innerHTML = html + "</table>";
}
*/
// Keep track of chart instances globally to safely clear canvas rendering loops
let expenseChartInstance = null;
let stockChartInstance = null;

async function generateSummary() {
    try {
        // --- 1. PULL ALL RELEVANT DATA STORES ---
        const stockEntries = await db.stock.toArray();
        const hullingEntries = await db.hulling.toArray();
        const settingsEntries = await db.settings.toArray();
        
        let expenseEntries = [];
        if (db.expenses) {
            expenseEntries = await db.expenses.toArray();
        }

        // --- 2. DEFINE INITIAL ANALYTICS LEDGERS ---
        let totalRevenue = 0;
        let totalExpenses = 0;

        let costCategories = {
            paddy_purchases: 0,
            labor_wages: 0,
            electricity: 0,
            diesel: 0,
            miscellaneous: 0
        };

        let stockInventory = {};

        // Create a lookup dictionary from settings to safely cross-reference categories
        // Maps e.g., "Abhilasha Small" -> "paddy", "Diamond Sona" -> "rice"
        const categoryMap = {};
        settingsEntries.forEach(s => {
            const nameKey = (s.fullName || s.name || "").toLowerCase().trim();
            if (nameKey) {
                categoryMap[nameKey] = (s.category || "").toLowerCase().trim();
            }
        });

        // --- 3. AGGREGATE REVENUE AND OVERHEAD COSTS ---

        // A. Hulling Operations Income
        hullingEntries.forEach(h => {
            totalRevenue += parseFloat(h.total) || 0;
        });

        // B. Stock Operations (Purchases, Sales & Inventory Volumes)
        stockEntries.forEach(item => {
            const amt = parseFloat(item.amount) || 0;
            const weight = parseFloat(item.weight) || 0;
            const itemTypeRaw = (item.type || "").trim();
            const itemTypeLower = itemTypeRaw.toLowerCase();

            // Handle Financial Flows
            if (item.action === "Sale") {
                totalRevenue += amt;
            } else if (item.action === "Purchase") {
                totalExpenses += amt;
                
                // Route to Paddy Purchases by default unless explicitly matching an operational utility
                if (itemTypeLower.includes("diesel")) {
                    costCategories.diesel += amt;
                } else if (itemTypeLower.includes("salt")) {
                    costCategories.miscellaneous += amt;
                } else {
                    costCategories.paddy_purchases += amt;
                }
            }

            // Group Stock Volumes accurately (Reconciliation Logic)
            if (itemTypeRaw) {
                if (!stockInventory[itemTypeRaw]) stockInventory[itemTypeRaw] = 0;
                stockInventory[itemTypeRaw] += (item.action === "Purchase" || item.action === "Inward") ? weight : -weight;
            }
        });

        // C. Dedicated Fixed/Variable Expenditure Ledger
        expenseEntries.forEach(exp => {
            const amt = parseFloat(exp.amount) || 0;
            totalExpenses += amt;
            
            const expName = (exp.name || "").toLowerCase();
            const expType = (exp.type || "").toLowerCase();

            // Smart String Routing matching local operational accounts (Labor, Pigmy, Bills)
            if (expName.includes("labour") || expName.includes("wage") || expType.includes("labour")) {
                costCategories.labor_wages += amt;
            } else if (expName.includes("electricity") || expName.includes("power") || expName.includes("mescom")) {
                costCategories.electricity += amt;
            } else if (expName.includes("diesel") || expType.includes("diesel")) {
                costCategories.diesel += amt;
            } else {
                costCategories.miscellaneous += amt; // Safely routes elements like "Pigmy" deposits
            }
        });

        const netProfit = totalRevenue - totalExpenses;

        // --- 4. UPDATE METRIC DISPLAY TILE VIEWS ---
        if (document.getElementById('dash_total_revenue')) {
            document.getElementById('dash_total_revenue').innerText = "₹" + Math.round(totalRevenue).toLocaleString('en-IN');
        }
        if (document.getElementById('dash_total_costs')) {
            document.getElementById('dash_total_costs').innerText = "₹" + Math.round(totalExpenses).toLocaleString('en-IN');
        }
        if (document.getElementById('dash_net_profit')) {
            const profitEl = document.getElementById('dash_net_profit');
            profitEl.innerText = "₹" + Math.round(netProfit).toLocaleString('en-IN');
            profitEl.style.color = netProfit >= 0 ? "#2e7d32" : "#c62828";
        }

        // --- 5. RENDER THE CHART WINDOWS AND RECONCILIATION DATA TABLE ---
        renderExpensePieChart(costCategories);
        renderStockBarChart(stockInventory, categoryMap);
        renderInventoryTable(stockInventory);

    } catch (error) {
        console.error("Dashboard Analytics Compilation Failure:", error);
    }
}

// --- 6. CHART GENERATION SUB-HANDLERS ---

function renderExpensePieChart(costs) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    // Only render visual chart arcs if expenses are logged to prevent empty gray voids
    const absoluteCosts = Object.values(costs).reduce((a, b) => a + b, 0);

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Paddy Material', 'Labour Wages', 'Electricity / Power', 'Diesel Fuel', 'Other (Pigmy/Misc)'],
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
                legend: { 
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw || 0;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderStockBarChart(inventory, categoryMap) {
    const ctx = document.getElementById('stockBarChart');
    if (!ctx) return;

    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    const labels = Object.keys(inventory);
    const dataValues = Object.values(inventory);

    // Dynamic coloring based on configuration mapping rules
    const backgroundColors = labels.map(label => {
        const lowerLabel = label.toLowerCase();
        
        // Find if any entry in our configuration maps directly to a category
        let category = "paddy"; // Default fallback
        for (const [key, val] of Object.entries(categoryMap)) {
            if (lowerLabel.includes(key)) {
                category = val;
                break;
            }
        }

        if (category === "rice" || lowerLabel.includes("rice")) return '#2e7d32'; // Green for processed product
        if (lowerLabel.includes("husk") || lowerLabel.includes("waste")) return '#b0bec5'; // Grey for mill byproduct
        return '#ffb300'; // Amber for unprocessed paddy storage volumes
    });

    stockChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Current Net Volume Available',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Quantity (Quintals / KG Units)', font: { weight: 'bold' } }
                },
                x: {
                    ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderInventoryTable(stockInventory) {
    const targetDisplay = document.getElementById('summary_display');
    if (!targetDisplay) return;

    let html = `
        <table class="summary-table" style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
                <tr style="background-color:#eff1f5; border-bottom:2px solid #cfd8dc;">
                    <th style="padding:12px 10px;">Commodity Reference Variant Name</th>
                    <th style="padding:12px 10px; text-align:right;">Current Book Stock Quantity</th>
                </tr>
            </thead>
            <tbody>`;

    const keys = Object.keys(stockInventory);
    if (keys.length === 0) {
        html += `<tr><td colspan="2" style="text-align:center; padding:20px; color:#78909c;">No physical inventory tracking logs recorded.</td></tr>`;
    } else {
        keys.forEach((k, index) => {
            const unit = (k.toLowerCase().includes("husk") || k.toLowerCase().includes("rice")) ? "KG" : "Q";
            const rowBg = index % 2 === 0 ? "#ffffff" : "#f8f9fa";
            html += `
                <tr style="background-color:${rowBg}; border-bottom:1px solid #eceff1;">
                    <td style="padding:10px;">${k}</td>
                    <td style="padding:10px; text-align:right; font-weight:bold; color:${stockInventory[k] >= 0 ? '#1b5e20' : '#b71c1c'}">
                        ${stockInventory[k].toFixed(2)} ${unit}
                    </td>
                </tr>`;
        });
    }
    
    html += `</tbody></table>`;
    targetDisplay.innerHTML = html;
}



function showToast(text) {
    const t = document.getElementById('toast');
    if (t) { t.innerText = text; t.className = "show"; setTimeout(() => t.className = "", 3000); }
}
