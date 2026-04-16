const db = new Dexie("MillDB_Enterprise_V1");
db.version(1).stores({
    hulling: '++id, date, name, weight, total, status',
    stock: '++id, date, name, action, type, weight, amount',
    expenses: '++id, date, name, type, amount',
    settings: '++id, fullName, category' 
});
