from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import json

app = Flask(__name__)
CORS(app)

# Global variables to store models and data
models = {}
feature_importance = {}
training_data = None

@app.route('/api/train-xgboost', methods=['POST'])
def train_xgboost():
    global models, feature_importance, training_data
    
    try:
        data = request.json
        csv_data = data.get('training_data', [])
        
        if not csv_data:
            return jsonify({'status': 'error', 'message': 'No training data provided'})
        
        # Convert to DataFrame
        df = pd.DataFrame(csv_data)
        training_data = df
        
        # Group by trade/job
        trades = df['trade'].unique()
        
        for trade in trades:
            trade_data = df[df['trade'] == trade].copy()
            
            if len(trade_data) < 2:
                continue
                
            # Prepare features
            X = trade_data[['age', 'experience', 'skillScore']].copy()
            
            # Convert education to numeric
            education_map = {
                'elementary': 1, 'high school': 2, 'senior high school': 3,
                'vocational': 4, 'college': 5, "bachelor's degree": 6,
                "master's degree": 7, 'doctorate': 8
            }
            
            X['education_numeric'] = trade_data['education'].str.lower().map(education_map).fillna(2)
            
            # Prepare target
            y = (trade_data['status'] == 'hired').astype(int)
            
            # Train XGBoost model
            model = XGBClassifier(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.1,
                random_state=42
            )
            
            model.fit(X, y)
            
            # Store model and feature importance
            models[trade] = model
            feature_importance[trade] = {
                'age': float(model.feature_importances_[0]),
                'experience_years': float(model.feature_importances_[1]), 
                'exam_score': float(model.feature_importances_[2]),
                'education_level': float(model.feature_importances_[3])
            }
        
        return jsonify({
            'status': 'success',
            'message': f'Trained models for {len(models)} trades',
            'trades': list(models.keys())
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/xgboost-weights', methods=['POST'])
def get_weights():
    global feature_importance
    
    try:
        data = request.json
        trade = data.get('trade', 'general')
        
        if trade in feature_importance:
            weights = feature_importance[trade]
        else:
            # Return average weights if specific trade not found
            if feature_importance:
                avg_weights = {}
                for key in ['age', 'experience_years', 'exam_score', 'education_level']:
                    avg_weights[key] = np.mean([w.get(key, 0.25) for w in feature_importance.values()])
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
    global models
    
    try:
        data = request.json
        applicants = data.get('applicants', [])
        
        results = []
        
        for applicant in applicants:
            trade = applicant.get('position', '').lower()
            
            # Find matching model
            model = None
            for model_trade in models:
                if trade in model_trade.lower() or model_trade.lower() in trade:
                    model = models[model_trade]
                    break
            
            if model is None and models:
                # Use first available model as fallback
                model = list(models.values())[0]
            
            if model:
                # Prepare features
                features = np.array([[
                    applicant.get('age', 25),
                    applicant.get('experience', 0),
                    applicant.get('exam_score', 0),
                    applicant.get('education_score', 2)
                ]])
                
                # Predict probability
                prob = model.predict_proba(features)[0][1]
                score = min(100, max(20, prob * 100))
                
                results.append({
                    'id': applicant.get('id'),
                    'score': round(score, 1)
                })
            else:
                # Fallback calculation
                score = (applicant.get('age', 25) * 0.2 + 
                        applicant.get('experience', 0) * 2 + 
                        applicant.get('exam_score', 0) * 0.6 + 
                        applicant.get('education_score', 2) * 5)
                
                results.append({
                    'id': applicant.get('id'),
                    'score': min(100, max(20, score))
                })
        
        return jsonify({
            'status': 'success',
            'predictions': results
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=3001)