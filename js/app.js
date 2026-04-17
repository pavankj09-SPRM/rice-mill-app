/**
 * js/app.js - Shri Parshwanatha Rice Mill (Enterprise Edition)
 * Updated: 2026-04-17
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

    // 4. Bind Restore Logic (Renamed to avoid "Already Declared" errors)
    const systemRestoreBtn = document.getElementById('btn_restore_trigger');
    const systemFileInput = document.getElementById('import_file');

    if (systemRestoreBtn && systemFileInput) {
        systemRestoreBtn.onclick = () => systemFileInput.click();
        systemFileInput.onchange = (e) => importData(e);
    }

    // 5. Initial Calculations
    setupAutoCalculations();

    // 6. Start App
    switchTab('hulling-tab');
    window.refreshAll();
};
/*
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

    // 4. Bind Restore Logic (Using local scope to prevent SyntaxErrors)
    const restoreTrigger = document.getElementById('btn_restore_trigger');
    const hiddenInput = document.getElementById('import_file');

    if (restoreTrigger && hiddenInput) {
        restoreTrigger.onclick = () => hiddenInput.click();
        hiddenInput.onchange = (e) => importData(e);
    }

    // 5. Initial Calculations
    setupAutoCalculations();

    // 6. Start App
    switchTab('hulling-tab');
    window.refreshAll();
};
*/
// Separate helper to keep window.onload clean
function setupAutoCalculations() {
    const hWeight = document.getElementById('h_weight');
    const hRate = document.getElementById('h_rate');
    const hTotal = document.getElementById('h_total_input');
    
    const runHullingCalc = () => {
        if (document.activeElement !== hTotal) {
            const kg = Logic.processWeight(hWeight.value);
            const rate = parseFloat(hRate.value) || 0;
            hTotal.value = Math.round((kg / 100) * rate);
        }
    };

    if (hWeight && hRate) {
        hWeight.oninput = runHullingCalc;
        hRate.oninput = runHullingCalc;
    }
}
// --- 3. INITIALIZATION ---
/*
window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    const dp = document.getElementById('main_date_picker');
    if (dp) {
        dp.value = today;
        dp.onchange = window.refreshAll;
    }
    
    //the hidden file input to run this function whenever a file is selected
    const restoreBtn = document.getElementById('btn_restore_trigger');
    const fileInput = document.getElementById('import_file');

    if (restoreBtn && fileInput) {
        // When you click the "Restore Backup" button, it clicks the hidden file input
        restoreBtn.onclick = () => fileInput.click();

        // When a file is picked, it runs the importData function
        fileInput.onchange = (e) => importData(e);
    }
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });

    // Hulling Auto-Calc (Editable)
    const hWeight = document.getElementById('h_weight');
    const hRate = document.getElementById('h_rate');
    const hTotal = document.getElementById('h_total_input');
    
    const calcHulling = () => {
        if (document.activeElement !== hTotal) {
            const kg = Logic.processWeight(hWeight.value);
            const rate = parseFloat(hRate.value) || 0;
            hTotal.value = Math.round((kg / 100) * rate);
        }
    };
    hWeight.oninput = calcHulling;
    hRate.oninput = calcHulling;

    // Stock Auto-Calc
    const stWeight = document.getElementById('st_weight');
    const stRate = document.getElementById('st_rate');
    const stAmount = document.getElementById('st_amount');

    const calcStock = () => {
        const w = parseFloat(stWeight.value) || 0;
        const r = parseFloat(stRate.value) || 0;
        stAmount.value = Math.round(w * r);
    };
    stWeight.oninput = calcStock;
    stRate.oninput = calcStock;

    // Buttons
    document.getElementById('btn_save_hulling').onclick = saveHulling;
    document.getElementById('btn_save_stock').onclick = saveStock;
    document.getElementById('btn_add_variety').onclick = addNewVariety;
    document.getElementById('btn_backup').onclick = exportData;
    
    const restoreBtn = document.getElementById('btn_restore_trigger');
    const fileInput = document.getElementById('import_file');
    if (restoreBtn && fileInput) {
        restoreBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => importData(e);
    }

    switchTab('hulling-tab');
    window.refreshAll();
};

*/

// --- 4. SMART DROPDOWNS & SETTINGS ---
async function loadDropdowns() {
    const action = document.getElementById('st_action').value;
    const allSettings = await db.settings.toArray();
    const stockSelect = document.getElementById('st_type');
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
        weight: document.getElementById('h_weight').value,
        rate: document.getElementById('h_rate').value,
        total: document.getElementById('h_total_input').value,
        status: document.getElementById('h_status').value,
        date: document.getElementById('main_date_picker').value
    });
    showToast("Hulling Saved!");
    window.refreshAll();
}

