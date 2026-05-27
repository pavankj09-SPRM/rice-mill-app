/**
 * js/db.js - IndexedDB Object Schema Engine
 */

const db = new Dexie("ParshwanathaRiceMillDB");

db.version(2).stores({
    settings: '$$id, name, fullName, category',
    hulling: '$$id, name, weight, rate, total, status, date',
    stock: '$$id, name, action, type, paddySize, weight, bags, bagWeight, rate, amount, date',
    expenses: '$$id, category, name, amount, date',
    logistics: '$$id, vehicleType, vehicleNo, partyName, bags, netWeight, notes, date'
});

db.open().catch(err => {
    console.error("Failed to unlock local client-side structural memory store:", err);
});
