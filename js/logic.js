const Logic = {
    // Converts "1.20" or "50" into a standard number
    processWeight: function(val, type) {
        if (!val) return 0;
        if (typeof val === 'string' && val.includes('.')) {
            const parts = val.split('.');
            return (parseInt(parts[0]) * 100) + parseInt(parts[1] || 0);
        }
        return parseFloat(val);
    },

    // Converts total number back into "X Q YY kg"
    formatDisplay: function(totalKg) {
        const isNegative = totalKg < 0;
        const absKg = Math.abs(totalKg);
        const q = Math.floor(absKg / 100);
        const kg = Math.round(absKg % 100);
        return `${isNegative ? '-' : ''}${q} Q ${kg.toString().padStart(2, '0')} kg`;
    }
};
