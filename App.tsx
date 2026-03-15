
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { Shop } from './types';
import LandingPage from './components/LandingPage';
import ShopOwnerDashboard from './components/ShopOwnerDashboard';
import StudentPortal from './components/StudentPortal';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import { db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore is offline. Check your configuration.");
        }
      }
    };
    testConnection();
  }, []);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  
  return <>{children}</>;
};

const StudentRoute: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const { addJob, getShopById } = useShop();
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    if (shopId) {
      getShopById(shopId).then(setShop);
    }
  }, [shopId, getShopById]);

  if (!shopId) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header view="student" shopName={shop?.name} />
      <main className="flex-grow container mx-auto px-4 py-6 md:py-10">
        <StudentPortal onJobCreated={addJob} shopId={shopId} />
      </main>
    </div>
  );
};

const DashboardRoute: React.FC = () => {
  const { jobs, updateJobStatus, removeJob } = useShop();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header view="owner" onLogout={logout} />
      <main className="flex-grow container mx-auto px-4 py-6 md:py-10">
        <ShopOwnerDashboard 
          jobs={jobs.filter(j => j.shopId === user?.shopId)} 
          onUpdateStatus={updateJobStatus} 
          onRemoveJob={removeJob}
        />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ShopProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardRoute />
                  </ProtectedRoute>
                } 
              />
              <Route path="/shop/:shopId" element={<StudentRoute />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            
            <footer className="bg-white border-t py-6 text-center text-slate-400 text-xs px-4 no-print">
              <p className="font-medium">XeroxStream Multi-Tenant Architecture</p>
              <p className="mt-1">Secure, real-time document processing for modern shops.</p>
            </footer>
          </ShopProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
