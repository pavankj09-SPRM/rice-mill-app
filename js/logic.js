/**
 * js/logic.js - Handles Weight Conversions & Formatting
 */
const Logic = {
    processWeight: function(val) {
        if (!val) return 0;
        const s = val.toString().trim();
        
        if (s.includes('.')) {
            const parts = s.split('.');
            const q = parseInt(parts[0]) || 0;
            let kgString = parts[1] || "0";
            
            // Handle .5 as 50kg, .05 as 5kg
            if (kgString.length === 1) kgString += "0"; 
            const kg = parseInt(kgString.substring(0, 2));
            
            return (q * 100) + kg;
        }
        return parseFloat(s);
    },

    formatDisplay: function(totalKg) {
        const roundedKg = Math.round(totalKg); 
        if (roundedKg === 0) return "0 Q 00 kg";

        const isNegative = roundedKg < 0;
        const absKg = Math.abs(roundedKg);
        
        const q = Math.floor(absKg / 100);
        const kg = absKg % 100;
        
        return `${isNegative ? '-' : ''}${q} Q ${kg.toString().padStart(2, '0')} kg`;
    }
};
