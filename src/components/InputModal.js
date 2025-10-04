import React, { useState, useEffect } from 'react';
import { ASCII_COLORS } from '../lib/constants';

function InputModal({ show, title, label, onSubmit, onCancel, initialValue = '' }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (show) {
      setValue(initialValue);
    }
  }, [show, initialValue]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
      setValue('');
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center ${ASCII_COLORS.modalBg}`}>
      <div className={`${ASCII_COLORS.bg} p-6 rounded-lg border ${ASCII_COLORS.border} w-full max-w-md`}>
        <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.text}`}>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block mb-2 ${ASCII_COLORS.text}`}>{label}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`w-full p-2 rounded ${ASCII_COLORS.input} ${ASCII_COLORS.text} border ${ASCII_COLORS.border}`}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded ${ASCII_COLORS.button} ${ASCII_COLORS.buttonHover} ${ASCII_COLORS.text}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded ${ASCII_COLORS.accent} ${ASCII_COLORS.accentText}`}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InputModal; 