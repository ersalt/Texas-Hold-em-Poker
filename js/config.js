// AI Configuration and Difficulty Parameters

const GAME_CONFIG = {
    BLIND_LEVELS: {
        "1": { sb: 50, bb: 100, ai_stack: 8000, user_stack: 10000, name: "beginner" },
        "2": { sb: 500, bb: 1000, ai_stack: 100000, user_stack: 100000, name: "intermediate" },
        "3": { sb: 5000, bb: 10000, ai_stack: 1000000, user_stack: 1000000, name: "master" }
    },
    
    BASE_PARAMS: {
        "T0": {
            vpip: 0.45, pfr: 0.15, three_bet: 0.05, bluff: 0.08,
            error_rate: 0.30, playable_range: 0.55
        },
        "T1": {
            vpip: 0.30, pfr: 0.22, three_bet: 0.12, bluff: 0.18,
            error_rate: 0.10, playable_range: 0.40
        },
        "T2": {
            vpip: 0.22, pfr: 0.28, three_bet: 0.20, bluff: 0.28,
            error_rate: 0.03, playable_range: 0.30
        }
    },

    LEVEL_COEFFICIENTS: {
        "beginner": 0.70,
        "intermediate": 1.00,
        "master": 1.30
    }
};

// Helper Functions for Difficulty Calculation

function calculateCrushProtection(userCurrent, userInitial) {
    const ratio = userCurrent / userInitial;
    if (ratio < 0.30) return 0.70; // Reduce difficulty
    if (ratio > 2.00) return 1.20; // Increase difficulty
    return 1.00;
}

function calculateDynamicParams(baseLevel, tableLevelName, currentStack, bigBlind, crushProtection) {
    const base = GAME_CONFIG.BASE_PARAMS[baseLevel];
    const bbDepth = currentStack / bigBlind;
    
    // Stack Coefficient
    const stackCoeff = Math.min(Math.max(1.0 + (bbDepth - 80) * 0.008, 0.6), 1.4);
    
    // Level Coefficient
    const levelCoeff = GAME_CONFIG.LEVEL_COEFFICIENTS[tableLevelName];
    
    // Total Coefficient
    const totalCoeff = levelCoeff * stackCoeff * crushProtection;
    
    return {
        vpip: Math.min(Math.max(base.vpip * (0.8 + totalCoeff * 0.2), 0.20), 0.60),
        pfr: Math.min(Math.max(base.pfr * (0.7 + totalCoeff * 0.3), 0.10), 0.40),
        three_bet: Math.min(Math.max(base.three_bet * totalCoeff, 0.03), 0.35),
        bluff: Math.min(Math.max(base.bluff * totalCoeff, 0.05), 0.40),
        error_rate: Math.min(Math.max(base.error_rate / totalCoeff, 0.02), 0.50),
        playable_range: Math.min(Math.max(base.playable_range * (0.9 + stackCoeff * 0.1), 0.25), 0.65),
        is_short_stack: bbDepth < 20
    };
}
