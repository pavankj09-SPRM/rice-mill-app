/**
 * js/logic.js - Math and Formatting for Parshwanatha Rice Mill
 */
const Logic = {
    // Converts "1.25" to 125 (kg) or "25" to 25 (kg)
    processWeight: function(val) {
        if (!val) return 0;
        const s = val.toString().trim();
        
        if (s.includes('.')) {
            const parts = s.split('.');
            const q = parseInt(parts[0]) || 0;
            let kgStr = parts[1] || "0";
            
            // Fix: handle .5 as 50, .05 as 5
            if (kgStr.length === 1) kgStr += "0"; 
            const kg = parseInt(kgStr.substring(0, 2));
            
            return (q * 100) + kg;
        }
        // If no dot, treat as pure kg
        return parseFloat(s) || 0;
    },

    // Converts 125 back to "1 Q 25 kg"
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
