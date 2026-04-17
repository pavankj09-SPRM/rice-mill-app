const db = new Dexie("RiceMillDB");
db.version(1).stores({
    hulling: '++id, name, date',
    stock: '++id, name, date, type',
    expenses: '++id, name, date',
    settings: '++id, fullName, name, category' // Added fullName for JSON compatibility
});
