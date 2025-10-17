#!/usr/bin/env python3
"""
XGBoost Trade-Specific Feature Weights
Returns feature importance for specific trades/positions
"""

import json
import sys
import os

# Mock trade-specific weights based on typical hiring patterns
TRADE_WEIGHTS = {
    'Electronics Engineer': {
        'age': 0.10,
        'education_score': 0.40,
        'experience_years': 0.35,
        'skill_score': 0.15
    },
    'Network Technician': {
        'age': 0.15,
        'education_score': 0.25,
        'experience_years': 0.40,
        'skill_score': 0.20
    },
    'CCTV Technician': {
        'age': 0.20,
        'education_score': 0.20,
        'experience_years': 0.35,
        'skill_score': 0.25
    },
    'Electrician': {
        'age': 0.15,
        'education_score': 0.20,
        'experience_years': 0.45,
        'skill_score': 0.20
    },
    'Mason': {
        'age': 0.25,
        'education_score': 0.10,
        'experience_years': 0.50,
        'skill_score': 0.15
    },
    'Painter': {
        'age': 0.20,
        'education_score': 0.15,
        'experience_years': 0.45,
        'skill_score': 0.20
    },
    'Helper': {
        'age': 0.30,
        'education_score': 0.10,
        'experience_years': 0.35,
        'skill_score': 0.25
    },
    'Welder': {
        'age': 0.15,
        'education_score': 0.20,
        'experience_years': 0.40,
        'skill_score': 0.25
    },
    'Technician': {
        'age': 0.15,
        'education_score': 0.25,
        'experience_years': 0.35,
        'skill_score': 0.25
    },
    'Electrical Engineer': {
        'age': 0.10,
        'education_score': 0.45,
        'experience_years': 0.30,
        'skill_score': 0.15
    },
    'Pipe Fitter': {
        'age': 0.20,
        'education_score': 0.15,
        'experience_years': 0.45,
        'skill_score': 0.20
    }
}

# Default weights for unknown trades
DEFAULT_WEIGHTS = {
    'age': 0.15,
    'education_score': 0.25,
    'experience_years': 0.35,
    'skill_score': 0.25
}

def get_trade_weights(trade_name):
    """Get feature weights for a specific trade"""
    if not trade_name:
        return DEFAULT_WEIGHTS
    
    # Try exact match first
    if trade_name in TRADE_WEIGHTS:
        return TRADE_WEIGHTS[trade_name]
    
    # Try case-insensitive match
    trade_lower = trade_name.lower()
    for trade, weights in TRADE_WEIGHTS.items():
        if trade.lower() == trade_lower:
            return weights
    
    # Try partial match
    for trade, weights in TRADE_WEIGHTS.items():
        if trade_lower in trade.lower() or trade.lower() in trade_lower:
            return weights
    
    return DEFAULT_WEIGHTS

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'status': 'error',
            'message': 'Usage: python xgboost_weights.py <input_json_file>'
        }))
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    try:
        # Load request data
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        trade = data.get('trade', '')
        weights = get_trade_weights(trade)
        
        result = {
            'status': 'success',
            'trade': trade,
            'weights': weights
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'status': 'error',
            'message': str(e)
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()