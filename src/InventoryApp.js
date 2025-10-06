import React, { useState, useEffect, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, auth, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, writeBatch, getDocs, serverTimestamp, migrateFromLocalStorage } from './lib/indexedDB';
import { Plus, Trash2, Edit, Home, Box, List, Info, ShoppingCart, XCircle, BrainCircuit, Bot, Send, AlertTriangle, ChevronRight, Settings } from 'lucide-react';
import { ASCII_COLORS, UNITS } from './lib/constants';
import ItemCard from './components/ItemCard';
import InputModal from './components/InputModal';
import InfoModal from './components/InfoModal';
import SettingsModal from './components/SettingsModal';

// --- Authentication Wrapper ---
export default function InventoryApp({ user }) {
    const [authInfo, setAuthInfo] = useState({ status: 'loading', user: null, profile: null });

    useEffect(() => {
        // Migrate data from localStorage to IndexedDB on first load
        migrateFromLocalStorage().catch(console.error);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = { username: user.isAnonymous ? 'Anonymous User' : 'User', currency: 'USD' };
                setAuthInfo({ status: 'authenticated', user, profile });
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    setAuthInfo({ status: 'error', user: null, profile: null });
                }
            }
        });
        return () => unsubscribe();
    }, []);

    if (authInfo.status === 'loading') {
        return <div className={`flex items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.text}`}><p className="text-xl animate-pulse">[ INITIALIZING SESSION... ]</p></div>;
    }
    
    if (authInfo.status === 'error') {
         return <div className={`flex items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.error}`}><p className="text-xl">[ AUTHENTICATION FAILED. PLEASE REFRESH. ]</p></div>;
    }

    if (authInfo.status === 'authenticated') {
        return <MainInventoryApp user={authInfo.user} userProfile={authInfo.profile} />;
    }
    
    return <div className={`flex items-center justify-center min-h-screen ${ASCII_COLORS.bg} ${ASCII_COLORS.text}`}><p className="text-xl animate-pulse">[ WAITING FOR AUTHENTICATION... ]</p></div>;
}

