# XGBoost Integration Setup Guide

This guide explains how to set up and use the XGBoost-based candidate ranking system in the PBS Hiring Dashboard.

## Prerequisites

### Python Dependencies
1. Install Python 3.8 or higher
2. Install required Python packages:
```bash
pip install -r requirements.txt
```

### Node.js Dependencies
1. Install Node.js dependencies:
```bash
npm install
```

## Running the Application

### Option 1: Run with XGBoost Integration (Recommended)
```bash
npm run start-with-xgboost
```
This starts both the React app (port 3000) and XGBoost API server (port 3001).

### Option 2: Run Components Separately
Terminal 1 - Start XGBoost API server:
```bash
npm run xgboost-server
```

Terminal 2 - Start React app:
```bash
npm start
```

## Using XGBoost Ranking

### 1. Load Training Data
1. Click "Load CSV" button in the Ranked Candidates section
2. Upload a CSV file with the following format:
```csv
Trade,Age,Educational Attainment,Years Of Experience,Skill Score,Status
Electronics Engineer,28,Bachelor,5,85,hired
Network Technician,32,Associate,8,92,hired
Electrician,25,Certificate,3,78,rejected
CCTV Technician,30,Bachelor,6,88,hired
Mason,35,High School,12,65,rejected
```

### 2. Train XGBoost Model
1. After loading training data, click "Run XGBoost" button
2. The system will train an XGBoost model using your data
3. Feature weights will be calculated based on correlation with hiring outcomes

### 3. View Rankings
- Candidates will be automatically ranked using the trained model
- Click "Check Weights" to see feature importance
- Rankings update in real-time as new applicants are added

## Features

### XGBoost Model
- **Algorithm**: Gradient Boosting with XGBoost
- **Features**: Age, Education Score, Experience Years, Skill Score
- **Target**: Hiring probability based on historical outcomes

### Feature Weights
The system calculates feature importance based on:
- Correlation with hiring outcomes
- XGBoost feature importance scores
- Historical performance data

### Fallback System
If XGBoost training fails, the system uses correlation-based ranking:
- Analyzes differences between hired vs rejected candidates
- Calculates feature weights based on statistical significance
- Provides consistent ranking even without ML model

## CSV Data Format

### Required Columns
- **Trade/Position**: Job position or trade
- **Age**: Candidate age (numeric)
- **Educational Attainment**: Education level (text)
- **Years Of Experience**: Work experience (numeric)
- **Skill Score**: Assessment or skill score (0-100)
- **Status**: Hiring outcome ('hired', 'rejected', 'passed', 'failed')

### Education Mapping
- PhD/Doctorate: 100 points
- Master's: 90 points
- Bachelor's: 80 points
- Associate: 65 points
- Certificate/Diploma: 50 points
- High School: 35 points

## API Endpoints

### Training
```
POST /api/xgboost-train
Body: { "trainingData": [...] }
```

### Prediction
```
POST /api/xgboost-predict
Body: { "candidates": [...] }
```

### Health Check
```
GET /api/health
```

## Troubleshooting

### Python Issues
- Ensure Python is in PATH
- Install XGBoost: `pip install xgboost`
- Check Python version: `python --version`

### API Connection Issues
- Verify XGBoost server is running on port 3001
- Check for CORS errors in browser console
- Ensure no firewall blocking local connections

### Training Data Issues
- Verify CSV format matches expected structure
- Ensure 'Status' column contains 'hired'/'rejected' values
- Check for missing or invalid numeric values

## Performance Tips

1. **Training Data Size**: Use at least 20-50 samples for better model performance
2. **Feature Quality**: Ensure accurate and complete candidate data
3. **Regular Retraining**: Update model with new hiring outcomes
4. **Data Balance**: Include both hired and rejected candidates in training data

## Integration Notes

- XGBoost model persists only during server session
- Feature weights are recalculated with each training
- Correlation fallback ensures system always provides rankings
- Real-time updates when new applicants are added to Firebase