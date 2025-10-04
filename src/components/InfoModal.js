import React from 'react';
import { X } from 'lucide-react';
import { ASCII_COLORS } from '../lib/constants';

function InfoModal({ show, onCancel }) {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg border-2 ${ASCII_COLORS.border} w-full max-w-2xl shadow-xl`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-bold ${ASCII_COLORS.text}`}>[ SYSTEM INFO ]</h2>
          <button
            onClick={onCancel}
            className={`p-2 rounded-full ${ASCII_COLORS.button} ${ASCII_COLORS.buttonHover} ${ASCII_COLORS.text}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className={`text-lg font-semibold mb-2 ${ASCII_COLORS.text}`}>Patch Notes</h3>
            <ul className={`list-disc list-inside space-y-2 ${ASCII_COLORS.text}`}>
              <li>v2.4.0 - Added AI-powered inventory suggestions</li>
              <li>v2.3.0 - Improved authorization system</li>
              <li>v2.2.0 - Added transfer bucket functionality</li>
              <li>v2.1.0 - Added bulk operations</li>
              <li>v2.0.0 - Major UI overhaul</li>
            </ul>
          </section>

          <section>
            <h3 className={`text-lg font-semibold mb-2 ${ASCII_COLORS.text}`}>Future Plans</h3>
            <ul className={`list-disc list-inside space-y-2 ${ASCII_COLORS.text}`}>
              <li>Receipt scanning for automatic inventory updates</li>
              <li>Shared storage spaces for teams</li>
              <li>Detailed notification settings</li>
              <li>Advanced analytics and reporting</li>
              <li>Mobile app with barcode scanning</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default InfoModal; 