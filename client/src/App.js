import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/appointments/Appointments';
import AppointmentDetail from './pages/appointments/AppointmentDetail';
import Patients from './pages/patients/Patients';
import PatientDetail from './pages/patients/PatientDetail';
import Billing from './pages/billing/Billing';
import BillDetail from './pages/billing/BillDetail';
import Insurance from './pages/insurance/Insurance';
import InsuranceClaimDetail from './pages/insurance/InsuranceClaimDetail';
import Reports from './pages/reports/Reports';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Appointment Routes */}
                <Route path="appointments" element={<Appointments />} />
                <Route path="appointments/:id" element={<AppointmentDetail />} />
                
                {/* Patient Routes */}
                <Route path="patients" element={<Patients />} />
                <Route path="patients/:id" element={<PatientDetail />} />
                
                {/* Billing Routes */}
                <Route path="billing" element={<Billing />} />
                <Route path="billing/:id" element={<BillDetail />} />
                
                {/* Insurance Routes */}
                <Route path="insurance" element={<Insurance />} />
                <Route path="insurance/:id" element={<InsuranceClaimDetail />} />
                
                {/* Reports Routes */}
                <Route path="reports" element={<Reports />} />
                
                {/* Profile Route */}
                <Route path="profile" element={<Profile />} />
              </Route>
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
