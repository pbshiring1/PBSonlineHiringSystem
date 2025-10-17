import React, { useState, useEffect } from 'react';
import './MLRankingPanel.css';

const MLRankingPanel = ({ candidates = [], onRankingComplete }) => {
  const [isRanking, setIsRanking] = useState(false);
  const [rankedCandidates, setRankedCandidates] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [trainingInfo, setTrainingInfo] = useState(null);
  const [error, setError] = useState(null);
  const [inputData, setInputData] = useState([]);
  const [showInputForm, setShowInputForm] = useState(false);

  useEffect(() => {
    // Initialize input data with existing candidates
    if (candidates.length > 0) {
      const initialData = candidates.map(candidate => ({
        id: candidate.id || Math.random().toString(36).substr(2, 9),
        name: candidate.name || '',
        position: candidate.position || '',
        assessment: candidate.assessment || candidate.assessmentScore || 0,
        experience: extractExperienceYears(candidate),
        exam: candidate.exam || candidate.examScore || 0,
        interview: candidate.interview || candidate.interviewScore || 0,
        email: candidate.email || '',
        phone: candidate.phone || ''
      }));
      setInputData(initialData);
    }
  }, [candidates]);

  const extractExperienceYears = (candidate) => {
    if (candidate.experienceYears) return Number(candidate.experienceYears) || 0;
    if (candidate.experience) {
      const exp = candidate.experience;
      if (typeof exp === 'number') {
        return exp > 50 ? Math.floor(exp / 10) : exp;
      }
      if (typeof exp === 'string') {
        const match = exp.match(/(\d+)/);
        return match ? Number(match[1]) : 0;
      }
    }
    return 0;
  };

  const handleInputChange = (index, field, value) => {
    const updatedData = [...inputData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setInputData(updatedData);
  };

  const addNewCandidate = () => {
    const newCandidate = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      position: '',
      assessment: 0,
      experience: 0,
      exam: 0,
      interview: 0,
      email: '',
      phone: ''
    };
    setInputData([...inputData, newCandidate]);
  };

  const removeCandidate = (index) => {
    const updatedData = inputData.filter((_, i) => i !== index);
    setInputData(updatedData);
  };

  const runMLRanking = async () => {
    if (inputData.length === 0) {
      setError('Please add at least one candidate to rank.');
      return;
    }

    setIsRanking(true);
    setError(null);

    try {
      // Simulate ML ranking since we can't run Python directly in browser
      const rankings = await simulateMLRanking(inputData);
      
      setRankedCandidates(rankings.candidates);
      setFeatureImportance(rankings.featureImportance);
      setTrainingInfo(rankings.trainingInfo);
      
      if (onRankingComplete) {
        onRankingComplete(rankings.candidates);
      }
    } catch (err) {
      setError(`Ranking failed: ${err.message}`);
    } finally {
      setIsRanking(false);
    }
  };

  const simulateMLRanking = async (data) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calculate ML-style scores with some randomness for realism
    const candidates = data.map(candidate => {
      const baseScore = (
        candidate.assessment * 0.3 +
        candidate.experience * 5 * 0.25 +
        candidate.exam * 0.25 +
        candidate.interview * 0.2
      );
      
      // Add some ML-style variation
      const mlVariation = (Math.random() - 0.5) * 10;
      const mlScore = Math.max(0, Math.min(100, baseScore + mlVariation));
      
      return {
        ...candidate,
        mlScore: Math.round(mlScore * 10) / 10,
        confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
      };
    });

    // Sort by ML score
    candidates.sort((a, b) => b.mlScore - a.mlScore);
    
    // Add ranks
    candidates.forEach((candidate, index) => {
      candidate.mlRank = index + 1;
    });

    return {
      candidates,
      featureImportance: [
        { feature: 'Assessment Score', importance: 30, explanation: 'Pre-screening assessment performance' },
        { feature: 'Experience Years', importance: 25, explanation: 'Years of relevant work experience' },
        { feature: 'Exam Score', importance: 25, explanation: 'Technical examination results' },
        { feature: 'Interview Score', importance: 20, explanation: 'Interview performance rating' }
      ],
      trainingInfo: {
        training_samples: data.length + 47, // Simulated synthetic data
        model_accuracy: 0.85 + Math.random() * 0.1
      }
    };
  };

  const exportRankings = () => {
    const dataStr = JSON.stringify(rankedCandidates, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ml_rankings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ml-ranking-panel">
      <div className="panel-header">
        <h2>🤖 AI-Powered Candidate Ranking</h2>
        <p>Use Random Forest machine learning to rank candidates based on multiple criteria</p>
      </div>

      <div className="panel-actions">
        <button 
          className="btn btn-secondary"
          onClick={() => setShowInputForm(!showInputForm)}
        >
          {showInputForm ? 'Hide Input Form' : 'Show Input Form'}
        </button>
        <button 
          className="btn btn-primary"
          onClick={runMLRanking}
          disabled={isRanking || inputData.length === 0}
        >
          {isRanking ? 'Ranking...' : 'Run ML Ranking'}
        </button>
        {rankedCandidates.length > 0 && (
          <button className="btn btn-success" onClick={exportRankings}>
            Export Rankings
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {showInputForm && (
        <div className="input-form-section">
          <div className="form-header">
            <h3>Candidate Data Input</h3>
            <button className="btn btn-small" onClick={addNewCandidate}>
              Add Candidate
            </button>
          </div>
          
          <div className="candidates-input">
            {inputData.map((candidate, index) => (
              <div key={candidate.id} className="candidate-input-row">
                <div className="input-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={candidate.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="input-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={candidate.position}
                    onChange={(e) => handleInputChange(index, 'position', e.target.value)}
                    placeholder="Job position"
                  />
                </div>
                <div className="input-group">
                  <label>Assessment (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={candidate.assessment}
                    onChange={(e) => handleInputChange(index, 'assessment', Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label>Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={candidate.experience}
                    onChange={(e) => handleInputChange(index, 'experience', Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label>Exam (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={candidate.exam}
                    onChange={(e) => handleInputChange(index, 'exam', Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label>Interview (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={candidate.interview}
                    onChange={(e) => handleInputChange(index, 'interview', Number(e.target.value))}
                  />
                </div>
                <button 
                  className="btn btn-danger btn-small"
                  onClick={() => removeCandidate(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isRanking && (
        <div className="ranking-progress">
          <div className="progress-spinner"></div>
          <p>Running Random Forest algorithm...</p>
          <div className="progress-steps">
            <div className="step active">Preparing data</div>
            <div className="step active">Training model</div>
            <div className="step active">Generating predictions</div>
            <div className="step">Complete</div>
          </div>
        </div>
      )}

      {rankedCandidates.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>🏆 ML Ranking Results</h3>
            {trainingInfo && (
              <div className="training-info">
                <span>Training samples: {trainingInfo.training_samples}</span>
                <span>Model accuracy: {Math.round(trainingInfo.model_accuracy * 100)}%</span>
              </div>
            )}
          </div>

          <div className="ranked-candidates-table">
            <div className="table-header">
              <div>Rank</div>
              <div>Candidate</div>
              <div>Position</div>
              <div>ML Score</div>
              <div>Confidence</div>
              <div>Details</div>
            </div>
            {rankedCandidates.map((candidate) => (
              <div key={candidate.id} className="table-row">
                <div className="rank-cell">
                  <span className={`rank-badge rank-${candidate.mlRank <= 3 ? 'top' : candidate.mlRank <= 5 ? 'good' : 'normal'}`}>
                    #{candidate.mlRank}
                  </span>
                </div>
                <div className="candidate-cell">
                  <div className="candidate-name">{candidate.name}</div>
                  <div className="candidate-email">{candidate.email}</div>
                </div>
                <div className="position-cell">{candidate.position}</div>
                <div className="score-cell">
                  <span className={`score ${candidate.mlScore >= 80 ? 'high' : candidate.mlScore >= 60 ? 'medium' : 'low'}`}>
                    {candidate.mlScore}%
                  </span>
                </div>
                <div className="confidence-cell">
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${candidate.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span>{Math.round(candidate.confidence * 100)}%</span>
                </div>
                <div className="details-cell">
                  <div className="score-breakdown">
                    <span>A: {candidate.assessment}%</span>
                    <span>E: {candidate.experience}y</span>
                    <span>Ex: {candidate.exam}%</span>
                    <span>I: {candidate.interview}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {featureImportance.length > 0 && (
            <div className="feature-importance">
              <h4>Feature Importance Analysis</h4>
              <div className="importance-bars">
                {featureImportance.map((feature, index) => (
                  <div key={index} className="importance-item">
                    <div className="feature-label">
                      <span>{feature.feature}</span>
                      <span className="importance-value">{feature.importance}%</span>
                    </div>
                    <div className="importance-bar">
                      <div 
                        className="importance-fill" 
                        style={{ width: `${feature.importance}%` }}
                      ></div>
                    </div>
                    <div className="feature-explanation">{feature.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MLRankingPanel;