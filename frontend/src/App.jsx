import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios'; // 🌟 Inimport si Axios para sa Interceptor
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Signup from './pages/Signup';

import InventoryDashboard from './components/InventoryDashboard';
import AdminDashboard from './components/AdminDashboard';  

// =========================================================================
// 🌟 AXIOS INTERCEPTOR: Awtomatikong nagkakabit ng Susi (Token) sa lahat ng API Calls
// =========================================================================
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // I-inject ang token sa header
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =========================================================================
// 🌟 PROTECTED ROUTE GUARD: Harang sa mga visually restricted pages
// =========================================================================
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const systemRole = localStorage.getItem("SystemRole");

  // 1. Kung walang token, pabalikin sa login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Role Protection: Kung may setting na allowedRoles pero hindi pasok ang user, ibalik sa dashboard
  if (allowedRoles && !allowedRoles.includes(systemRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 PUBLIC PAGES (Kahit sino pwedeng pumasok) */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />

        {/* 🔒 PROTECTED PAGES (Kailangan ng active Redis session at tamang Token) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute allowedRoles={["Inventory", "Admin"]}>
              <InventoryDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;