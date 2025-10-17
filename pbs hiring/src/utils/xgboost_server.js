const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store trained model state
let modelTrained = false;
let featureWeights = {};

// Temporary directory for data exchange
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// XGBoost training endpoint
app.post('/api/xgboost-train', async (req, res) => {
    try {
        const { trainingData } = req.body;
        
        if (!trainingData || !Array.isArray(trainingData) || trainingData.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid training data provided'
            });
        }
        
        // Create temporary file for training data
        const inputFile = path.join(tempDir, `training_${Date.now()}.json`);
        fs.writeFileSync(inputFile, JSON.stringify(trainingData, null, 2));
        
        // Execute Python XGBoost script
        const pythonScript = path.join(__dirname, 'xgboost_ranking.py');
        const pythonProcess = spawn('python', [pythonScript, inputFile]);
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            // Clean up temporary file
            try {
                fs.unlinkSync(inputFile);
            } catch (e) {
                console.warn('Could not delete temporary file:', e.message);
            }
            
            if (code !== 0) {
                console.error('Python script error:', errorOutput);
                return res.status(500).json({
                    status: 'error',
                    message: `XGBoost training failed: ${errorOutput}`
                });
            }
            
            try {
                const result = JSON.parse(output);
                
                if (result.status === 'success') {
                    modelTrained = true;
                    featureWeights = result.feature_weights || {};
                    
                    res.json({
                        status: 'success',
                        training_info: result.training_info,
                        feature_weights: featureWeights
                    });
                } else {
                    res.status(500).json(result);
                }
            } catch (parseError) {
                console.error('Failed to parse Python output:', parseError);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to parse training results'
                });
            }
        });
        
        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            res.status(500).json({
                status: 'error',
                message: `Failed to start XGBoost training: ${error.message}`
            });
        });
        
    } catch (error) {
        console.error('Training endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// XGBoost prediction endpoint
app.post('/api/xgboost-predict', async (req, res) => {
    try {
        if (!modelTrained) {
            return res.status(400).json({
                status: 'error',
                message: 'Model not trained. Please train the model first.'
            });
        }
        
        const { candidates } = req.body;
        
        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid candidate data provided'
            });
        }
        
        // For now, return correlation-based ranking as XGBoost prediction requires model persistence
        const rankedCandidates = candidates.map((candidate, index) => {
            const age = candidate.age || 30;
            const educationScore = getEducationScore(candidate.education || 'bachelor');
            const experience = candidate.experience || 0;
            const skillScore = candidate.skillScore || 75;
            
            // Use feature weights if available
            const weights = Object.keys(featureWeights).length > 0 ? featureWeights : {
                age: 0.15,
                education_score: 0.25,
                experience_years: 0.35,
                skill_score: 0.25
            };
            
            const score = (
                (age / 50) * (weights.age || 0.15) * 100 +
                (educationScore / 100) * (weights.education_score || 0.25) * 100 +
                (experience / 20) * (weights.experience_years || 0.35) * 100 +
                (skillScore / 100) * (weights.skill_score || 0.25) * 100
            );
            
            return {
                id: candidate.id,
                name: candidate.name,
                position: candidate.position,
                predicted_score: Math.round(score * 10) / 10,
                rank: 0 // Will be set after sorting
            };
        });
        
        // Sort by score and assign ranks
        rankedCandidates.sort((a, b) => b.predicted_score - a.predicted_score);
        rankedCandidates.forEach((candidate, index) => {
            candidate.rank = index + 1;
        });
        
        res.json({
            status: 'success',
            rankings: rankedCandidates
        });
        
    } catch (error) {
        console.error('Prediction endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Helper function to convert education to numeric score
function getEducationScore(education) {
    if (!education) return 70;
    
    const educationMap = {
        'phd': 100, 'doctorate': 100, 'doctoral': 100,
        'master': 90, 'masters': 90, 'ms': 90, 'ma': 90,
        'bachelor': 80, 'bachelors': 80, 'bs': 80, 'ba': 80,
        'associate': 65, 'associates': 65,
        'certificate': 50, 'diploma': 50, 'cert': 50,
        'high school': 35, 'secondary': 35, 'hs': 35
    };
    
    const key = education.toLowerCase();
    for (const [term, score] of Object.entries(educationMap)) {
        if (key.includes(term)) return score;
    }
    return 70;
}

// Get trade-specific feature weights endpoint
app.post('/api/xgboost-weights', (req, res) => {
    try {
        const { trade } = req.body;
        
        if (!modelTrained) {
            return res.status(400).json({
                status: 'error',
                message: 'Model not trained yet'
            });
        }
        
        if (!trade) {
            return res.json({
                status: 'success',
                weights: featureWeights
            });
        }
        
        // Create temporary file for trade-specific weight request
        const inputFile = path.join(tempDir, `weights_${Date.now()}.json`);
        fs.writeFileSync(inputFile, JSON.stringify({ trade, request: 'weights' }));
        
        // Execute Python script to get trade-specific weights
        const pythonScript = path.join(__dirname, 'xgboost_weights.py');
        const pythonProcess = spawn('python', [pythonScript, inputFile]);
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            // Clean up temporary file
            try {
                fs.unlinkSync(inputFile);
            } catch (e) {
                console.warn('Could not delete temporary file:', e.message);
            }
            
            if (code !== 0) {
                console.error('Python weights script error:', errorOutput);
                // Return global weights as fallback
                return res.json({
                    status: 'success',
                    weights: featureWeights,
                    fallback: true
                });
            }
            
            try {
                const result = JSON.parse(output);
                res.json(result);
            } catch (parseError) {
                console.error('Failed to parse weights output:', parseError);
                res.json({
                    status: 'success',
                    weights: featureWeights,
                    fallback: true
                });
            }
        });
        
        pythonProcess.on('error', (error) => {
            console.error('Failed to start weights Python process:', error);
            res.json({
                status: 'success',
                weights: featureWeights,
                fallback: true
            });
        });
        
    } catch (error) {
        console.error('Weights endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        modelTrained,
        featureWeights
    });
});

app.listen(PORT, () => {
    console.log(`XGBoost API server running on port ${PORT}`);
});

module.exports = app;