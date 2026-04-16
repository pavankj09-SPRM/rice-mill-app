/**
 * js/app.js - The Brain of Parshwanatha Rice Mill
 */

let myChart = null;
let currentSummaryView = 'month';

// 1. INITIALIZATION
window.onload = () => {
    const datePicker = document.getElementById('main_date_picker');
    if (datePicker) {
        datePicker.valueAsDate = new Date();
    }
    attachListeners();
    refreshAll();
};

// 2. EVENT LISTENERS
function attachListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTab = e.target.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
            e.target.classList.add('active');
        });
    });

    // Date Changes
    document.getElementById('main_date_picker').addEventListener('change', refreshAll);

    // Save Buttons
    document.getElementById('btn_save_hulling').onclick = saveHulling;
    document.getElementById('btn_save_stock').onclick = saveStock;
    document.getElementById('btn_save_expense').onclick = saveExpense;
    document.getElementById('btn_add_variety').onclick = addVariety;

    // Utility Helpers
    document.getElementById('btn_auto_labour').onclick = autoLabour;
    document.getElementById('btn_set_elec').onclick = () => {
        document.getElementById('exp_name').value = "Electricity Bill";
    };

    // History View Toggles
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.onclick = (e) => {
            currentSummaryView = e.target.getAttribute('data-view');
            document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            generateSummary();
        };
    });

    // Restore Button Fix
    const restoreBtn = document.getElementById('btn_restore_trigger');
    const fileInput = document.getElementById('import_file');
    if (restoreBtn && fileInput) {
        restoreBtn.onclick = () => {
            fileInput.value = null;
            fileInput.click();
        };
        fileInput.onchange = importJSON;
    }

    // Export Buttons
    document.getElementById('btn_backup').onclick = exportJSON;
    document.getElementById('btn_export_excel').onclick = exportToExcel;
    document.getElementById('btn_export_pdf').onclick = exportToPDF;

    // Hulling Weight Auto-Calc
    document.getElementById('h_weight').oninput = calculateHullingTotal;
    document.getElementById('h_rate').oninput = calculateHullingTotal;
    
    // Stock Logic Update
    document.getElementById('st_action').onchange = () => {
        db.settings.toArray().then(items => updateStockDropdown(items));
    };
}

// 3. CORE ACTION FUNCTIONS

async function refreshAll() {
    await updateSettingsGrid();
    await viewDayLog();
    await refreshDashboard();
    await generateSummary();
}

function calculateHullingTotal() {
    const weightVal = document.getElementById('h_weight').value;
    const rate = document.getElementById('h_rate').value;
    const kg = Logic.processWeight(weightVal, 'paddy');
    document.getElementById('h_total_input').value = Math.round((kg / 100) * rate);
}

async function saveHulling() {
    const name = document.getElementById('h_name').value.trim();
    const weight = document.getElementById('h_weight').value;
    const date = document.getElementById('main_date_picker').value;

    if (!name || !weight) return alert("Enter Customer Name and Weight");

    await db.hulling.add({
        name,
        weight,
        total: document.getElementById('h_total_input').value,
        status: document.getElementById('h_status').value,
        date: date
    });

    document.getElementById('h_name').value = "";
    document.getElementById('h_weight').value = "";
    showToast("Hulling Saved Successfully!");
    refreshAll();
}

async function saveStock() {
    const name = document.getElementById('st_name').value.trim();
    const weight = document.getElementById('st_weight').value;
    const type = document.getElementById('st_type').value;
    const date = document.getElementById('main_date_picker').value;

    if (!name || !weight) return alert("Enter Party Name and Weight");

    await db.stock.add({
        name,
        action: document.getElementById('st_action').value,
        type: type,
        weight: weight,
        amount: parseFloat(document.getElementById('st_amount').value) || 0,
        date: date
    });

    document.getElementById('st_name').value = "";
    document.getElementById('st_weight').value = "";
    showToast("Stock Updated!");
    refreshAll();
}

