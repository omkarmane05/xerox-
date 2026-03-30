
import React from 'react';
import { Printer, LogOut, Store, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  view: 'student' | 'owner';
  shopName?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, shopName, onLogout }) => {
  const { user } = useAuth();
  const isMock = user?.id === 'mock-guest-id';

  return (
    <header className="bg-white border-b sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Printer className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 leading-none">
                XeroxStream
              </span>
              {isMock && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-0.5">
                  <Info className="w-2.5 h-2.5" />
                  Demo
                </span>
              )}
            </div>
            {view === 'student' && shopName && (
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                at {shopName}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {view === 'owner' && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
          {view === 'student' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
              <Store className="w-3 h-3" />
              Student Portal
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
