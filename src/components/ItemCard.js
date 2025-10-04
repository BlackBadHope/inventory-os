import React from 'react';
import {
  DollarSign,
  Move,
  Edit,
  Trash2,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Calendar
} from 'lucide-react';
import { ASCII_COLORS } from '../lib/constants';
import { isExpired } from '../lib/utils';

function ItemCard({ item, context, currency, onMoveClick, onEditClick, onDeleteClick, onToggleTransfer, onUpdateQuantity }) {
  const safeItem = { ...item, quantity: parseFloat(item.quantity) || 0 };
  const isItemExpired = isExpired(item.expiryDate);

  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(0, safeItem.quantity + delta);
    onUpdateQuantity(item, newQuantity);
  };

  const handleMove = () => {
    onMoveClick(item);
  };

  const handleEdit = () => {
    onEditClick(item);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      onDeleteClick(item);
    }
  };

  return (
    <div className={`${ASCII_COLORS.cardBg} p-4 rounded-lg border-2 ${ASCII_COLORS.border} ${isItemExpired ? 'border-red-500' : ''} fade-in card-hover`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{item.name}</h3>
        <div className="flex space-x-1">
          <button onClick={handleMove} className={`${ASCII_COLORS.buttonBg} p-1 rounded ${ASCII_COLORS.buttonHoverBg}`} title="Move">
            <Move size={16} />
          </button>
          <button onClick={handleEdit} className={`${ASCII_COLORS.buttonBg} p-1 rounded ${ASCII_COLORS.buttonHoverBg}`} title="Edit">
            <Edit size={16} />
          </button>
          <button onClick={handleDelete} className={`${ASCII_COLORS.buttonBg} p-1 rounded ${ASCII_COLORS.buttonHoverBg}`} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Quantity:</span>
          <div className="flex items-center space-x-2">
            <button onClick={() => handleQuantityChange(-1)} className={`${ASCII_COLORS.buttonBg} p-1 rounded ${ASCII_COLORS.buttonHoverBg}`}>
              <Minus size={14} />
            </button>
            <span>{safeItem.quantity} {item.unit}</span>
            <button onClick={() => handleQuantityChange(1)} className={`${ASCII_COLORS.buttonBg} p-1 rounded ${ASCII_COLORS.buttonHoverBg}`}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {item.category && (
          <div className="flex justify-between items-center">
            <span className="text-sm">Category:</span>
            <span>{item.category}</span>
          </div>
        )}

        {item.price && (
          <div className="flex justify-between items-center">
            <span className="text-sm flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Price:
            </span>
            <span>{item.price} {currency}</span>
          </div>
        )}

        {item.expiryDate && (
          <div className="flex justify-between items-center">
            <span className="text-sm flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Expiry:
            </span>
            <span className={isItemExpired ? 'text-red-500' : ''}>
              {new Date(item.expiryDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {item.description && (
        <div className="mt-3 text-sm">
          <p className="text-gray-400">{item.description}</p>
        </div>
      )}

      {context === 'bucket' && item.destination && (
        <div className="mt-2 text-xs p-2 bg-gray-700 rounded-md border border-yellow-700">
          <p className="font-bold">DESTINATION:</p>
          <p>{`${item.destination.warehouseName} > ${item.destination.roomName} > ${item.destination.shelfName}`}</p>
        </div>
      )}

      <div className="flex space-x-1 mt-3 p-2 border-t border-gray-700">
        {context === 'bucket' && item.destination && (
          <button onClick={() => onToggleTransfer(item)} className="p-2 text-green-400" title="Mark for transfer">
            {item.isReadyToTransfer ? <CheckSquare /> : <Square />}
          </button>
        )}
        <button onClick={handleMove} className={`flex-1 ${ASCII_COLORS.button} p-2 rounded-md ${ASCII_COLORS.buttonHover} flex items-center justify-center text-xs border ${ASCII_COLORS.border}`}>
          <Move className="w-3 h-3 mr-1"/>
          {context === 'bucket' ? 'PATH' : 'MOVE'}
        </button>
        <button onClick={handleEdit} className={`flex-1 ${ASCII_COLORS.button} p-2 rounded-md ${ASCII_COLORS.buttonHover} flex items-center justify-center text-xs border ${ASCII_COLORS.border}`}>
          <Edit className="w-3 h-3 mr-1"/>
          EDIT
        </button>
        <button onClick={handleDelete} className={`flex-1 ${ASCII_COLORS.button} text-red-400 p-2 rounded-md hover:bg-red-900 flex items-center justify-center text-xs border ${ASCII_COLORS.border}`}>
          <Trash2 className="w-3 h-3 mr-1"/>
          DELETE
        </button>
      </div>
    </div>
  );
}

export default ItemCard; 