async function saveExpense() {
    const name = document.getElementById('exp_name').value.trim();
    const amt = document.getElementById('exp_amount').value;
    const date = document.getElementById('main_date_picker').value;

    if (!name || !amt) return alert("Enter Expense Details and Amount");

    await db.expenses.add({
        name,
        type: document.getElementById('exp_type_cat').value,
        amount: parseFloat(amt) || 0,
        date: date
    });

    document.getElementById('exp_name').value = "";
    document.getElementById('exp_amount').value = "";
    showToast("Expense Recorded");
    refreshAll();
}

// 4. SETTINGS & LOGS

async function addVariety() {
    const val = document.getElementById('new_item_val').value.trim();
    const cat = document.getElementById('new_item_cat').value;
    if (!val) return;

    await db.settings.add({ fullName: val, category: cat });
    document.getElementById('new_item_val').value = "";
    refreshAll();
}

async function updateSettingsGrid() {
    const items = await db.settings.toArray();
    const grid = document.getElementById('settings_grid');
    let html = "";

    ['paddy', 'rice', 'misc'].forEach(cat => {
        html += `<div class="card"><h3>${cat.toUpperCase()} List</h3>`;
        items.filter(i => i.category === cat).forEach(i => {
            html += `<div class="item-row">
                <span>${i.fullName}</span>
                <button class="btn-sm" style="background:#fee2e2; color:red;" onclick="deleteEntry('settings', ${i.id})">Delete</button>
            </div>`;
        });
        html += `</div>`;
    });
    grid.innerHTML = html;
    updateStockDropdown(items);
}

function updateStockDropdown(items) {
    const act = document.getElementById('st_action').value;
    let html = "";
    if (act === 'Purchase') {
        items.filter(i => i.category === 'paddy').forEach(p => html += `<option value="${p.fullName}">${p.fullName}</option>`);
    } else {
        items.filter(i => i.category !== 'paddy').forEach(r => html += `<option value="${r.fullName}">${r.fullName}</option>`);
    }
    document.getElementById('st_type').innerHTML = html + `<option value="Husk Load">Husk Load</option>`;
}

// 5. DASHBOARD & SUMMARY

async function refreshDashboard() {
    const d = document.getElementById('main_date_picker').value;
    const [h, s, e] = await Promise.all([
        db.hulling.where('date').equals(d).toArray(),
        db.stock.where('date').equals(d).toArray(),
        db.expenses.where('date').equals(d).toArray()
    ]);

    const tKg = h.reduce((acc, curr) => acc + Logic.processWeight(curr.weight, 'paddy'), 0);
    const inc = h.filter(x => x.status === 'Paid').reduce((a, b) => a + parseFloat(b.total || 0), 0) +
                s.filter(x => x.action === 'Sale').reduce((a, b) => a + (b.amount || 0), 0);
    const exp = s.filter(x => x.action === 'Purchase').reduce((a, b) => a + (b.amount || 0), 0) +
                e.reduce((a, b) => a + (b.amount || 0), 0);

    document.getElementById('dash_stats_container').innerHTML = `
        <div class="stat-box stat-hulling"><span>Daily Hulling</span><span class="stat-val">${Logic.formatDisplay(tKg)}</span></div>
        <div class="stat-box stat-income"><span>Income</span><span class="stat-val">₹${inc}</span></div>
        <div class="stat-box stat-expense"><span>Expense</span><span class="stat-val">₹${exp}</span></div>
    `;

    renderChart(inc, exp);
}

function renderChart(inc, exp) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{ data: [inc, exp], backgroundColor: ['#2e7d32', '#c62828'] }]
        },
        options: { maintainAspectRatio: false }
    });
}

