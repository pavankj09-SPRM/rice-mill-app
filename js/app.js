// --- CORE UI INITIALIZATION ---
window.onload = () => {
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('main_date_picker').value = today;
    refreshAll();
};

async function refreshAll() {
    try {
        await viewDayLog();
        await generateSummary();
    } catch (e) {
        console.error("Refresh Error:", e);
    }
}

// --- TAB SWITCHING ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-content, .nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        btn.classList.add('active');
    };
});

// --- STOCK LOGIC (PADDY TO RICE) ---
async function saveStock() {
    const name = document.getElementById('st_name').value || "Self Process";
    const weightVal = document.getElementById('st_weight').value;
    const type = document.getElementById('st_type').value;
    const action = document.getElementById('st_action').value;
    const date = document.getElementById('main_date_picker').value;

    if (!weightVal) return alert("Enter Weight");

    await db.stock.add({
        name, action, type, weight: weightVal,
        amount: parseFloat(document.getElementById('st_amount').value) || 0,
        date
    });

    // Auto-convert Paddy to Rice/Husk
    if (action === "Sale" && type.toLowerCase().includes("paddy")) {
        const kg = Logic.processWeight(weightVal);
        await db.stock.bulkAdd([
            { name: "System", action: "Purchase", type: "Common Rice", weight: (kg * 0.65 / 100).toFixed(2), date },
            { name: "System", action: "Purchase", type: "Husk Waste", weight: (kg * 0.25 / 100).toFixed(2), date }
        ]);
    }
    document.getElementById('st_weight').value = "";
    refreshAll();
}

// --- HULLING & HISTORY ---
async function viewDayLog() {
    const d = document.getElementById('main_date_picker').value;
    const data = await db.hulling.where('date').equals(d).toArray();
    let html = "";
    data.forEach(x => {
        html += `
        <div class="log-card" style="border-left: 5px solid #ff9800; margin-bottom:10px; padding:10px; background:#fff; display:flex; justify-content:space-between;">
            <div><b>${x.name}</b><br>${Logic.formatDisplay(Logic.processWeight(x.weight))}</div>
            <div>
                <button onclick="editHulling(${x.id})" style="background:#ff9800; color:#fff; border:none; padding:5px 10px; border-radius:4px;">✏️</button>
                <button onclick="printSingleBill(${x.id})" style="background:#2e7d32; color:#fff; border:none; padding:5px 10px; border-radius:4px;">📄</button>
            </div>
        </div>`;
    });
    document.getElementById('day_log').innerHTML = html || "No entries.";
}

// --- SUMMARY ---
async function generateSummary() {
    const all = await db.stock.toArray();
    const inventory = {};
    all.forEach(item => {
        if (!inventory[item.type]) inventory[item.type] = 0;
        const w = Logic.processWeight(item.weight);
        inventory[item.type] += (item.action === 'Purchase' || item.action === 'Inward') ? w : -w;
    });

    let html = "<table style='width:100%'><tr><th>Variety</th><th>Stock</th></tr>";
    Object.keys(inventory).forEach(k => {
        const display = k.toLowerCase().includes("bag") ? `${inventory[k]} Pcs` : Logic.formatDisplay(inventory[k]);
        html += `<tr><td>${k}</td><td><b>${display}</b></td></tr>`;
    });
    document.getElementById('summary_display').innerHTML = html + "</table>";
}

// --- PRINTING ---
async function printSingleBill(id) {
    const entry = await db.hulling.get(id);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.text("SHRI PARSHWANATHA RICE MILL", 40, 10, { align: "center" });
    doc.text(`Customer: ${entry.name}`, 10, 20);
    doc.text(`Total: Rs. ${entry.total}`, 10, 30);
    doc.save(`Bill_${entry.name}.pdf`);
}
