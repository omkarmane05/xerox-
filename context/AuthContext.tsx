import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShopOwner, Shop } from '../types';

interface AuthContextType {
  user: ShopOwner | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, shopName: string) => Promise<void>;
  logout: () => Promise<void>;
  guestLogin: () => void;
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
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string, shopName: string) => {
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
      address: 'Default Address',
      qrCodeUrl: '' 
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    await setDoc(doc(db, 'shops', shopId), newShop);
    
    setUser(newUser);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const guestLogin = async () => {
    setIsLoading(true);
    const guestUser: ShopOwner = {
      id: 'guest-owner-id',
      name: 'Demo Owner',
      email: 'demo@example.com',
      shopId: 'demo-shop'
    };
    setUser(guestUser);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, guestLogin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
