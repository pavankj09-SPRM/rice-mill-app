/**
 * js/app.js - Full Integrated Logic
 */

// --- 1. CORE FUNCTIONS ---

async function saveStock() {
    const name = document.getElementById('st_name').value.trim();
    const weightVal = document.getElementById('st_weight').value;
    const type = document.getElementById('st_type').value;
    const action = document.getElementById('st_action').value;
    const date = document.getElementById('main_date_picker').value;

    if (!weightVal) return alert("Enter Weight");

    // Save Primary Action
    await db.stock.add({
        name: name || "Internal Process",
        action: action,
        type: type,
        weight: weightVal,
        amount: parseFloat(document.getElementById('st_amount').value) || 0,
        date: date
    });

    // SELF-HULLING LOGIC: If selling/processing PADDY, create RICE & HUSK
    if (action === "Sale" && type.toLowerCase().includes("paddy")) {
        const kg = Logic.processWeight(weightVal);
        const riceWeight = (kg * 0.65) / 100;
        const huskWeight = (kg * 0.25) / 100;

        await db.stock.bulkAdd([
            { name: "System", action: "Purchase", type: "Common Rice", weight: riceWeight.toFixed(2), date: date },
            { name: "System", action: "Purchase", type: "Husk Waste", weight: huskWeight.toFixed(2), date: date }
        ]);
        showToast("Stock Updated: Paddy converted to Rice/Husk");
    }

    document.getElementById('st_weight').value = "";
    refreshAll();
}

async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const h = await db.hulling.where('date').equals(d).toArray();
    
    let html = "";
    h.forEach(x => {
        html += `<div class="log-card" style="border-left-color: #ff9800">
            <div><b>${x.name}</b><br><small>${Logic.formatDisplay(Logic.processWeight(x.weight))}</small></div>
            <div class="log-actions">
                <button class="btn-sm" style="background:#ff9800" onclick="editHulling(${x.id})">✏️</button>
                <button class="btn-sm" style="background:#2e7d32" onclick="printSingleBill(${x.id})">📄 Bill</button>
                <button class="btn-sm" style="background:#c62828" onclick="deleteEntry('hulling', ${x.id})">✕</button>
            </div>
        </div>`;
    });
    document.getElementById('day_log').innerHTML = html || "No entries today.";
}

// --- 2. EDIT & TAB SWITCHING ---

async function editHulling(id) {
    const entry = await db.hulling.get(id);
    if (!entry) return;

    // Force Tab Switch
    document.querySelectorAll('.tab-content, .nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('hulling').classList.add('active');
    const navBtn = document.querySelector('[data-tab="hulling"]');
    if (navBtn) navBtn.classList.add('active');

    // Fill Form
    document.getElementById('h_name').value = entry.name;
    document.getElementById('h_weight').value = entry.weight;
    document.getElementById('h_status').value = entry.status;
    document.getElementById('h_rate').value = entry.rate || 150;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const saveBtn = document.getElementById('btn_save_hulling');
    saveBtn.innerText = "UPDATE RECORD";
    saveBtn.style.background = "#ff9800";

    saveBtn.onclick = async () => {
        const kg = Logic.processWeight(document.getElementById('h_weight').value);
        const rate = document.getElementById('h_rate').value;
        await db.hulling.update(id, {
            name: document.getElementById('h_name').value,
            weight: document.getElementById('h_weight').value,
            total: Math.round((kg/100)*rate),
            status: document.getElementById('h_status').value
        });
        saveBtn.innerText = "Save & Record";
        saveBtn.style.background = "";
        saveBtn.onclick = saveHulling;
        refreshAll();
        document.querySelector('[data-tab="history"]').click();
    };
}

// --- 3. INVENTORY SUMMARY (With Empty Bags Fix) ---

async function generateSummary() {
    const dStr = document.getElementById('main_date_picker').value;
    const filter = currentSummaryView === 'month' ? dStr.substring(0, 7) : dStr.substring(0, 4);
    const allStock = await db.stock.toArray();
    const filtered = allStock.filter(x => x.date.startsWith(filter));
    
    const inventory = {};
    filtered.forEach(item => {
        if (!inventory[item.type]) inventory[item.type] = 0;
        const w = Logic.processWeight(item.weight);
        const action = item.action.toLowerCase();
        inventory[item.type] += (action === 'purchase' || action === 'inward') ? w : -w;
    });

    let html = `<table class="summary-table"><thead><tr><th>Variety</th><th>Net Stock</th></tr></thead><tbody>`;
    Object.keys(inventory).forEach(key => {
        const val = inventory[key];
        const display = key.toLowerCase().includes("bag") ? `${val} Pcs` : Logic.formatDisplay(val);
        html += `<tr><td><b>${key}</b></td><td style="color:${val < 0 ? 'red':'green'}">${display}</td></tr>`;
    });
    document.getElementById('summary_display').innerHTML = html + "</tbody></table>";
}

// --- 4. PROFESSIONAL BILL PDF ---

async function printSingleBill(id) {
    const entry = await db.hulling.get(id);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 160] });

    doc.rect(2, 2, 76, 156); // Border
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("SHRI PARSHWANATHA RICE MILL", 40, 12, { align: "center" });
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Prop: Jwalaprasad K J | Sullalli, Sagar", 40, 18, { align: "center" });
    doc.line(5, 22, 75, 22);

    doc.text(`Date: ${entry.date}`, 8, 30);
    doc.text(`Customer: ${entry.name}`, 8, 35);
    
    doc.autoTable({
        startY: 40,
        head: [['Description', 'Qty', 'Total']],
        body: [['Paddy Hulling', Logic.formatDisplay(Logic.processWeight(entry.weight)), `Rs.${entry.total}`]],
        theme: 'grid', styles: { fontSize: 8 }
    });

    doc.text("THANK YOU!", 40, doc.lastAutoTable.finalY + 15, { align: "center" });
    doc.save(`Bill_${entry.name}.pdf`);
}
