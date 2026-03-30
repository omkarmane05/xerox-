
import React, { useState, useEffect } from 'react';
import { PrintJob, JobStatus } from '../types';
import { RefreshCcw, Search, Clock, ShieldCheck, Printer, QrCode, Sparkles, Copy, Check } from 'lucide-react';
import JobCard from './JobCard';
import { GoogleGenAI } from "@google/genai";
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

interface ShopOwnerDashboardProps {
  jobs: PrintJob[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onRemoveJob: (id: string) => void;
}

const ShopOwnerDashboard: React.FC<ShopOwnerDashboardProps> = ({ jobs, onUpdateStatus, onRemoveJob }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (jobs.length > 0) {
      getQueueInsight();
    } else {
      setAiInsight("");
    }
  }, [jobs.length]);

  const getQueueInsight = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const jobSummaries = jobs.map(j => `${j.filename} (${j.color}, ${j.numCopies} copies)`).join(', ');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I have these print jobs in my queue: ${jobSummaries}. Give me a 1-sentence tip on how to optimize my shop's workflow for these specific jobs.`
      });
      setAiInsight(response.text || "");
    } catch (e) {
      console.error(e);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.otp.includes(searchTerm)
  ).sort((a, b) => b.timestamp - a.timestamp);

  const shopUrl = `${window.location.origin}/shop/${user?.shopId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Insight Bar */}
      {aiInsight && (
        <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-100 animate-in slide-in-from-top duration-500">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{aiInsight}</p>
        </div>
      )}

      {/* Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Clock className="text-amber-600" />} label="Waiting" value={jobs.filter(j => j.status === JobStatus.PENDING).length} color="bg-amber-100" />
        <StatCard icon={<ShieldCheck className="text-indigo-600" />} label="Verified" value={jobs.filter(j => j.status === JobStatus.VERIFIED).length} color="bg-indigo-100" />
        <StatCard icon={<Printer className="text-blue-600" />} label="Printing" value={jobs.filter(j => j.status === JobStatus.PRINTING).length} color="bg-blue-100" />
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <div className={`${isOnline ? 'bg-green-100' : 'bg-red-100'} p-2.5 rounded-xl transition-colors`}>
            <div className={`w-5 h-5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 leading-none">{isOnline ? 'Active' : 'Offline'}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">Status</div>
          </div>
        </div>

        <button 
          onClick={() => setShowQr(true)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1 hover:border-indigo-500 transition-all group"
        >
          <QrCode className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Show Shop QR</span>
        </button>
      </div>

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQr(false)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Student Scan Code</h3>
              <p className="text-sm text-slate-500 mt-1">Students scan this to upload files directly to your queue.</p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border-4 border-slate-50 inline-block shadow-inner">
              <QRCodeSVG value={shopUrl} size={200} level="H" includeMargin={true} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <input 
                  type="text" 
                  readOnly 
                  value={shopUrl} 
                  className="flex-grow bg-transparent text-[10px] text-slate-500 font-mono outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-white rounded-md transition-colors text-indigo-600"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => setShowQr(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Find by Filename or 4-digit OTP..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center">
            <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
              <Printer className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">Your Queue is Empty</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">New print requests from students will appear here in real-time.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              onUpdateStatus={onUpdateStatus}
              onRemoveJob={onRemoveJob}
            />
          ))
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
    <div className={`${color} p-2.5 rounded-xl`}>{icon}</div>
    <div>
      <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{label}</div>
    </div>
  </div>
);

export default ShopOwnerDashboard;
