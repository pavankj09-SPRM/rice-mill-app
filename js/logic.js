const Logic = {
    // Handles Quintal.Kg format
    processWeight(val, type) {
        let n = parseFloat(val) || 0;
        let t = (type || '').toLowerCase();
        if(t.includes('paddy') || t.includes('husk')) {
            let q = Math.floor(n), k = Math.round((n - q) * 100);
            return (q * 100) + k;
        }
        return n.toString().includes('.') ? (Math.floor(n)*100 + Math.round((n - Math.floor(n))*100)) : n;
    },

    formatDisplay(kg) {
        let q = Math.floor(Math.abs(kg)/100), k = Math.round(Math.abs(kg)%100); 
        let sign = kg < 0 ? '-' : '';
        return `${sign}${q}.${k < 10 ? '0'+k : k} Q`; 
    }
};
