/**
 * js/db.js - Local Data Architecture IndexedDB Manager
 */

// Initialize our local browser database storage frame
const db = new Dexie("ParshwanathaRiceMillDB");

// Keep schema version structure linked safely with all core attributes
db.version(3).stores({
    settings: '$$id, name, fullName, category',
    hulling: '$$id, name, weight, rate, total, status, date',
    stock: '$$id, name, action, type, paddySize, weight, bags, bagWeight, rate, amount, date',
    expenses: '$$id, category, name, amount, date',
    logistics: '$$id, vehicleType, vehicleNo, partyName, driverName, paddySize, bags, netWeight, notes, date'
});

// Securely unlock database access routes
db.open().catch(err => {
    console.error("IndexedDB Architecture Initialisation Fault:", err);
});
