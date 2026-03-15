
import React, { useState, useRef, useEffect } from 'react';
import { PrintJob, PrintColor, PagesPerSheet, Orientation, JobStatus } from '../types';
import { Upload, FileText, Settings, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return JSON.stringify(errInfo);
}

interface StudentPortalProps {
  onJobCreated: (job: PrintJob) => Promise<void>;
  shopId: string;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ onJobCreated, shopId }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState({
    copies: 1,
    color: PrintColor.BW,
    pagesPerSheet: PagesPerSheet.ONE,
    pageRange: 'All',
    orientation: Orientation.PORTRAIT
  });
  const [createdJob, setCreatedJob] = useState<PrintJob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [analysisNote, setAnalysisNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      analyzeWithGemini(selectedFile);
      setStep(2);
      setError(null);
    }
  };

  const analyzeWithGemini = async (selectedFile: File) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I'm a student printing a file: "${selectedFile.name}". Give me 1 quick tip for the best print result.`
      });
      setAnalysisNote(response.text || "Optimize your margins.");
    } catch (err) {
      console.error("Gemini Analysis Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-4), msg]);
  };

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Very aggressive compression for mobile reliability
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    addLog(`Starting upload: ${file.name} (${Math.round(file.size/1024)}KB)`);
    setIsSubmitting(true);
    setSubmitStatus("Reading file...");
    setError(null);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 35000)
    );
    
    try {
      addLog("Reading file data...");
      let fileData = await Promise.race([
        readFileAsDataURL(file),
        timeoutPromise
      ]) as string;
      
      if (file.type.startsWith('image/')) {
        setSubmitStatus("Optimizing for mobile...");
        addLog("Compressing image...");
        fileData = await Promise.race([
          compressImage(fileData),
          timeoutPromise
        ]) as string;
        addLog(`Compressed to ~${Math.round(fileData.length * 0.75 / 1024)}KB`);
      }

      const estimatedSize = fileData.length * 0.75;
      if (estimatedSize > 950 * 1024) {
        throw new Error("FILE_TOO_LARGE");
      }
      
      setSubmitStatus("Connecting to database...");
      addLog("Saving to Firestore...");
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const jobId = Math.random().toString(36).substr(2, 9);

      const newJob: PrintJob = {
        id: jobId,
        shopId,
        filename: file.name,
        fileUrl: fileData, 
        fileType: file.type,
        numCopies: settings.copies,
        color: settings.color,
        pagesPerSheet: settings.pagesPerSheet,
        pageRange: settings.pageRange,
        orientation: settings.orientation,
        otp,
        status: JobStatus.PENDING,
        timestamp: Date.now(),
        estimatedCost: (settings.copies * (settings.color === PrintColor.COLOR ? 10 : 2))
      };

      await Promise.race([
        setDoc(doc(db, 'jobs', newJob.id), newJob),
        timeoutPromise
      ]);
      
      addLog("Upload successful!");
      setCreatedJob(newJob);
      setStep(3);
    } catch (err: any) {
      addLog(`Error: ${err.message || "Unknown"}`);
      console.error("Submission Error:", err);
      if (err.message === "TIMEOUT") {
        setError("Network Timeout. Mobile signal might be weak. Try a smaller file or screenshot.");
      } else if (err.message === "FILE_TOO_LARGE") {
        setError("File is too large even after compression. Please use a smaller image.");
      } else if (err.code === 'permission-denied') {
        setError("Database Access Denied. Please refresh and try again.");
      } else {
        setError(`Upload Failed: ${err.message || "Please check your connection."}`);
      }
      setShowDebug(true);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col">
      {/* Progress Header */}
      {step < 3 && (
        <div className="flex justify-between items-center mb-8 px-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {i === 1 ? (file ? <CheckCircle2 className="w-5 h-5" /> : '1') : '2'}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${step >= i ? 'text-indigo-600' : 'text-slate-400'}`}>
                {i === 1 ? 'Upload' : 'Settings'}
              </span>
              {i === 1 && <div className={`w-12 h-0.5 rounded ${step > 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="flex-grow flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Print Securely.</h1>
            <p className="text-slate-500 mt-2 text-sm">Upload your file to get an instant print code.</p>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all active:scale-95"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Upload className="text-indigo-600 w-10 h-10" />
            </div>
            <p className="text-xl font-bold text-slate-800">Tap to Upload</p>
            <p className="text-sm text-slate-400 mt-2">PDF, PNG or JPG files</p>
          </div>
        </div>
      )}

      {/* Step 2: Settings */}
      {step === 2 && file && (
        <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 text-sm font-bold mb-6 hover:text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Change File
          </button>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl mb-8">
            <div className="bg-white p-3 rounded-xl shadow-sm"><FileText className="text-indigo-600 w-6 h-6" /></div>
            <div className="min-w-0 flex-grow">
              <p className="font-bold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>

          <div className="space-y-6">
             {error && (
               <div className="space-y-2">
                 <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-xs font-bold">
                   {error}
                 </div>
                 {showDebug && (
                   <div className="bg-slate-900 text-slate-400 p-3 rounded-xl font-mono text-[10px] space-y-1">
                     {logs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
                     <button 
                       onClick={() => window.location.reload()} 
                       className="mt-2 w-full py-1 bg-slate-800 text-white rounded font-sans font-bold"
                     >
                       Force Refresh App
                     </button>
                   </div>
                 )}
               </div>
             )}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copies</label>
                  <input type="number" min="1" value={settings.copies} onChange={e => setSettings({...settings, copies: parseInt(e.target.value)||1})} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-bold text-lg focus:ring-2 focus:ring-indigo-500" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</label>
                  <select value={settings.color} onChange={e => setSettings({...settings, color: e.target.value as PrintColor})} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 font-bold focus:ring-2 focus:ring-indigo-500">
                    <option value={PrintColor.BW}>B&W</option>
                    <option value={PrintColor.COLOR}>Color</option>
                  </select>
               </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pages per Sheet</label>
                <div className="flex gap-2">
                  {[1, 2, 4].map(n => (
                    <button key={n} onClick={() => setSettings({...settings, pagesPerSheet: n as PagesPerSheet})} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${settings.pagesPerSheet === n ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-white text-slate-400'}`}>{n}</button>
                  ))}
                </div>
             </div>

             {analysisNote && (
               <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
                 <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                 <p className="text-xs text-indigo-700 italic font-medium leading-relaxed">"{analysisNote}"</p>
               </div>
             )}
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={`w-full mt-10 bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-transform ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
                <span className="text-[10px] font-medium opacity-80 animate-pulse">{submitStatus}</span>
              </div>
            ) : (
              <>
                Get Print Code <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && createdJob && (
        <div className="flex-grow flex flex-col justify-center animate-in zoom-in duration-500">
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 p-8 text-center text-white">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h2 className="text-2xl font-black">Upload Ready!</h2>
              <p className="text-indigo-100 text-sm mt-1 opacity-80">Show this code at the counter</p>
            </div>
            <div className="p-10 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Your 4-Digit OTP</div>
              <div className="text-7xl font-black text-indigo-600 tracking-tighter mb-8 tabular-nums">
                {createdJob.otp}
              </div>
              <div className="border-t pt-6 space-y-3">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                   <span>Estimated Cost</span>
                   <span className="text-indigo-600">₹{createdJob.estimatedCost}.00</span>
                 </div>
              </div>
              <button onClick={() => { setStep(1); setCreatedJob(null); setFile(null); }} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
);

export default StudentPortal;
