import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import InventoryApp from './InventoryApp';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        signInAnonymously(auth).catch(() => {
          // Anonymous sign-in failed, handled by auth state
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-yellow-400">
        <div className="text-center">
          <h1 className="text-2xl mb-4">[ INVENTORY OS ]</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <InventoryApp user={user} />;
}

export default App; 