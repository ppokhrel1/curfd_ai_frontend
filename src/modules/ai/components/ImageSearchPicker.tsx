import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ImageSearchPayload } from '../types/chat.type';

interface ImageSearchPickerProps {
  payload: ImageSearchPayload;
  onSelect: (imageUrl: string) => void;
}

export const ImageSearchPicker: React.FC<ImageSearchPickerProps> = ({
  payload,
  onSelect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const handleSelectImage = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === null) return;
    setIsLoading(true);
    onSelect(payload.image_urls[selectedIndex]);
  };

  return (
    <>
      {/* Fullscreen lightbox */}
      {expandedUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setExpandedUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={expandedUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Image grid — separated from the message bubble */}
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {payload.image_urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group">
              <button
                onClick={() => handleSelectImage(index)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all w-full aspect-square ${
                  selectedIndex === index
                    ? 'border-primary-500 ring-2 ring-primary-300 shadow-md'
                    : 'border-neutral-200 hover:border-neutral-400'
                } bg-neutral-50`}
                disabled={isLoading}
              >
                <img
                  src={url}
                  alt={`Option ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f5f5f4" width="100" height="100"/%3E%3Ctext x="50" y="54" text-anchor="middle" font-size="12" fill="%23a3a3a3"%3E%3F%3C/text%3E%3C/svg%3E';
                  }}
                />
                {selectedIndex === index && (
                  <div className="absolute inset-0 bg-primary-500/15 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shadow">
                      ✓
                    </div>
                  </div>
                )}
              </button>
              {/* Expand button */}
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedUrl(url); }}
                className="absolute top-1.5 right-1.5 p-1 bg-black/40 hover:bg-black/60 rounded-md text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                title="View full size"
              >
                ⤢
              </button>
            </div>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-neutral-400">
            {selectedIndex !== null
              ? `Image ${selectedIndex + 1} selected`
              : `${payload.image_urls.length} results`}
          </span>
          <button
            onClick={handleConfirm}
            disabled={selectedIndex === null || isLoading}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedIndex === null || isLoading
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate 3D'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ImageSearchPicker;
