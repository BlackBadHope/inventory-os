import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ASCII_COLORS } from '../lib/constants';

function SettingsModal({ show, onClose, settings, onSettingsChange }) {
  if (!show) return null;

  const handleZoomIn = () => {
    const newZoom = Math.min(settings.zoom + 10, 200);
    onSettingsChange({ ...settings, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(settings.zoom - 10, 50);
    onSettingsChange({ ...settings, zoom: newZoom });
  };

  const handleReset = () => {
    onSettingsChange({ zoom: 100 });
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg border-2 ${ASCII_COLORS.border} w-full max-w-md shadow-xl`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${ASCII_COLORS.text} flex items-center`}>
            ⚙️ SETTINGS
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${ASCII_COLORS.button} ${ASCII_COLORS.buttonHover} ${ASCII_COLORS.text}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Zoom Control */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${ASCII_COLORS.text}`}>Display Scale</h3>

            <div className="flex items-center justify-between mb-4">
              <span className={`${ASCII_COLORS.text} text-sm`}>Current: {settings.zoom}%</span>
              <button
                onClick={handleReset}
                className={`flex items-center gap-2 ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} px-3 py-1 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleZoomOut}
                disabled={settings.zoom <= 50}
                className={`flex-1 flex items-center justify-center gap-2 ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ZoomOut className="w-5 h-5" />
                Smaller
              </button>

              <div className={`${ASCII_COLORS.inputBg} border ${ASCII_COLORS.border} rounded-md px-4 py-3 min-w-[80px] text-center ${ASCII_COLORS.accent} font-bold text-lg`}>
                {settings.zoom}%
              </div>

              <button
                onClick={handleZoomIn}
                disabled={settings.zoom >= 200}
                className={`flex-1 flex items-center justify-center gap-2 ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ZoomIn className="w-5 h-5" />
                Larger
              </button>
            </div>

            <div className={`mt-4 p-3 ${ASCII_COLORS.inputBg} border ${ASCII_COLORS.border} rounded-md`}>
              <p className={`text-xs ${ASCII_COLORS.text} opacity-70`}>
                💡 Tip: Adjust the scale to fit your screen size. Changes apply immediately.
              </p>
            </div>
          </div>

          {/* Future settings placeholder */}
          <div className={`p-4 border ${ASCII_COLORS.border} rounded-md bg-gray-800 bg-opacity-50`}>
            <p className={`text-sm ${ASCII_COLORS.text} opacity-60 text-center`}>
              More settings coming soon...
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} px-6 py-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
