import { AlertCircle, CheckCircle, FileIcon, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface FileUploadProps {
  accept?: string[];
  maxSize?: number; // in bytes
  onUpload: (file: File) => Promise<void>;
  onProgress?: (progress: number) => void;
  disabled?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = ['.gltf', '.glb', '.obj', '.fbx', '.stl'],
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUpload,
  onProgress,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        };
      }

      // Check file extension
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(extension)) {
        return {
          valid: false,
          error: `Unsupported format. Accepted: ${accept.join(', ')}`,
        };
      }

      return { valid: true };
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateFile(file);

      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setSuccess(false);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      await onUpload(selectedFile);
      setSuccess(true);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
          ${isDragging ? 'border-green-500 bg-green-500/10' : 'border-neutral-700 bg-neutral-900/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-neutral-600'}
        `}
      >
        <input
          type="file"
          accept={accept.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-neutral-800 rounded-full mb-4">
            <Upload className="w-8 h-8 text-neutral-400" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            {isDragging ? 'Drop file here' : 'Upload 3D Model'}
          </h3>

          <p className="text-sm text-neutral-400 mb-4">
            Drag and drop or click to browse
          </p>

          <div className="flex flex-wrap gap-2 justify-center text-xs text-neutral-500">
            {accept.map((format) => (
              <span key={format} className="px-2 py-1 bg-neutral-800 rounded">
                {format}
              </span>
            ))}
          </div>

          <p className="text-xs text-neutral-500 mt-2">
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <FileIcon className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {!isUploading && !success && (
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-neutral-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">Upload successful!</p>
            </div>
          )}

          {/* Upload Button */}
          {!success && (
            <button
              onClick={handleUpload}
              disabled={isUploading || disabled}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Model'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