async function saveStock() {
    await db.stock.add({
        name: document.getElementById('st_name').value.trim(),
        action: document.getElementById('st_action').value,
        type: document.getElementById('st_type').value,
        weight: document.getElementById('st_weight').value,
        amount: document.getElementById('st_amount').value,
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
    
    [...hulling.map(v => ({...v, table: 'hulling'})), 
     ...stock.map(v => ({...v, table: 'stock'}))].forEach(x => {
        html += `
        <div class="log-card" style="border-left: 6px solid ${x.table === 'hulling' ? '#673ab7' : '#ff9800'}">
            <div><b>${x.name}</b><br><small>${x.weight} Q | ₹${x.total || x.amount}</small></div>
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

    doc.setFontSize(20);
    doc.text("SHRI PARSHWANATHA RICE MILL", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Proprietor: Jwalaprasad K J | Phone: [Your Phone]", 105, 27, { align: "center" });
    doc.text("Sagara, Shimoga | Date: " + data.date, 105, 32, { align: "center" });
    doc.line(20, 35, 190, 35);

    const rows = [[
        table === 'hulling' ? "Hulling Service" : data.type,
        data.weight + " Q",
        "₹" + (data.rate || "-"),
        "₹" + (data.total || data.amount)
    ]];

    doc.autoTable({
        startY: 40,
        head: [['Description', 'Weight', 'Rate', 'Total']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [103, 58, 183] }
    });
    doc.save(`${data.name}_Bill.pdf`);
}

async function deleteEntry(id, table) {
    if(confirm("Delete record?")) {
        await db[table].delete(Number(id));
        window.refreshAll();
    }
}

// --- 7. BACKUP & RESTORE ---
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!confirm("⚠️ This will erase all data. Continue?")) return;

            await db.transaction('rw', db.settings, db.hulling, db.stock, db.expenses, async () => {

                await db.settings.clear();
                await db.hulling.clear();
                await db.stock.clear();
                await db.expenses.clear();

                // ✅ SAFE INSERT FUNCTION
                const safeInsert = async (table, arr) => {
                    if (!Array.isArray(arr)) return;

                    for (let item of arr) {
                        if (!item || typeof item !== 'object') continue;

                        // Remove id for auto increment
                        delete item.id;

                        // ✅ Ensure required fields exist
                        if (table === 'settings' && !item.fullName) continue;
                        if (table === 'hulling' && !item.name) continue;
                        if (table === 'stock' && !item.name) continue;

                        try {
                            await db[table].add(item);
                        } catch (err) {
                            console.warn("Skipped bad record:", item);
                        }
                    }
                };

                await safeInsert('settings', data.settings);
                await safeInsert('hulling', data.hulling);
                await safeInsert('stock', data.stock);
                await safeInsert('expenses', data.expenses);
            });

            alert("✅ Restore Successful!");
            location.reload();

        } catch (err) {
            console.error(err);
            alert("❌ Restore failed: " + err.message);
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

async function generateSummary() {
    const all = await db.stock.toArray();
    const inv = {};
    all.forEach(i => {
        if (!inv[i.type]) inv[i.type] = 0;
        const w = parseFloat(i.weight) || 0;
        inv[i.type] += (i.action === 'Purchase' || i.action === 'Inward') ? w : -w;
    });
    let html = "<table class='summary-table' style='width:100%'><tr><th>Variety</th><th>Net Stock</th></tr>";
    Object.keys(inv).forEach(k => {
        html += `<tr><td>${k}</td><td><b>${inv[k].toFixed(2)} Q</b></td></tr>`;
    });
    document.getElementById('summary_display').innerHTML = html + "</table>";
}

function showToast(text) {
    const t = document.getElementById('toast');
    if (t) { t.innerText = text; t.className = "show"; setTimeout(() => t.className = "", 3000); }
}

async function importData(event) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm("Restore this backup? Current data will be replaced.")) {
                // Wipe current database tables
                await db.settings.clear();
                await db.hulling.clear();
                await db.stock.clear();
                
                // Add data from your JSON backup
                if (data.settings) await db.settings.bulkAdd(data.settings);
                if (data.hulling) await db.hulling.bulkAdd(data.hulling);
                if (data.stock) await db.stock.bulkAdd(data.stock);

                alert("Restore Successful!");
                location.reload(); // Refresh to show your 31 varieties
            }
        } catch (err) {
            alert("Error reading file: " + err.message);
        }
    };
    reader.readAsText(event.target.files[0]);
}

/*
// Add this at the bottom of js/app.js
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate the JSON structure
            if (!data.settings || !data.hulling || !data.stock) {
                throw new Error("Invalid backup file format");
            }

            if (confirm("Restore this backup? Current data will be replaced.")) {
                // Clear all existing data
                await db.settings.clear();
                await db.hulling.clear();
                await db.stock.clear();
                if (db.expenses) await db.expenses.clear();

                // Bulk add data from your JSON file
                await db.settings.bulkAdd(data.settings);
                await db.hulling.bulkAdd(data.hulling);
                await db.stock.bulkAdd(data.stock);
                if (data.expenses && db.expenses) await db.expenses.bulkAdd(data.expenses);

                alert("Restore Successful!");
                location.reload(); // Refresh the page to show the new data
            }
        } catch (err) {
            alert("Restore Failed: " + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
}
*/
