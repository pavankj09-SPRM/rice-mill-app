const Logic = {
    /**
     * Converts the user input into a pure KG number.
     * Example: "1.14" -> 114
     * Example: "14" -> 14
     */
    processWeight: function(val) {
        if (!val) return 0;
        const s = val.toString();
        
        if (s.includes('.')) {
            const parts = s.split('.');
            const q = parseInt(parts[0]) || 0;
            let kg = parseInt(parts[1]) || 0;
            
            // Handle cases like .5 (should be 50kg) vs .05 (should be 5kg)
            if (parts[1].length === 1) kg = kg * 10; 
            
            return (q * 100) + kg;
        }
        
        // If no dot, treat the whole number as KG
        return parseFloat(s);
    },

    /**
     * Formats pure KG back into a readable string.
     * Example: 114 -> "1 Q 14 kg"
     */
    formatDisplay: function(totalKg) {
        const isNegative = totalKg < 0;
        const absKg = Math.round(Math.abs(totalKg));
        
        const q = Math.floor(absKg / 100);
        const kg = absKg % 100;
        
        return `${isNegative ? '-' : ''}${q} Q ${kg.toString().padStart(2, '0')} kg`;
    }
};