function MainInventoryApp({ user, userProfile }) {
  const userId = user.uid;
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const [bucketItems, setBucketItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState({show: false, path: ''});
  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: 1, price: '', purchaseDate: new Date().toISOString().split('T')[0], expiryDate: '', description: '', unit: 'pcs' });
  const [userCategories, setUserCategories] = useState(['Food', 'Electronics', 'Clothing', 'Tools', 'Other']);
  const [editingItemId, setEditingItemId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState({ title: '', label: '', onSubmit: null, initialValue: '' });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('inventory-os-settings');
    return saved ? JSON.parse(saved) : { zoom: 100 };
  });
  const [showBucket, setShowBucket] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const [containerToMove, setContainerToMove] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatMessagesEndRef = useRef(null);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedShelf = shelves.find(s => s.id === selectedShelfId);
  
  // --- Effects (Data Loading) ---
  const [shelfItems, setShelfItems] = useState([]);
  useEffect(() => {
    if (!selectedShelfId) { setShelfItems([]); return; }
    const path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${selectedShelfId}/items`;
    const unsub = onSnapshot(collection(path), (snapshot) => {
        setShelfItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [selectedShelfId, userId, selectedWarehouseId, selectedRoomId]);

  useEffect(() => { if (!userId) return; const unsub = onSnapshot(query(collection(`users/${userId}/warehouses`)), s => setWarehouses(s.docs.map(d => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [userId]);
  useEffect(() => { if (!selectedWarehouseId) { setRooms([]); return; } const unsub = onSnapshot(query(collection(`users/${userId}/warehouses/${selectedWarehouseId}/rooms`)), s => setRooms(s.docs.map(d => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [selectedWarehouseId, userId]);
  useEffect(() => { if (!selectedRoomId) { setShelves([]); return; } const unsub = onSnapshot(query(collection(`users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves`)), s => setShelves(s.docs.map(d => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [selectedRoomId, userId, selectedWarehouseId]);
  useEffect(() => { if (!userId) return; const unsub = onSnapshot(query(collection(`users/${userId}/bucket`)), s => setBucketItems(s.docs.map(d => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [userId]);
  useEffect(() => { chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // --- Settings ---
  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('inventory-os-settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    const baseSize = 16; // базовый размер браузера
    const newSize = (baseSize * settings.zoom) / 100;
    document.documentElement.style.fontSize = `${newSize}px`;
  }, [settings.zoom]);

  // --- Helper & CRUD ---
  const showNotification = (message, type = 'success') => { if (type === 'success') setSuccessMessage(message); else setErrorMessage(message); setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 3000); };
  const handleConfirm = (action, message) => { setConfirmAction(() => () => action()); setConfirmMessage(message); setShowConfirmModal(true); };
  const executeConfirmedAction = () => { if (confirmAction) confirmAction(); setShowConfirmModal(false); };
  
  const createEntity = (type, parent) => {
    let path, title, label;
    if (type === 'warehouse') {
        path = `users/${userId}/warehouses`;
        title = 'CREATE NEW WAREHOUSE'; label = 'Warehouse Name:';
    } else if (type === 'room') {
        if (!selectedWarehouseId) return;
        path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms`;
        title = 'CREATE NEW ROOM'; label = 'Room Name:';
    } else if (type === 'shelf') {
        if (!selectedRoomId) return;
        path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves`;
        title = 'CREATE NEW CONTAINER'; label = 'Container Name:';
    }
    setInputModalConfig({
      title,
      label,
      initialValue: '',
      onSubmit: async (name) => {
        await addDoc(collection(path), { name, createdAt: serverTimestamp() });
        showNotification(`${type} "${name}" created!`);
        setShowInputModal(false);
      }
    });
    setShowInputModal(true);
  };

  const renameEntity = (type, entity) => {
    let path, title, label;
    if (type === 'warehouse') {
        path = `users/${userId}/warehouses`;
        title = 'RENAME WAREHOUSE'; label = 'New Name:';
    } else if (type === 'room') {
        path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms`;
        title = 'RENAME ROOM'; label = 'New Name:';
    } else if (type === 'shelf') {
        path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves`;
        title = 'RENAME CONTAINER'; label = 'New Name:';
    }
    setInputModalConfig({
      title,
      label,
      initialValue: entity.name,
      onSubmit: async (name) => {
        await updateDoc(doc(path, entity.id), { name });
        showNotification(`${type} renamed to "${name}"!`);
        setShowInputModal(false);
      }
    });
    setShowInputModal(true);
  };

  const recursiveDelete = async (docRef) => {
    const subcollections = await getDocs(collection(docRef, 'items')).then(snap => snap.docs.map(d => d.ref)).catch(() => []);
    subcollections.push(...await getDocs(collection(docRef, 'shelves')).then(snap => snap.docs.map(d => d.ref)).catch(() => []));
    subcollections.push(...await getDocs(collection(docRef, 'rooms')).then(snap => snap.docs.map(d => d.ref)).catch(() => []));

    for (const subDocRef of subcollections) {
        await recursiveDelete(subDocRef);
    }
    await deleteDoc(docRef);
  };

  const handleDelete = (type, entity) => {
    let path, message;
     if (type === 'warehouse') path = `users/${userId}/warehouses/${entity.id}`;
     else if (type === 'room') path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${entity.id}`;
     else if (type === 'shelf') path = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${entity.id}`;
     else return;
     
     message = `Delete ${type} "${entity.name}" and ALL its contents? This cannot be undone.`;
     handleConfirm(async () => {
        await recursiveDelete(doc(path));
        showNotification(`${type} "${entity.name}" deleted.`);
        if (type === 'warehouse' && selectedWarehouseId === entity.id) setSelectedWarehouseId(null);
        if (type === 'room' && selectedRoomId === entity.id) setSelectedRoomId(null);
        if (type === 'shelf' && selectedShelfId === entity.id) setSelectedShelfId(null);
     }, message);
  };

  const moveContainer = async (container, newRoomId) => {
    const oldPath = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${container.id}`;
    const newPath = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${newRoomId}/shelves/${container.id}`;
    const itemsPath = collection(oldPath, 'items');
    const itemsSnapshot = await getDocs(itemsPath);

    const batch = writeBatch();
    batch.set(doc(newPath), { name: container.name, createdAt: container.createdAt || serverTimestamp() });
    
    itemsSnapshot.docs.forEach(itemDoc => {
        const newItemRef = doc(newPath, 'items', itemDoc.id);
        batch.set(newItemRef, itemDoc.data());
        batch.delete(itemDoc.ref);
    });

    batch.delete(doc(oldPath));

    await batch.commit();
    showNotification(`Container "${container.name}" moved successfully.`);
    setContainerToMove(null);
  };

  const handleAddItem = async () => {
    if (!showAddItemModal.path) {
      setErrorMessage('Select a container first!');
      return;
    }
    try {
      if (editingItemId) {
        // Update existing item
        await updateDoc(doc(`${showAddItemModal.path}/${editingItemId}`), {
          ...newItem,
          quantity: parseFloat(newItem.quantity) || 1,
          price: parseFloat(newItem.price) || 0,
        });
        showNotification('Item updated!');
      } else {
        // Add new item
        await addDoc(collection(showAddItemModal.path), {
          ...newItem,
          quantity: parseFloat(newItem.quantity) || 1,
          price: parseFloat(newItem.price) || 0,
          createdAt: serverTimestamp(),
        });
        showNotification('Item added!');
      }
      setShowAddItemModal({show: false, path: ''});
      setEditingItemId(null);
      setNewItem({ name: '', category: '', quantity: 1, price: '', purchaseDate: new Date().toISOString().split('T')[0], expiryDate: '', priority: 'Normal', description: '', labels: '', unit: 'pcs' });
    } catch (e) {
      setErrorMessage('Failed to save item: ' + e.message);
    }
  };

  const handleEditItem = (item, collectionPath) => {
    setNewItem({
      name: item.name || '',
      category: item.category || '',
      quantity: item.quantity || 1,
      price: item.price || '',
      purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
      expiryDate: item.expiryDate || '',
      description: item.description || '',
      unit: item.unit || 'pcs'
    });
    setEditingItemId(item.id);
    setShowAddItemModal({ show: true, path: collectionPath });
  };

  const handleDeleteItem = async (item, collectionPath) => {
    handleConfirm(async () => {
      try {
        await deleteDoc(doc(`${collectionPath}/${item.id}`));
        showNotification(`Item "${item.name}" deleted.`);
      } catch (e) {
        setErrorMessage('Failed to delete item: ' + e.message);
      }
    }, `Delete item "${item.name}"? This cannot be undone.`);
  };

  const handleUpdateQuantity = async (item, newQuantity, collectionPath) => {
    try {
      await updateDoc(doc(`${collectionPath}/${item.id}`), { quantity: newQuantity });
      showNotification(`Quantity updated for "${item.name}".`);
    } catch (e) {
      setErrorMessage('Failed to update quantity: ' + e.message);
    }
  };

  const handleAskGemini = async (userQuery) => {
    const currentQuery = userQuery.trim();
    if (!currentQuery || isGeminiLoading) return;
    setIsGeminiLoading(true);
    const newHistory = [...chatHistory, { role: "user", parts: [{ text: currentQuery }] }];
    setChatHistory(newHistory);
    setChatInput("");
    const prompt = `Please respond in the language of the user's query.\n[FULL CHAT HISTORY]:\n${JSON.stringify(newHistory)}\n[ADDITIONAL CONTEXT]:\nCurrent Location: ${selectedWarehouse?.name || '...'} > ${selectedRoom?.name || '...'} > ${selectedShelf?.name || '...'}\n[USER QUERY TO ANSWER]:\n"${currentQuery}"`;
    try {
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiKey = process.env.REACT_APP_GOOGLE_GEMINI_API_KEY || '';
      if (!apiKey) throw new Error('Gemini API key not set!');
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      const result = await response.json();
      const modelResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "[[ ERROR: NO RESPONSE ]]";
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: modelResponse }] }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: `[[ SYSTEM MALFUNCTION: ${error.message} ]]` }] }]);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const currentItems = shelfItems; // Simplified since we load shelf items directly
  const currentPath = selectedShelfId ? `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${selectedShelfId}/items` : '';


  const moveItemToBucket = async (item, originalPath) => {
    try {
      const itemData = { ...item };
      delete itemData.id;
      await addDoc(collection(`users/${userId}/bucket`), {
        ...itemData,
        originalPath,
        movedAt: serverTimestamp()
      });
      // originalPath already contains the full path with ID
      const pathParts = originalPath.split('/');
      const itemId = pathParts[pathParts.length - 1];
      const collectionPath = pathParts.slice(0, -1).join('/');
      await deleteDoc(doc(collectionPath, itemId));
      showNotification(`"${item.name}" moved to bucket.`);
      setItemToMove(null);
    } catch (e) {
      setErrorMessage('Failed to move item: ' + e.message);
    }
  };

  const moveItemFromBucket = async (bucketItem, destinationPath) => {
    try {
      const itemData = { ...bucketItem };
      delete itemData.id;
      delete itemData.originalPath;
      delete itemData.movedAt;
      await addDoc(collection(destinationPath), itemData);
      await deleteDoc(doc(`users/${userId}/bucket`, bucketItem.id));
      showNotification(`"${bucketItem.name}" moved from bucket.`);
      setItemToMove(null);
      setShowBucket(false);
    } catch (e) {
      setErrorMessage('Failed to move item from bucket: ' + e.message);
    }
  };
  
  
  return (
    <div className={`${ASCII_COLORS.bg} ${ASCII_COLORS.text} min-h-screen font-mono p-4 sm:p-6 lg:p-8`}>
      {/* Notifications */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-900 text-green-200 p-4 rounded-lg border-2 border-green-500 z-50 notification-slide shadow-lg">
          <p className="font-mono">✓ {successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 bg-red-900 text-red-200 p-4 rounded-lg border-2 border-red-500 z-50 notification-slide shadow-lg">
          <p className="font-mono">✗ {errorMessage}</p>
        </div>
      )}

      {/* Modals */}
      <InfoModal show={showInfoModal} onCancel={() => setShowInfoModal(false)} />
      <SettingsModal show={showSettingsModal} onClose={() => setShowSettingsModal(false)} settings={settings} onSettingsChange={handleSettingsChange} />
      <InputModal show={showInputModal} title={inputModalConfig.title} label={inputModalConfig.label} initialValue={inputModalConfig.initialValue} onSubmit={inputModalConfig.onSubmit} onCancel={() => setShowInputModal(false)} />
      {showConfirmModal && ( <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-80 flex items-center justify-center p-4 z-[100]`}> <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-sm border-2 ${ASCII_COLORS.border}`}> <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent} flex items-center`}><AlertTriangle className="mr-2"/>CONFIRM ACTION</h2> <p className="mb-6">{confirmMessage}</p> <div className="flex justify-end space-x-3"> <button onClick={() => setShowConfirmModal(false)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CANCEL]</button> <button onClick={executeConfirmedAction} className={`${ASCII_COLORS.buttonBg} text-red-400 p-2 px-4 rounded-md hover:bg-red-900 border ${ASCII_COLORS.border}`}>[CONFIRM]</button> </div> </div> </div> )}
      {showAddItemModal.show && ( <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-40 p-4`}> <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-lg border-2 ${ASCII_COLORS.border} max-h-[90vh] flex flex-col`}> <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>{editingItemId ? '[EDIT ITEM]' : '[ADD NEW ITEM]'}</h2> <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }} className="space-y-3 overflow-y-auto pr-2"> <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> <div><label className="block text-sm">Name:</label><input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} required /></div> <div><label className="block text-sm">Category:</label><select value={newItem.category} onChange={e => { const val = e.target.value; if (val === '__ADD_NEW__') { const newCat = prompt('Enter new category name:'); if (newCat && newCat.trim() && !userCategories.includes(newCat.trim())) { setUserCategories([...userCategories, newCat.trim()]); setNewItem({...newItem, category: newCat.trim()}); } } else { setNewItem({...newItem, category: val}); } }} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`}><option value="">-- Select Category --</option>{userCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}<option value="__ADD_NEW__">+ Add New Category</option></select></div> <div><label className="block text-sm">Quantity:</label><input type="number" step="any" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} required min="0.01"/></div> <div><label className="block text-sm">Unit:</label><select value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div> <div><label className="block text-sm">Price ({userProfile.currency}):</label><input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} /></div> <div><label className="block text-sm">Purchase Date:</label><input type="date" value={newItem.purchaseDate} onChange={e => setNewItem({...newItem, purchaseDate: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} /></div> <div><label className="block text-sm">Expiry Date:</label><input type="date" value={newItem.expiryDate} onChange={e => setNewItem({...newItem, expiryDate: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} /></div> </div> <div><label className="block text-sm">Description:</label><textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} rows="2"></textarea></div> <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={() => {setShowAddItemModal({show: false, path: ''}); setEditingItemId(null);}} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CANCEL]</button><button type="submit" className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>{editingItemId ? '[SAVE CHANGES]' : '[ADD ITEM]'}</button></div> </form> </div> </div> )}
      {showChat && ( <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}> <div className={`${ASCII_COLORS.modalBg} p-4 rounded-lg shadow-xl w-full max-w-2xl border-2 ${ASCII_COLORS.border} h-[80vh] flex flex-col`}> <div className="flex justify-between items-center mb-3"> <h2 className={`text-xl font-bold ${ASCII_COLORS.accent} flex items-center`}><BrainCircuit className="mr-2"/>S.M.A.R.T.I.E. Assistant</h2> <button onClick={() => setShowChat(false)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-full ${ASCII_COLORS.buttonHoverBg}`}><XCircle/></button> </div> <div className="flex-grow overflow-y-auto pr-2 space-y-4 text-sm"> {chatHistory.map((msg, index) => ( <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}> {msg.role === 'model' && <div className={`p-2 rounded-full ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border}`}><Bot className="w-5 h-5"/></div>} <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-gray-800' : 'bg-zinc-800'}`}>{msg.parts[0].text}</div> </div> ))} {isGeminiLoading && <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border}`}><Bot className="w-5 h-5 animate-pulse"/></div><div className="p-3 rounded-lg bg-zinc-800 animate-pulse">[[ PROCESSING... ]]</div></div>} <div ref={chatMessagesEndRef} /> </div> <form onSubmit={(e) => { e.preventDefault(); handleAskGemini(chatInput); }} className="mt-4 flex gap-2"> <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about your inventory..." className={`flex-grow p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg}`} disabled={isGeminiLoading} /> <button type="submit" className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} disabled={isGeminiLoading}><Send/></button> </form> </div> </div> )}
      
      <header className="flex flex-wrap items-center justify-between mb-6 border-b-2 pb-4 border-dashed border-yellow-700">
        <h1 className={`${ASCII_COLORS.accent} text-2xl sm:text-3xl font-bold`}>[ INVENTORY OS v2.4 ]</h1>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <button onClick={() => setShowSettingsModal(true)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="Settings"><Settings/></button>
          <button onClick={() => setShowInfoModal(true)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="Info"><Info/></button>
          <button disabled className={`${ASCII_COLORS.buttonBg} p-2 rounded-md border ${ASCII_COLORS.border} opacity-50 cursor-not-allowed`} title="AI Assistant (Coming Soon)"><BrainCircuit/></button>
          <button onClick={() => { setShowBucket(!showBucket); setItemToMove(null); }} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} relative`} title="Bucket">
            <ShoppingCart/>
            {bucketItems.length > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{bucketItems.length}</span>}
          </button>
        </div>
      </header>
      
      <main>
        {showBucket && !itemToMove ? (
          <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${ASCII_COLORS.accent}`}>[ BUCKET ]</h2>
              <button onClick={() => setShowBucket(false)} className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>CLOSE</button>
            </div>
            {bucketItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {bucketItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    context="bucket"
                    currency={userProfile.currency}
                    onMoveClick={(item) => setItemToMove({item, originalPath: `users/${userId}/bucket/${item.id}`})}
                    onEditClick={(item) => {}}
                    onDeleteClick={async (item) => {
                      handleConfirm(async () => {
                        await deleteDoc(doc(`users/${userId}/bucket`, item.id));
                        showNotification(`"${item.name}" removed from bucket.`);
                      }, `Remove "${item.name}" from bucket?`);
                    }}
                    onUpdateQuantity={(item, amount) => {}}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center py-8">Bucket is empty.</p>
            )}
          </div>
        ) : containerToMove ? (
            <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
                <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>Move Container: {containerToMove.name}</h2>
                <p>Select the new destination room:</p>
                <ul className="h-48 overflow-y-auto border border-yellow-700 p-2 rounded-md my-4">
                  {rooms.filter(r => r.id !== selectedRoomId).map(r => <li key={r.id} onClick={() => moveContainer(containerToMove, r.id)} className="p-2 rounded cursor-pointer hover:bg-gray-700">{r.name}</li>)}
                </ul>
                <button onClick={() => setContainerToMove(null)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} py-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CANCEL MOVE]</button>
            </div>
        ) : itemToMove ? (
          <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
            <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>Move Item: {itemToMove.item.name}</h2>
            <p className="mb-4">Select destination or move to bucket:</p>
            <div className="mb-4">
              <button onClick={() => moveItemToBucket(itemToMove.item, itemToMove.originalPath)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} mr-2`}>
                <ShoppingCart className="inline w-4 h-4 mr-1"/>MOVE TO BUCKET
              </button>
              <button onClick={() => setItemToMove(null)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>CANCEL</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="font-bold mb-2">Warehouses:</h3>
                <ul className="space-y-1">{warehouses.map(w => <li key={w.id} onClick={() => setSelectedWarehouseId(w.id)} className={`p-2 rounded cursor-pointer ${selectedWarehouseId === w.id ? 'bg-yellow-600 text-black' : 'hover:bg-gray-700'}`}>{w.name}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-bold mb-2">Rooms:</h3>
                {selectedWarehouseId ? <ul className="space-y-1">{rooms.map(r => <li key={r.id} onClick={() => setSelectedRoomId(r.id)} className={`p-2 rounded cursor-pointer ${selectedRoomId === r.id ? 'bg-yellow-600 text-black' : 'hover:bg-gray-700'}`}>{r.name}</li>)}</ul> : <p className="text-sm opacity-50">Select warehouse first</p>}
              </div>
              <div>
                <h3 className="font-bold mb-2">Containers:</h3>
                {selectedRoomId ? <ul className="space-y-1">{shelves.map(s => <li key={s.id} onClick={() => {
                  const destPath = `users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${s.id}/items`;
                  if (itemToMove.originalPath.includes('/bucket/')) {
                    moveItemFromBucket(itemToMove.item, destPath);
                  } else {
                    // Move item between containers
                    moveItemToBucket(itemToMove.item, itemToMove.originalPath).then(() => {
                      const bucketPath = `users/${userId}/bucket`;
                      // Find the item we just moved
                      getDocs(collection(bucketPath)).then(snapshot => {
                        const movedItem = snapshot.docs.find(d => d.data().name === itemToMove.item.name);
                        if (movedItem) {
                          moveItemFromBucket({...movedItem.data(), id: movedItem.id}, destPath);
                        }
                      });
                    });
                  }
                }} className="p-2 rounded cursor-pointer hover:bg-green-600">{s.name}</li>)}</ul> : <p className="text-sm opacity-50">Select room first</p>}
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold">WAREHOUSES</h2><button onClick={() => createEntity('warehouse')} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}><Plus/></button></div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px]`}><ul className="space-y-1">{warehouses.map(w => (<li key={w.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedWarehouseId === w.id ? 'bg-yellow-600 text-black' : 'hover:bg-gray-700'}`} onClick={() => { setSelectedWarehouseId(w.id); setSelectedRoomId(null); setSelectedShelfId(null); }}><span className="flex items-center"><Home className="w-4 h-4 mr-2"/>{w.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); renameEntity('warehouse', w); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('warehouse', w); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
          </div>
          <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2"><h2 className={`text-xl font-bold ${!selectedWarehouseId ? 'opacity-50' : ''}`}>ROOMS</h2><button onClick={() => createEntity('room')} disabled={!selectedWarehouseId} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}><Plus/></button></div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px]`}><ul className="space-y-1">{rooms.map(r => (<li key={r.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedRoomId === r.id ? 'bg-yellow-600 text-black' : 'hover:bg-gray-700'}`} onClick={() => { setSelectedRoomId(r.id); setSelectedShelfId(null); }}><span className="flex items-center"><Box className="w-4 h-4 mr-2"/>{r.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); renameEntity('room', r); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('room', r); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
          </div>
          <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2"><h2 className={`text-xl font-bold ${!selectedRoomId ? 'opacity-50' : ''}`}>CONTAINERS</h2><button onClick={() => createEntity('shelf')} disabled={!selectedRoomId} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}><Plus/></button></div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px]`}><ul className="space-y-1">{shelves.map(s => (<li key={s.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedShelfId === s.id ? 'bg-yellow-600 text-black' : 'hover:bg-gray-700'}`} onClick={() => setSelectedShelfId(s.id)}><span className="flex items-center"><List className="w-4 h-4 mr-2"/>{s.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); setContainerToMove(s); }} className="p-1 hover:text-blue-400"><ChevronRight size={16}/></button><button onClick={(e) => { e.stopPropagation(); renameEntity('shelf', s); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete('shelf', s); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
          </div>
        </div>
        
        {/* Items View */}
        <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className={`text-xl font-bold ${ASCII_COLORS.accent}`}>{selectedShelf?.name || 'Select a container to see items'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddItemModal({show: true, path: currentPath})} disabled={!currentPath} className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}><Plus className="w-4 h-4 mr-1"/>ADD ITEM</button>
              </div>
            </div>
             {currentItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentItems.map(item => <ItemCard key={item.id} item={item} context="storage" currency={userProfile.currency} onMoveClick={(item) => setItemToMove({item, originalPath: `${currentPath}/${item.id}`})} onEditClick={(item) => handleEditItem(item, currentPath)} onDeleteClick={(item) => handleDeleteItem(item, currentPath)} onUpdateQuantity={(item, amount) => handleUpdateQuantity(item, amount, currentPath)} />)}
              </div>
            ) : (
              <p className="text-center py-8">{currentPath ? 'No items here. Add one!' : 'Select a location to view items.'}</p>
            )}
         </div>
        </>
        )}
      </main>
    </div>
  );
}

// ... (Весь остальной код MainInventoryApp, компоненты, функции, UI и т.д. — как в вашем большом коде выше) ...

// --- Sub-components ---
// Remove the ItemCard component definition
// ... existing code ... 