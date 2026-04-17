const db = new Dexie("RiceMillDB");
db.version(1).stores({
    hulling: '++id, name, date',
    stock: '++id, name, date, type',
    expenses: '++id, name, date',
    settings: 'name, category' // Add this table for your Varieties
});
