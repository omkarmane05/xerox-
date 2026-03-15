import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Printer, Shield, Zap, QrCode } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  
  const { login, signup, guestLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password, shopName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-grow container mx-auto px-4 py-12 flex flex-col lg:flex-row items-center gap-12">
        <div className="lg:w-1/2 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Modernize Your <span className="text-indigo-600">Xerox Shop</span> Experience
            </h1>
            <p className="text-xl text-slate-600 max-w-lg">
              The privacy-first, cloud-to-print solution. Let students upload documents via QR code and authorize printing with OTP.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard 
              icon={<QrCode className="w-6 h-6 text-indigo-600" />}
              title="Unique QR Codes"
              description="Each shop gets a unique QR code for direct student uploads."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-indigo-600" />}
              title="Privacy First"
              description="No local storage on your device. Documents are processed in-memory."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-indigo-600" />}
              title="Instant Sync"
              description="Real-time dashboard updates as soon as a student uploads."
            />
            <FeatureCard 
              icon={<Printer className="w-6 h-6 text-indigo-600" />}
              title="OTP Authorization"
              description="Secure printing. Only print when the student provides the OTP."
            />
          </div>
        </div>

        <div className="lg:w-1/2 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                {isLogin ? 'Welcome Back' : 'Register Your Shop'}
              </h2>
              <p className="text-slate-500 mt-2">
                {isLogin ? 'Login to manage your print queue' : 'Start accepting digital print jobs today'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-200"
                >
                  {isLogin ? 'Login' : 'Create Account'}
                </button>
                
                {isLogin && (
                  <button 
                    type="button"
                    onClick={async () => {
                      await guestLogin();
                      navigate('/dashboard');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg transition-colors"
                  >
                    Try Demo Account (No Login Required)
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500">{description}</p>
  </div>
);

export default LandingPage;
