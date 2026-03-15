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
import { PrintJob, Shop, JobStatus } from '../types';
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
    if (!user?.shopId) {
      // If student view, we might not have a user, but we have shopId from URL
      // However, the dashboard needs filtering by user.shopId
      return;
    }

    const q = query(
      collection(db, 'jobs'), 
      where('shopId', '==', user.shopId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => doc.data() as PrintJob);
      // Sort in memory to avoid index requirement
      jobsList.sort((a, b) => b.timestamp - a.timestamp);
      setJobs(jobsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    return () => unsubscribe();
  }, [user?.shopId]);

  // Special listener for students (they need to see their own job if they refresh, 
  // but for now let's just focus on the owner's queue)
  
  const addJob = async (job: PrintJob) => {
    await setDoc(doc(db, 'jobs', job.id), job);
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
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
  };

  const removeJob = async (id: string) => {
    await deleteDoc(doc(db, 'jobs', id));
  };

  const getShopById = async (id: string): Promise<Shop | null> => {
    if (id === 'demo-shop') {
      return {
        id: 'demo-shop',
        name: 'Demo Xerox Shop',
        ownerId: 'guest-owner-id',
        address: 'Demo Street',
        qrCodeUrl: ''
      };
    }
    const shopDoc = await getDoc(doc(db, 'shops', id));
    return shopDoc.exists() ? (shopDoc.data() as Shop) : null;
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
