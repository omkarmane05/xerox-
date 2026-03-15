
import React, { useState } from 'react';
import { PrintJob, JobStatus } from '../types';
import { FileText, MoreVertical, Check, X, Printer, Trash2 } from 'lucide-react';

interface JobCardProps {
  job: PrintJob;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onRemoveJob: (id: string) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onUpdateStatus, onRemoveJob }) => {
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState(false);

  const handleVerify = async () => {
    if (otpInput === job.otp) {
      await onUpdateStatus(job.id, JobStatus.VERIFIED);
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  const handlePrint = async () => {
    await onUpdateStatus(job.id, JobStatus.PRINTING);
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.print();
        
        // Cleanup after a delay to allow print dialog to open
        setTimeout(() => {
          document.body.removeChild(iframe);
          onUpdateStatus(job.id, JobStatus.COMPLETED);
        }, 5000);
      }
    };

    // For PDFs, we can set the src directly. For images, we might need a wrapper.
    if (job.fileType.includes('pdf')) {
      iframe.src = job.fileUrl;
    } else {
      // For images, wrap in HTML
      const html = `<html><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${job.fileUrl}" style="max-width:100%;max-height:100%;object-fit:contain;"></body></html>`;
      iframe.contentWindow?.document.open();
      iframe.contentWindow?.document.write(html);
      iframe.contentWindow?.document.close();
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
      case JobStatus.PENDING: return 'bg-amber-100 text-amber-700';
      case JobStatus.VERIFIED: return 'bg-indigo-100 text-indigo-700';
      case JobStatus.PRINTING: return 'bg-blue-100 text-blue-700 animate-pulse';
      case JobStatus.COMPLETED: return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 transition-all ${
      job.status === JobStatus.VERIFIED ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-100'
    }`}>
      <div className="flex-grow flex items-center gap-4 w-full">
        <div className={`p-3 rounded-xl ${job.color === 'Color' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
          <FileText className="w-8 h-8" />
        </div>
        <div className="min-w-0 overflow-hidden">
          <h3 className="font-bold text-slate-900 truncate">{job.filename}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-slate-500">
            <span className={`px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>{job.status}</span>
            <span>{job.color}</span>
            <span>{job.numCopies} Copies</span>
            <span>{new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
        {job.status === JobStatus.PENDING ? (
          <div className="flex gap-2 w-full">
            <div className="relative flex-grow">
              <input 
                type="text" 
                maxLength={4}
                placeholder="Enter OTP" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className={`w-full md:w-32 px-3 py-2 border rounded-lg outline-none text-center font-mono tracking-widest ${
                  error ? 'border-red-500 bg-red-50 animate-shake' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>
            <button 
              onClick={handleVerify}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Verify
            </button>
          </div>
        ) : job.status === JobStatus.VERIFIED ? (
          <button 
            onClick={handlePrint}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
          >
            <Printer className="w-4 h-4" />
            Print Now
          </button>
        ) : job.status === JobStatus.PRINTING ? (
          <div className="flex items-center gap-2 text-blue-600 font-bold px-4 py-2">
            <RefreshCcw className="w-4 h-4 animate-spin" />
            Spooling...
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-bold px-4 py-2">
            <Check className="w-5 h-5" />
            Printed
          </div>
        )}

        <button 
          onClick={async () => await onRemoveJob(job.id)}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Remove Job"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Lucide replacement for missing icons
const RefreshCcw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
);

export default JobCard;