// 6. HISTORY LOGS & SUMMARY

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const [h, s, e] = await Promise.all([
        db.hulling.where('date').equals(d).toArray(),
        db.stock.where('date').equals(d).toArray(),
        db.expenses.where('date').equals(d).toArray()
    ]);
    
    let html = "";
   // Update this part inside viewDayLog()
    h.forEach(x => {
        html += `<div class="log-card" style="border-left-color: #ff9800">
            <div>
                <b>${x.name}</b><br>
                <small>${Logic.formatDisplay(Logic.processWeight(x.weight, 'paddy'))}</small>
            </div>
            <div class="log-actions">
                <button class="btn-sm" style="background:#ff9800" onclick="editHulling(${x.id})">✏️</button>
                <button class="btn-sm" style="background:#2e7d32" onclick="printSingleBill(${x.id})">📄 Bill</button>
                <button class="btn-sm" style="background:#c62828" onclick="deleteEntry('hulling', ${x.id})">✕</button>
            </div>
        </div>`;
    });
    
    // Add similar loops for 's' (stock) and 'e' (expenses) if needed
    document.getElementById('day_log').innerHTML = html || "No entries for today.";
}

async function generateSummary() {
    const dStr = document.getElementById('main_date_picker').value;
    const filter = currentSummaryView === 'month' ? dStr.substring(0, 7) : dStr.substring(0, 4);
    const allStock = await db.stock.toArray();
    const filtered = allStock.filter(x => x.date.startsWith(filter));
    
    const inventory = {};
    filtered.forEach(i => { 
        if(!inventory[i.type]) inventory[i.type] = 0; 
        const w = Logic.processWeight(i.weight, i.type);
        inventory[i.type] += (i.action === 'Purchase' ? w : -w);
    });
    
    let html = `<table class="summary-table"><thead><tr><th>Variety</th><th>Net Stock</th></tr></thead><tbody>`;
    for(let k in inventory) {
        html += `<tr><td><b>${k}</b></td><td>${Logic.formatDisplay(inventory[k])}</td></tr>`;
    }
    document.getElementById('summary_display').innerHTML = html + "</tbody></table>";
}

// 7. UTILITIES (Backup, Toast, Delete)

function showToast(m) {
    const x = document.getElementById("toast");
    x.innerText = m;
    x.className = "show";
    setTimeout(() => x.className = "", 2500);
}

async function deleteEntry(table, id) {
    if (confirm("Delete this record?")) {
        await db[table].delete(id);
        refreshAll();
    }
}

async function exportJSON() {
    const data = {
        settings: await db.settings.toArray(),
        hulling: await db.hulling.toArray(),
        stock: await db.stock.toArray(),
        expenses: await db.expenses.toArray()
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Mill_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

async function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await db.transaction('rw', [db.settings, db.hulling, db.stock, db.expenses], async () => {
                await Promise.all([db.settings.clear(), db.hulling.clear(), db.stock.clear(), db.expenses.clear()]);
                if (data.settings) await db.settings.bulkAdd(data.settings);
                if (data.hulling) await db.hulling.bulkAdd(data.hulling);
                if (data.stock) await db.stock.bulkAdd(data.stock);
                if (data.expenses) await db.expenses.bulkAdd(data.expenses);
            });
            alert("Restore Complete!");
            location.reload();
        } catch (err) { alert("Invalid File Format"); }
    };
    reader.readAsText(file);
}

async function autoLabour() {
    const d = document.getElementById('main_date_picker').value;
    const h = await db.hulling.where('date').equals(d).toArray();
    const tKg = h.reduce((s, i) => s + Logic.processWeight(i.weight, 'paddy'), 0);
    document.getElementById('exp_name').value = `Labour (${Logic.formatDisplay(tKg)})`;
    document.getElementById('exp_amount').value = Math.round(tKg * 0.23);
}

// 8. EXPORTS

