from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import math

app = Flask(__name__)
CORS(app)

# Global variables to store models and data
training_data = []
feature_weights = {}

def calculate_feature_importance(trade_data):
    """Calculate feature importance using correlation analysis"""
    if not trade_data:
        return {'age': 0.25, 'experience_years': 0.25, 'exam_score': 0.25, 'education_level': 0.25}
    
    correlations = {'age': 0, 'education': 0, 'experience': 0, 'skill': 0}
    
    for sample in trade_data:
        target = 1 if sample.get('status', '').lower() in ['hired', 'accepted'] else 0
        
        # Calculate correlations
        age_norm = sample.get('age', 25) / 100
        edu_score = get_education_score(sample.get('education', 'high school')) / 8
        exp_norm = sample.get('experience', 0) / 20
        skill_norm = sample.get('skillScore', 0) / 100
        
        correlations['age'] += abs(target - age_norm) * target
        correlations['education'] += abs(target - edu_score) * target
        correlations['experience'] += abs(target - exp_norm) * target
        correlations['skill'] += abs(target - skill_norm) * target
    
    # Normalize correlations
    total_corr = sum(correlations.values())
    if total_corr > 0:
        weights = {
            'age': correlations['age'] / total_corr,
            'experience_years': correlations['experience'] / total_corr,
            'exam_score': correlations['skill'] / total_corr,
            'education_level': correlations['education'] / total_corr
        }
    else:
        weights = {'age': 0.25, 'experience_years': 0.25, 'exam_score': 0.25, 'education_level': 0.25}
    
    # Normalize to sum to 1
    total_weight = sum(weights.values())
    if total_weight > 0:
        for key in weights:
            weights[key] = weights[key] / total_weight
    
    return weights

def get_education_score(education):
    """Convert education to numeric score"""
    education_map = {
        'elementary': 1, 'high school': 2, 'senior high school': 3,
        'vocational': 4, 'college': 5, "bachelor's degree": 6,
        "master's degree": 7, 'doctorate': 8
    }
    
    if not education:
        return 2
    
    education_lower = education.lower().strip()
    
    # Direct match
    if education_lower in education_map:
        return education_map[education_lower]
    
    # Partial matches
    if 'elementary' in education_lower:
        return 1
    if 'high school' in education_lower or 'secondary' in education_lower:
        return 2
    if 'senior high' in education_lower:
        return 3
    if 'vocational' in education_lower or 'technical' in education_lower:
        return 4
    if 'college' in education_lower and 'bachelor' not in education_lower:
        return 5
    if 'bachelor' in education_lower:
        return 6
    if 'master' in education_lower:
        return 7
    if 'doctorate' in education_lower or 'phd' in education_lower:
        return 8
    
    return 2  # Default to high school

@app.route('/api/train-xgboost', methods=['POST'])
def train_xgboost():
    global training_data, feature_weights
    
    try:
        data = request.json
        csv_data = data.get('training_data', [])
        
        if not csv_data:
            return jsonify({'status': 'error', 'message': 'No training data provided'})
        
        training_data = csv_data
        
        # Group by trade
        trade_groups = {}
        for sample in csv_data:
            trade = sample.get('trade', 'general')
            if trade not in trade_groups:
                trade_groups[trade] = []
            trade_groups[trade].append(sample)
        
        # Calculate feature importance for each trade
        for trade, trade_data in trade_groups.items():
            feature_weights[trade] = calculate_feature_importance(trade_data)
        
        return jsonify({
            'status': 'success',
            'message': f'Trained models for {len(trade_groups)} trades',
            'trades': list(trade_groups.keys())
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/xgboost-weights', methods=['POST'])
def get_weights():
    global feature_weights
    
    try:
        data = request.json
        trade = data.get('trade', 'general')
        
        if trade in feature_weights:
            weights = feature_weights[trade]
        else:
            # Return average weights if specific trade not found
            if feature_weights:
                avg_weights = {}
                for key in ['age', 'experience_years', 'exam_score', 'education_level']:
                    values = [w.get(key, 0.25) for w in feature_weights.values()]
                    avg_weights[key] = sum(values) / len(values) if values else 0.25
                weights = avg_weights
            else:
                weights = {
                    'age': 0.25,
                    'experience_years': 0.25,
                    'exam_score': 0.25,
                    'education_level': 0.25
                }
        
        return jsonify({
            'status': 'success',
            'weights': weights,
            'trade': trade
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/predict-score', methods=['POST'])
def predict_score():
    global feature_weights
    
    try:
        data = request.json
        applicants = data.get('applicants', [])
        
        results = []
        
        for applicant in applicants:
            position = applicant.get('position', '').lower()
            
            # Find matching trade weights
            weights = None
            for trade in feature_weights:
                if position in trade.lower() or trade.lower() in position:
                    weights = feature_weights[trade]
                    break
            
            # Use average weights if no specific trade found
            if weights is None and feature_weights:
                avg_weights = {}
                for key in ['age', 'experience_years', 'exam_score', 'education_level']:
                    values = [w.get(key, 0.25) for w in feature_weights.values()]
                    avg_weights[key] = sum(values) / len(values) if values else 0.25
                weights = avg_weights
            elif weights is None:
                weights = {'age': 0.25, 'experience_years': 0.25, 'exam_score': 0.25, 'education_level': 0.25}
            
            # Calculate weighted score
            age = applicant.get('age', 25)
            experience = applicant.get('experience', 0)
            exam_score = applicant.get('exam_score', 0)
            education_score = applicant.get('education_score', 2)
            
            # Weighted calculation
            score = (
                age * weights.get('age', 0.25) +
                experience * 2 * weights.get('experience_years', 0.25) +
                exam_score * weights.get('exam_score', 0.25) +
                education_score * 10 * weights.get('education_level', 0.25)
            )
            
            # Normalize to 0-100 range
            final_score = max(20, min(100, score))
            
            results.append({
                'id': applicant.get('id'),
                'score': round(final_score, 1)
            })
        
        return jsonify({
            'status': 'success',
            'predictions': results
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'XGBoost API is running'})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 3002))
    app.run(debug=False, host='0.0.0.0', port=port)
