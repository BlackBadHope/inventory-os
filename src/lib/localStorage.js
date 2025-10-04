// LocalStorage wrapper for Inventory OS

const DB_KEY = 'inventory-os-db';

// Initialize database structure
const initDB = () => {
  const db = localStorage.getItem(DB_KEY);
  if (!db) {
    const initialDB = {
      users: {
        'anonymous-user': {
          warehouses: {},
          bucket: {}
        }
      }
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  return JSON.parse(db);
};

// Get database
export const getDB = () => {
  return initDB();
};

// Save database
export const saveDB = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// Generate ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Collection operations
export const collection = (path) => {
  return { path };
};

export const doc = (path, id = null) => {
  return { path, id };
};

export const getDocs = async (collectionRef) => {
  const db = getDB();
  const parts = collectionRef.path.split('/');

  let current = db;
  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }

  const docs = Object.entries(current).map(([id, data]) => ({
    id,
    data: () => data,
    ...data
  }));

  return { docs };
};

export const addDoc = async (collectionRef, data) => {
  const db = getDB();
  const parts = collectionRef.path.split('/');

  let current = db;
  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }

  const id = generateId();
  current[id] = { ...data, createdAt: new Date().toISOString() };

  saveDB(db);
  return { id };
};

export const updateDoc = async (docRef, data) => {
  const db = getDB();
  const pathWithId = docRef.id ? `${docRef.path}/${docRef.id}` : docRef.path;
  const parts = pathWithId.split('/');

  let current = db;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }

  const lastPart = parts[parts.length - 1];
  if (current[lastPart]) {
    current[lastPart] = { ...current[lastPart], ...data };
  }

  saveDB(db);
};

export const deleteDoc = async (docRef) => {
  const db = getDB();
  const pathWithId = docRef.id ? `${docRef.path}/${docRef.id}` : docRef.path;
  const parts = pathWithId.split('/');

  let current = db;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    current = current[parts[i]];
  }

  const lastPart = parts[parts.length - 1];
  delete current[lastPart];

  saveDB(db);
};

export const serverTimestamp = () => new Date().toISOString();

// Query operations
export const query = (collectionRef) => collectionRef;

export const writeBatch = () => {
  const operations = [];

  return {
    set: (docRef, data) => {
      operations.push({ type: 'set', docRef, data });
    },
    delete: (docRef) => {
      operations.push({ type: 'delete', docRef });
    },
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'set') {
          const db = getDB();
          const pathWithId = op.docRef.id ? `${op.docRef.path}/${op.docRef.id}` : op.docRef.path;
          const parts = pathWithId.split('/');

          let current = db;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
          }

          current[parts[parts.length - 1]] = op.data;
          saveDB(db);
        } else if (op.type === 'delete') {
          await deleteDoc(op.docRef);
        }
      }
    }
  };
};

// Real-time listener simulation
const listeners = new Map();

export const onSnapshot = (collectionOrQuery, callback) => {
  const executeCallback = () => {
    getDocs(collectionOrQuery).then(snapshot => {
      callback(snapshot);
    });
  };

  // Execute immediately
  executeCallback();

  // Setup periodic check
  const listenerId = generateId();
  const intervalId = setInterval(executeCallback, 500);

  listeners.set(listenerId, intervalId);

  // Return unsubscribe function
  return () => {
    const intervalId = listeners.get(listenerId);
    if (intervalId) {
      clearInterval(intervalId);
      listeners.delete(listenerId);
    }
  };
};

// Auth mock
export const auth = {
  currentUser: { uid: 'anonymous-user', isAnonymous: true }
};

export const signInAnonymously = async () => {
  return { user: auth.currentUser };
};

export const onAuthStateChanged = (authInstance, callback) => {
  // Immediately call with anonymous user
  setTimeout(() => callback(auth.currentUser), 0);

  // Return unsubscribe
  return () => {};
};
