import React from 'react';
import { AITryOn } from './AITryOn';

interface HairTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookShade?: (styleName: string, shadeName: string, price?: string, duration?: string) => void;
}

export function HairTryOnModal({ isOpen, onClose, onBookShade }: HairTryOnModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
      <div className="relative bg-surface w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-outline/10 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors shadow-md border border-outline/10"
          title="Close Try-On Studio"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <AITryOn
          onBookStyle={(styleName, shadeName, price, duration) => {
            if (onBookShade) {
              onBookShade(styleName, shadeName, price, duration);
            }
            onClose();
          }}
        />
      </div>
    </div>
  );
}