async function exportToExcel() {
    const h = await db.hulling.toArray(), s = await db.stock.toArray(), e = await db.expenses.toArray();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h), "Hulling");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s), "Stock");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(e), "Expenses");
    XLSX.writeFile(wb, `Mill_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const d = document.getElementById('main_date_picker').value;
    doc.text(`Daily Report: ${d}`, 14, 20);
    const h = await db.hulling.where('date').equals(d).toArray();
    const body = h.map(x => [x.name, Logic.formatDisplay(Logic.processWeight(x.weight, 'paddy')), x.total, x.status]);
    doc.autoTable({ head: [['Customer', 'Weight', 'Amount', 'Status']], body: body, startY: 30 });
    doc.save(`Report_${d}.pdf`);
}

async function printSingleBill(id) {
    const entry = await db.hulling.get(id);
    if (!entry) return;

    const { jsPDF } = window.jspdf;
    
    // Create a 80mm width receipt (Standard Thermal size)
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 160] 
    });

    // --- 1. THE BORDER ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(2, 2, 76, 156); // Outer frame

    // --- 2. THE HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SHRI PARSHWANATHA RICE MILL", 40, 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Sullalli, Sagar Taluk, Shimoga Dist.", 40, 17, { align: "center" });
    doc.text("Ph No: +91 9482364402, +91 8861080602", 40, 21, { align: "center" });
    
    // Separator line
    doc.setLineWidth(0.2);
    doc.line(5, 25, 75, 25);

    // --- 3. CUSTOMER DETAILS ---
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE / RECEIPT", 40, 32, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text(`Bill Date : ${entry.date}`, 8, 40);
    doc.text(`Customer : ${entry.name}`, 8, 45);
    doc.text(`Status   : ${entry.status}`, 8, 50);

    // --- 4. DATA TABLE ---
    doc.autoTable({
        startY: 55,
        margin: { left: 5, right: 5 },
        head: [['Service Description', 'Qty', 'Total']],
        body: [
            ['Paddy Hulling Service', 
             Logic.formatDisplay(Logic.processWeight(entry.weight, 'paddy')), 
             `Rs. ${entry.total}`]
        ],
        theme: 'grid', // Grid theme provides clean table lines
        styles: { 
            fontSize: 8, 
            cellPadding: 3,
            halign: 'center'
        },
        headStyles: { 
            fillColor: [40, 40, 40], // Dark header
            textColor: [255, 255, 255], 
            fontStyle: 'bold' 
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: 35 },
            1: { halign: 'center' },
            2: { halign: 'right' }
        }
    });

    // --- 5. FOOTER & TOTAL ---
    const finalY = doc.lastAutoTable.finalY;
    
    doc.setFont("helvetica", "bold");
    doc.text(`GRAND TOTAL: Rs. ${entry.total}`, 75, finalY + 10, { align: "right" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("This is a computer-generated receipt.", 40, finalY + 25, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("THANK YOU FOR YOUR BUSINESS!", 40, finalY + 30, { align: "center" });

    // Save PDF
    doc.save(`Bill_${entry.name}_${entry.date}.pdf`);
}

// --- EDIT FUNCTION ---

/**
 * Function to load data back into the form for editing
 */
async function editHulling(id) {
    // 1. Get the data from the database
    const entry = await db.hulling.get(id);
    if (!entry) return;

    // 2. Fill the entry form at the top with this data
    document.getElementById('h_name').value = entry.name;
    document.getElementById('h_weight').value = entry.weight;
    document.getElementById('h_status').value = entry.status;
    document.getElementById('main_date_picker').value = entry.date;
    
    // Set a default rate if one isn't stored
    document.getElementById('h_rate').value = entry.rate || 150;

    // 3. Scroll user back to the top form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 4. Transform the "Save" button into an "Update" button
    const saveBtn = document.getElementById('btn_save_hulling');
    saveBtn.innerText = "UPDATE RECORD";
    saveBtn.style.background = "#ff9800"; // Orange color for edit mode

    // 5. Change the button's behavior
    saveBtn.onclick = async () => {
        const newWeight = document.getElementById('h_weight').value;
        const newRate = document.getElementById('h_rate').value;
        const kg = Logic.processWeight(newWeight, 'paddy');
        const newTotal = Math.round((kg / 100) * newRate);

        // Update the record in Dexie DB
        await db.hulling.update(id, {
            name: document.getElementById('h_name').value,
            weight: newWeight,
            total: newTotal,
            status: document.getElementById('h_status').value,
            date: document.getElementById('main_date_picker').value
        });

        // Reset everything back to normal
        saveBtn.innerText = "Save & Record";
        saveBtn.style.background = "#2e7d32"; 
        saveBtn.onclick = saveHulling;

        // Clear inputs
        document.getElementById('h_name').value = "";
        document.getElementById('h_weight').value = "";
        
        showToast("Record Updated Successfully!");
        refreshAll();
    };
}
