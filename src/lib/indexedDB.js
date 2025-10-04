import { openDB } from 'idb';

const DB_NAME = 'inventory-os-db';
const DB_VERSION = 1;

let dbInstance = null;

// Initialize IndexedDB
export const initDB = async () => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores for each collection
      if (!db.objectStoreNames.contains('warehouses')) {
        db.createObjectStore('warehouses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('rooms')) {
        db.createObjectStore('rooms', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('shelves')) {
        db.createObjectStore('shelves', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('bucket')) {
        db.createObjectStore('bucket', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'uid' });
      }
    },
  });

  return dbInstance;
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Mock Firestore-like API for compatibility
export const auth = {
  currentUser: { uid: 'anonymous-user', isAnonymous: true },
};

export const signInAnonymously = async () => {
  return { user: auth.currentUser };
};

export const onAuthStateChanged = (authInstance, callback) => {
  setTimeout(() => callback(auth.currentUser), 0);
  return () => {};
};

export const serverTimestamp = () => new Date().toISOString();

// Parse collection path to extract store name and parent path
const parseCollectionPath = (path) => {
  const parts = path.split('/');
  const userId = parts[1];

  if (parts.includes('warehouses') && !parts.includes('rooms')) {
    return { storeName: 'warehouses', parentKey: null, userId };
  }
  if (parts.includes('rooms') && !parts.includes('shelves')) {
    const warehouseId = parts[parts.indexOf('warehouses') + 1];
    return { storeName: 'rooms', parentKey: warehouseId, userId };
  }
  if (parts.includes('shelves') && !parts.includes('items')) {
    const warehouseId = parts[parts.indexOf('warehouses') + 1];
    const roomId = parts[parts.indexOf('rooms') + 1];
    return { storeName: 'shelves', parentKey: `${warehouseId}/${roomId}`, userId };
  }
  if (parts.includes('items')) {
    const warehouseId = parts[parts.indexOf('warehouses') + 1];
    const roomId = parts[parts.indexOf('rooms') + 1];
    const shelfId = parts[parts.indexOf('shelves') + 1];
    return { storeName: 'items', parentKey: `${warehouseId}/${roomId}/${shelfId}`, userId };
  }
  if (parts.includes('bucket')) {
    return { storeName: 'bucket', parentKey: null, userId };
  }

  return { storeName: parts[parts.length - 1], parentKey: null, userId };
};

export const collection = (path) => {
  return { _path: path, _type: 'collection' };
};

export const doc = (path, id = null) => {
  const fullPath = id ? `${path}/${id}` : path;
  return { _path: fullPath, _type: 'document' };
};

export const query = (collectionRef) => {
  return collectionRef;
};

export const addDoc = async (collectionRef, data) => {
  const db = await initDB();
  const { storeName, parentKey, userId } = parseCollectionPath(collectionRef._path);

  const id = generateId();
  const docData = {
    ...data,
    id,
    _parentKey: parentKey,
    _userId: userId,
    createdAt: new Date().toISOString(),
  };

  await db.add(storeName, docData);
  return { id };
};

export const updateDoc = async (documentRef, data) => {
  const db = await initDB();
  const pathParts = documentRef._path.split('/');
  const id = pathParts[pathParts.length - 1];
  const collectionPath = pathParts.slice(0, -1).join('/');
  const { storeName } = parseCollectionPath(collectionPath);

  const existing = await db.get(storeName, id);
  if (existing) {
    await db.put(storeName, { ...existing, ...data, updatedAt: new Date().toISOString() });
  }
};

export const deleteDoc = async (documentRef) => {
  const db = await initDB();
  const pathParts = documentRef._path.split('/');
  const id = pathParts[pathParts.length - 1];
  const collectionPath = pathParts.slice(0, -1).join('/');
  const { storeName } = parseCollectionPath(collectionPath);

  await db.delete(storeName, id);
};

export const getDocs = async (collectionRef) => {
  const db = await initDB();
  const { storeName, parentKey, userId } = parseCollectionPath(collectionRef._path);

  let allDocs = await db.getAll(storeName);

  // Filter by parent and user
  allDocs = allDocs.filter(doc => {
    if (userId && doc._userId !== userId) return false;
    if (parentKey && doc._parentKey !== parentKey) return false;
    return true;
  });

  return {
    docs: allDocs.map(doc => ({
      id: doc.id,
      data: () => doc,
      exists: () => true,
    })),
  };
};

export const onSnapshot = (collectionRef, callback) => {
  let intervalId;

  const executeCallback = async () => {
    const snapshot = await getDocs(collectionRef);
    callback(snapshot);
  };

  executeCallback();
  intervalId = setInterval(executeCallback, 500);

  return () => clearInterval(intervalId);
};

export const writeBatch = () => {
  const operations = [];

  return {
    delete: (documentRef) => {
      operations.push({ type: 'delete', ref: documentRef });
    },
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'delete') {
          await deleteDoc(op.ref);
        }
      }
    },
  };
};

// Migration function from localStorage to IndexedDB
export const migrateFromLocalStorage = async () => {
  const oldData = localStorage.getItem('inventory-os-db');
  if (!oldData) return;

  const db = await initDB();
  const parsed = JSON.parse(oldData);
  const userId = 'anonymous-user';

  // Migrate warehouses
  if (parsed.users?.[userId]?.warehouses) {
    for (const [id, warehouse] of Object.entries(parsed.users[userId].warehouses)) {
      await db.put('warehouses', { ...warehouse, id, _userId: userId, _parentKey: null });

      // Migrate rooms
      if (warehouse.rooms) {
        for (const [roomId, room] of Object.entries(warehouse.rooms)) {
          await db.put('rooms', { ...room, id: roomId, _userId: userId, _parentKey: id });

          // Migrate shelves
          if (room.shelves) {
            for (const [shelfId, shelf] of Object.entries(room.shelves)) {
              await db.put('shelves', { ...shelf, id: shelfId, _userId: userId, _parentKey: `${id}/${roomId}` });

              // Migrate items
              if (shelf.items) {
                for (const [itemId, item] of Object.entries(shelf.items)) {
                  await db.put('items', { ...item, id: itemId, _userId: userId, _parentKey: `${id}/${roomId}/${shelfId}` });
                }
              }
            }
          }
        }
      }
    }
  }

  // Migrate bucket
  if (parsed.users?.[userId]?.bucket) {
    for (const [id, item] of Object.entries(parsed.users[userId].bucket)) {
      await db.put('bucket', { ...item, id, _userId: userId, _parentKey: null });
    }
  }

  console.log('Migration from localStorage to IndexedDB completed!');
  // localStorage.removeItem('inventory-os-db'); // Uncomment to clean up after migration
};
