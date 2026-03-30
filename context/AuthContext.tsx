import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShopOwner, Shop } from '../types';

interface AuthContextType {
  user: ShopOwner | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, shopName: string, address: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  guestLogin: (retryCount?: number) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ShopOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as ShopOwner);
        }
      } else {
        // If we are in mock mode, don't clear the user
        setUser(prev => {
          if (prev?.id === 'mock-guest-id') return prev;
          return null;
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string, shopName: string, address: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const shopId = `shop-${Math.random().toString(36).substr(2, 9)}`;
    const newUser: ShopOwner = {
      id: firebaseUser.uid,
      name,
      email,
      shopId
    };

    const newShop: Shop = {
      id: shopId,
      name: shopName,
      ownerId: firebaseUser.uid,
      address: address,
      qrCodeUrl: '' 
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    await setDoc(doc(db, 'shops', shopId), newShop);
    
    setUser(newUser);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as ShopOwner);
      } else {
        // Create a new user profile if it doesn't exist
        const shopId = `shop-${Math.random().toString(36).substr(2, 9)}`;
        const newUser: ShopOwner = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Shop Owner',
          email: firebaseUser.email || '',
          shopId
        };

        const newShop: Shop = {
          id: shopId,
          name: `${newUser.name}'s Xerox Shop`,
          ownerId: firebaseUser.uid,
          address: 'Default Address',
          qrCodeUrl: '' 
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        await setDoc(doc(db, 'shops', shopId), newShop);
        setUser(newUser);
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      let message = "Google login failed. Please ensure popups are allowed for this site.";
      if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
        message = "Google authentication is not enabled in the Firebase Console. Please enable it in Auth settings.";
      }
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const guestLogin = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      
      const guestUser: ShopOwner = {
        id: firebaseUser.uid,
        name: 'Demo Owner',
        email: 'demo@example.com',
        shopId: 'demo-shop'
      };
      
      // Create a temporary shop for the guest if it doesn't exist
      const demoShop: Shop = {
        id: 'demo-shop',
        name: 'Demo Xerox Shop',
        ownerId: firebaseUser.uid,
        address: 'Demo Street',
        qrCodeUrl: ''
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), guestUser);
      await setDoc(doc(db, 'shops', 'demo-shop'), demoShop);
      
      setUser(guestUser);
    } catch (err: any) {
      console.error("Guest login failed:", err);
      
      // Retry logic for network errors
      if (err.code === 'auth/network-request-failed' && retryCount < 2) {
        console.log(`Retrying guest login... (Attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return guestLogin(retryCount + 1);
      }

      // For ANY other error, provide a MOCK fallback so the user can still see the app
      // This is especially important for auth/admin-restricted-operation
      console.warn("Firebase Auth failed or restricted. Falling back to MOCK guest mode.");
      
      const mockUser: ShopOwner = {
        id: 'mock-guest-id',
        name: 'Demo Owner (Mock)',
        email: 'demo@example.com',
        shopId: 'demo-shop'
      };
      
      setUser(mockUser);
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, guestLogin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
