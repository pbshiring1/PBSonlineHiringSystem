#!/usr/bin/env python3
"""
XGBoost-based Candidate Ranking System
For PBS Engineering Company - Employer Dashboard Integration
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import json
import sys
import warnings
warnings.filterwarnings('ignore')

class XGBoostCandidateRanker:
    def __init__(self):
        self.models = {}  # Store separate models for each trade
        self.scalers = {}  # Store separate scalers for each trade
        self.feature_columns = [
            'age', 'education_score', 'experience_years', 'skill_score'
        ]
        self.feature_weights = {}
        
    def prepare_data(self, data):
        """Prepare and clean data for training/prediction"""
        df = pd.DataFrame(data)
        
        # Handle missing values and convert to numeric
        df['age'] = pd.to_numeric(df.get('age', 30), errors='coerce').fillna(30)
        df['experience_years'] = pd.to_numeric(df.get('experience', 0), errors='coerce').fillna(0)
        df['skill_score'] = pd.to_numeric(df.get('skillScore', 75), errors='coerce').fillna(75)
        
        # Convert education to numeric score
        df['education_score'] = df.get('education', 'bachelor').apply(self.get_education_score)
        
        # Handle trade/position - keep as categorical for grouping
        if 'trade' not in df.columns:
            df['trade'] = df.get('position', 'Unknown')
        df['trade'] = df['trade'].fillna('Unknown').astype(str)
        
        return df
    
    def get_education_score(self, education):
        """Convert education level to numeric score"""
        if pd.isna(education):
            return 70
        
        education = str(education).lower()
        education_map = {
            'phd': 100, 'doctorate': 100, 'doctoral': 100,
            'master': 90, 'masters': 90, 'ms': 90, 'ma': 90,
            'bachelor': 80, 'bachelors': 80, 'bs': 80, 'ba': 80,
            'associate': 65, 'associates': 65,
            'vocational': 50, 'technical': 50, 'certificate': 50, 'diploma': 50,
            'high school': 35, 'secondary': 35, 'elementary': 25
        }
        
        for key, score in education_map.items():
            if key in education:
                return score
        return 70  # Default score
    
    def calculate_target_score(self, df):
        """Calculate target hiring score based on status"""
        target_scores = []
        for _, row in df.iterrows():
            status = str(row.get('status', 'unknown')).lower()
            
            if status in ['hired', 'accepted', 'passed']:
                # High score for hired candidates (80-100)
                base_score = 85
                # Add bonus based on skills and experience
                skill_bonus = (row['skill_score'] - 75) * 0.2
                exp_bonus = min(row['experience_years'] * 2, 10)
                score = min(100, base_score + skill_bonus + exp_bonus)
            elif status in ['rejected', 'failed']:
                # Lower score for rejected candidates (20-70)
                base_score = 45
                # Slight adjustment based on skills
                skill_adjustment = (row['skill_score'] - 75) * 0.1
                score = max(20, min(70, base_score + skill_adjustment))
            else:
                # Neutral score for unknown status
                score = 60 + (row['skill_score'] - 75) * 0.2
            
            target_scores.append(max(0, min(100, score)))
        
        return np.array(target_scores)
    
    def train_model(self, training_data):
        """Train separate XGBoost models for each trade"""
        df = self.prepare_data(training_data)
        
        if len(df) < 5:
            synthetic_data = self.generate_synthetic_data(50)
            df = pd.concat([df, synthetic_data], ignore_index=True)
        
        df['target_score'] = self.calculate_target_score(df)
        
        # Group by trade and train separate models
        trades = df['trade'].unique()
        total_samples = 0
        combined_weights = {}
        
        for trade in trades:
            trade_data = df[df['trade'] == trade]
            
            if len(trade_data) < 3:
                continue  # Skip trades with too little data
            
            # Create model and scaler for this trade
            self.models[trade] = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                objective='reg:squarederror'
            )
            self.scalers[trade] = StandardScaler()
            
            # Prepare features for this trade
            X = trade_data[self.feature_columns]
            y = trade_data['target_score']
            
            # Scale and train
            X_scaled = self.scalers[trade].fit_transform(X)
            self.models[trade].fit(X_scaled, y)
            
            # Accumulate feature importance
            feature_importance = self.models[trade].feature_importances_
            for i, feature in enumerate(self.feature_columns):
                if feature not in combined_weights:
                    combined_weights[feature] = 0
                combined_weights[feature] += feature_importance[i] * len(trade_data)
            
            total_samples += len(trade_data)
        
        # Normalize combined weights
        if total_samples > 0:
            for feature in combined_weights:
                combined_weights[feature] /= total_samples
        
        self.feature_weights = combined_weights
        
        return {
            'training_samples': total_samples,
            'feature_importance': self.feature_weights,
            'trades_trained': list(self.models.keys())
        }
    
    def generate_synthetic_data(self, n_samples=50):
        """Generate synthetic training data"""
        trades = ['Electronics Engineer', 'Network Technician', 'CCTV Technician', 
                 'Electrician', 'Mason', 'Painter', 'Helper', 'Welder', 'Technician']
        educations = ['Elementary', 'High School', 'Vocational/Technical', 'Associate Degree', "Bachelor's Degree", "Master's Degree"]
        
        synthetic_data = []
        for i in range(n_samples):
            # Generate correlated data where better candidates have higher scores
            skill_score = np.random.normal(75, 15)
            experience = np.random.exponential(4)
            age = np.random.normal(30, 8)
            education = np.random.choice(educations)
            
            # Determine status based on overall quality
            quality_score = (skill_score + experience * 5 + self.get_education_score(education)) / 3
            if quality_score > 80:
                status = np.random.choice(['hired', 'hired', 'hired', 'rejected'])
            elif quality_score > 60:
                status = np.random.choice(['hired', 'rejected'])
            else:
                status = np.random.choice(['hired', 'rejected', 'rejected', 'rejected'])
            
            synthetic_data.append({
                'trade': np.random.choice(trades),
                'age': max(18, min(65, age)),
                'education': education,
                'experience': max(0, experience),
                'skillScore': max(0, min(100, skill_score)),
                'status': status
            })
        
        return pd.DataFrame(synthetic_data)
    
    def predict_rankings(self, candidates_data):
        """Predict rankings for candidates using trade-specific models"""
        df = self.prepare_data(candidates_data)
        
        # Group candidates by trade and predict separately
        results = []
        
        for trade in df['trade'].unique():
            trade_candidates = df[df['trade'] == trade]
            
            if trade in self.models:
                # Use trade-specific model
                X = trade_candidates[self.feature_columns]
                X_scaled = self.scalers[trade].transform(X)
                predicted_scores = self.models[trade].predict(X_scaled)
            else:
                # Fallback: use average of all models or simple scoring
                predicted_scores = self._fallback_scoring(trade_candidates)
            
            # Add predictions to results
            for idx, (_, row) in enumerate(trade_candidates.iterrows()):
                original_idx = df.index.get_loc(row.name)
                original_data = candidates_data[original_idx] if original_idx < len(candidates_data) else {}
                
                results.append({
                    'id': original_data.get('id', f'candidate_{original_idx}'),
                    'name': original_data.get('name', 'Unknown'),
                    'position': original_data.get('position', trade),
                    'predicted_score': round(np.clip(predicted_scores[idx], 0, 100), 2),
                    'trade': trade,
                    'age': row['age'],
                    'education': original_data.get('education', 'Unknown'),
                    'experience_years': row['experience_years'],
                    'skill_score': row['skill_score']
                })
        
        # Rank within each trade, then globally
        trade_groups = {}
        for result in results:
            trade = result['trade']
            if trade not in trade_groups:
                trade_groups[trade] = []
            trade_groups[trade].append(result)
        
        # Rank within each trade
        final_results = []
        for trade, candidates in trade_groups.items():
            candidates.sort(key=lambda x: x['predicted_score'], reverse=True)
            for i, candidate in enumerate(candidates):
                candidate['trade_rank'] = i + 1
                candidate['rank'] = i + 1  # Will be updated for global ranking
                final_results.append(candidate)
        
        # Global ranking
        final_results.sort(key=lambda x: x['predicted_score'], reverse=True)
        for i, candidate in enumerate(final_results):
            candidate['rank'] = i + 1
        
        return final_results
    
    def _fallback_scoring(self, candidates):
        """Simple fallback scoring when no trade-specific model exists"""
        scores = []
        for _, row in candidates.iterrows():
            score = (
                (row['age'] / 50) * 0.15 * 100 +
                (row['education_score'] / 100) * 0.25 * 100 +
                (row['experience_years'] / 20) * 0.35 * 100 +
                (row['skill_score'] / 100) * 0.25 * 100
            )
            scores.append(score)
        return np.array(scores)
    
    def get_feature_weights(self):
        """Get feature importance weights"""
        return self.feature_weights

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python xgboost_ranking.py <input_json_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    try:
        # Load data
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        # Check if it's training data or candidate data
        if isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            if 'status' in first_item:
                # Training data
                ranker = XGBoostCandidateRanker()
                training_info = ranker.train_model(data)
                
                result = {
                    'status': 'success',
                    'type': 'training',
                    'training_info': training_info,
                    'feature_weights': ranker.get_feature_weights()
                }
            else:
                # Candidate data - need to load model first
                result = {
                    'status': 'error',
                    'message': 'Model not trained. Please train with labeled data first.'
                }
        else:
            result = {
                'status': 'error',
                'message': 'Invalid data format'
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