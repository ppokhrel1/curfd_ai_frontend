import React, { useState } from 'react';
import { ImageSearchPayload } from '../types/chat.type';

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

  const handleSelectImage = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === null) return;

    setIsLoading(true);
    const selectedUrl = payload.image_urls[selectedIndex];
    onSelect(selectedUrl);
  };

  return (
    <div className="space-y-4">
      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {payload.image_urls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            onClick={() => handleSelectImage(index)}
            className={`relative overflow-hidden rounded-lg border transition-all ${
              selectedIndex === index
                ? 'ring-2 ring-violet-500 border-violet-500'
                : 'border-neutral-700 hover:border-neutral-600'
            } bg-neutral-900 aspect-square`}
            disabled={isLoading}
          >
            {/* Image */}
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23404040" width="100" height="100"/%3E%3C/svg%3E';
              }}
            />

            {/* Selection indicator */}
            {selectedIndex === index && (
              <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center">
                <div className="text-violet-400 text-2xl">✓</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={selectedIndex === null || isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedIndex === null || isLoading
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate 3D'}
        </button>
      </div>
    </div>
  );
};

export default ImageSearchPicker;
