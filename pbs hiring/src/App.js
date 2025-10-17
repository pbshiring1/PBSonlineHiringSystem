import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './components/HomePage';
import Login from './components/Login';
import SignUp from './components/SignUp';
import ApplicantDashboard from './components/ApplicantDashboard';
import PreScreening from './components/PreScreening';
import CertificationManagement from './components/CertificationManagement';
import IDVerification from './components/IDVerification';
import ApplicationSuccess from './components/ApplicationSuccess';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminJobBoard from './components/AdminJobBoard';
import EmployerDashboard from './components/EmployerDashboard';


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ApplicantDashboard />
              </ProtectedRoute>
            } />
            <Route path="/pre-screening" element={
              <ProtectedRoute>
                <PreScreening />
              </ProtectedRoute>
            } />
            <Route path="/certification-management" element={
              <ProtectedRoute>
                <CertificationManagement />
              </ProtectedRoute>
            } />
            <Route path="/id-verification" element={
              <ProtectedRoute>
                <IDVerification />
              </ProtectedRoute>
            } />
            <Route path="/application-success" element={
              <ProtectedRoute>
                <ApplicationSuccess />
              </ProtectedRoute>
            } />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-job-board" element={
              <ProtectedRoute requiredRole="admin">
                <AdminJobBoard />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;