import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logger } from '../services/loggerService';

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
  const errStr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errStr);
  throw new Error(errStr);
}
import { PrintJob, Shop, JobStatus, PrintColor, PagesPerSheet, Orientation } from '../types';
import { useAuth } from './AuthContext';

interface ShopContextType {
  jobs: PrintJob[];
  addJob: (job: PrintJob) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus) => Promise<void>;
  removeJob: (id: string) => Promise<void>;
  getShopById: (id: string) => Promise<Shop | null>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const { user } = useAuth();

  // Listen for jobs in real-time
  useEffect(() => {
    let q;
    
    if (user?.id === 'mock-guest-id') {
      // For mock mode, listen to the public demo-shop jobs
      q = query(
        collection(db, 'jobs'), 
        where('shopId', '==', 'demo-shop')
      );
    } else if (user?.shopId && auth.currentUser) {
      // For real mode, listen to the owner's jobs
      q = query(
        collection(db, 'jobs'), 
        where('ownerId', '==', auth.currentUser.uid)
      );
    } else {
      setJobs([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => doc.data() as PrintJob);
      // Sort in memory to avoid index requirement
      jobsList.sort((a, b) => b.timestamp - a.timestamp);
      
      // If in mock mode and no real jobs exist yet, add some sample data
      if (user?.id === 'mock-guest-id' && jobsList.length === 0) {
        const mockJobs: PrintJob[] = [
          {
            id: 'mock-1',
            shopId: 'demo-shop',
            ownerId: 'mock-guest-id',
            filename: 'assignment_final.pdf',
            fileUrl: 'https://example.com/file1.pdf',
            fileType: 'application/pdf',
            otp: '1234',
            status: JobStatus.PENDING,
            timestamp: Date.now() - 1000 * 60 * 5,
            color: PrintColor.COLOR,
            pagesPerSheet: PagesPerSheet.ONE,
            orientation: Orientation.PORTRAIT,
            numCopies: 2,
            pageRange: 'All',
            estimatedCost: 20
          }
        ];
        setJobs(mockJobs);
      } else {
        setJobs(jobsList);
      }
    }, (error) => {
      // Don't throw for mock mode, just log
      if (user?.id === 'mock-guest-id') {
        console.warn("Mock mode Firestore listen failed (expected if rules not deployed):", error);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'jobs');
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.shopId]);

  // Simulated Event-Driven Microservice (Processing)
  // In a real FAANG app, this would be a Firebase Cloud Function triggered by Firestore onCreate.
  useEffect(() => {
    const unprocessedJobs = jobs.filter(j => !j.processingStatus || j.processingStatus !== 'ready');
    
    unprocessedJobs.forEach(async (job) => {
      if (!job.processingStatus) {
        logger.info("Starting document processing (Event-Driven Simulation)", { jobId: job.id });
        await updateJobProcessing(job.id, 'scanning');
        
        setTimeout(async () => {
          await updateJobProcessing(job.id, 'ocr');
          
          setTimeout(async () => {
            await updateJobProcessing(job.id, 'ready');
            logger.info("Document processing complete", { jobId: job.id });
          }, 2000);
        }, 2000);
      }
    });
  }, [jobs]);

  const updateJobProcessing = async (id: string, processingStatus: 'scanning' | 'ocr' | 'ready' | 'failed') => {
    try {
      await updateDoc(doc(db, 'jobs', id), { processingStatus });
    } catch (err) {
      // Fallback for mock mode
      setJobs(prev => prev.map(j => j.id === id ? { ...j, processingStatus } : j));
    }
  };

  const addJob = async (job: PrintJob) => {
    logger.info("Adding new print job", { filename: job.filename, shopId: job.shopId });
    try {
      await setDoc(doc(db, 'jobs', job.id), {
        ...job,
        processingStatus: 'scanning' // Initial state
      });
    } catch (error) {
      if (user?.id === 'mock-guest-id') {
        // Local fallback if write fails in mock mode
        setJobs(prev => [{ ...job, processingStatus: 'scanning' }, ...prev]);
      } else {
        handleFirestoreError(error, OperationType.WRITE, `jobs/${job.id}`);
      }
    }
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    logger.info("Updating job status", { jobId: id, newStatus: status });
    try {
      await updateDoc(doc(db, 'jobs', id), { status });

      if (status === JobStatus.COMPLETED) {
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'jobs', id));
          } catch (err) {
            console.error("Error deleting completed job:", err);
          }
        }, 10000); 
      }
    } catch (error) {
      if (user?.id === 'mock-guest-id') {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `jobs/${id}`);
      }
    }
  };

  const removeJob = async (id: string) => {
    logger.info("Removing job", { jobId: id });
    try {
      await deleteDoc(doc(db, 'jobs', id));
    } catch (error) {
      if (user?.id === 'mock-guest-id') {
        setJobs(prev => prev.filter(j => j.id !== id));
      } else {
        handleFirestoreError(error, OperationType.DELETE, `jobs/${id}`);
      }
    }
  };

  const getShopById = async (id: string): Promise<Shop | null> => {
    if (user?.id === 'mock-guest-id' && id === 'demo-shop') {
      return {
        id: 'demo-shop',
        name: 'Demo Xerox Shop (Mock)',
        ownerId: 'mock-guest-id',
        address: 'Demo Street',
        qrCodeUrl: ''
      };
    }
    try {
      const shopDoc = await getDoc(doc(db, 'shops', id));
      return shopDoc.exists() ? (shopDoc.data() as Shop) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `shops/${id}`);
      return null;
    }
  };

  return (
    <ShopContext.Provider value={{ jobs, addJob, updateJobStatus, removeJob, getShopById }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within ShopProvider');
  return context;
};
