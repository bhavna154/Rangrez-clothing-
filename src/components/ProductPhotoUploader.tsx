import React, { useState, useRef } from 'react';
import { Upload, Trash2, Star, ArrowLeft, ArrowRight, Image as ImageIcon, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { compressAndResizeImage, uploadImageToServer } from '../utils/imageCompressor.ts';

interface ProductPhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  token: string | null;
  onError?: (msg: string) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const ProductPhotoUploader: React.FC<ProductPhotoUploaderProps> = ({
  images,
  onChange,
  token,
  onError,
  title,
  subtitle,
  compact = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out any empty strings
  const validImages = images.filter(img => Boolean(img && img.trim()));

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLocalError(null);
    setIsUploading(true);
    setUploadProgress({ total: files.length, done: 0 });

    const newUploadedUrls: string[] = [];
    const fileList = Array.from(files);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        try {
          // 1. Compress and resize to max 1600px WebP
          const compressed = await compressAndResizeImage(file, 1600, 1600, 0.85);

          // 2. Upload to server (or fallback to compressed dataUrl)
          let finalUrl = compressed.dataUrl;
          if (token) {
            finalUrl = await uploadImageToServer(compressed, token);
          }
          newUploadedUrls.push(finalUrl);
        } catch (err: any) {
          console.error(`Error processing file ${file.name}:`, err);
          const msg = `Failed to process ${file.name}: ${err.message || 'Unknown error'}`;
          setLocalError(msg);
          if (onError) onError(msg);
        }

        setUploadProgress({ total: fileList.length, done: i + 1 });
      }

      if (newUploadedUrls.length > 0) {
        onChange([...validImages, ...newUploadedUrls]);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const copy = [...validImages];
    const [selected] = copy.splice(index, 1);
    copy.unshift(selected);
    onChange(copy);
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const copy = [...validImages];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onChange(copy);
  };

  const moveRight = (index: number) => {
    if (index >= validImages.length - 1) return;
    const copy = [...validImages];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onChange(copy);
  };

  const removeImage = (index: number) => {
    const copy = validImages.filter((_, i) => i !== index);
    onChange(copy.length === 0 ? [''] : copy);
  };

  const handleAddManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    onChange([...validImages, manualUrl.trim()]);
    setManualUrl('');
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-semibold text-white">
            {title || `Product Photos (${validImages.length})`}
          </label>
          <p className="text-[11px] text-gray-400">
            {subtitle || 'Upload from phone gallery (front, back, model shots). Auto-resized & compressed to 1600px.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Gallery Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Compressing...' : 'Upload Photos'}</span>
          </button>

          {/* Hidden File Input for Phone Gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture={undefined}
            className="hidden"
            onChange={handleFilesSelected}
          />

          {/* Toggle Manual Image URL */}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="px-2.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-gray-300 hover:text-white text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LinkIcon className="w-3 h-3 text-[#E07A24]" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      {/* Progress & Error indicators */}
      {isUploading && uploadProgress && (
        <div className="bg-[#1A1E29] border border-[#E07A24]/40 rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-white">
            <span className="flex items-center gap-1.5 text-[#E07A24] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#E07A24] animate-ping" />
              Compressing &amp; uploading photos...
            </span>
            <span className="font-mono text-gray-400">
              {uploadProgress.done} of {uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-[#0B0D12] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#E07A24] h-full transition-all duration-200"
              style={{
                width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {localError && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{localError}</span>
          <button type="button" onClick={() => setLocalError(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Manual URL Input Bar */}
      {showUrlInput && (
        <div className="p-3 bg-[#0B0D12] border border-[#232938] rounded-lg space-y-2">
          <label className="text-[11px] font-semibold text-gray-300 block">
            Add Image via Direct URL / Cloud Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://... or /src/assets/..."
              className="flex-1 bg-[#12151D] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#E07A24]"
            />
            <button
              type="button"
              onClick={handleAddManualUrl}
              className="px-3 py-1.5 bg-[#E07A24] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#C96617]"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Thumbnails Grid */}
      {validImages.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed border-[#232938] hover:border-[#E07A24]/60 rounded-xl text-center bg-[#0B0D12]/60 cursor-pointer transition-colors ${
            compact ? 'p-4' : 'p-8'
          }`}
        >
          <ImageIcon className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} mx-auto text-gray-500 mb-1.5`} />
          <p className="text-xs font-semibold text-white">No photos added yet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Tap to open phone gallery or drag &amp; drop photos here (Front, Back, Model)
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
          {validImages.map((imgUrl, idx) => {
            const isMain = idx === 0;
            const shotLabel = idx === 0 ? 'Front' : idx === 1 ? 'Back' : idx === 2 ? 'Model' : `Photo ${idx + 1}`;
            return (
              <div
                key={idx}
                className={`group relative bg-[#0B0D12] border rounded-xl overflow-hidden p-2 flex flex-col justify-between transition-all ${
                  isMain ? 'border-[#E07A24] ring-1 ring-[#E07A24]/40' : 'border-[#232938] hover:border-gray-600'
                }`}
              >
                {/* Shot tag badge */}
                <span className={`absolute top-3 left-3 z-10 px-2 py-0.5 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow flex items-center gap-1 ${
                  isMain ? 'bg-[#E07A24]' : 'bg-[#1A1E29] border border-[#2B3245]'
                }`}>
                  {isMain && <Star className="w-2.5 h-2.5 fill-current" />} {shotLabel}
                </span>

                {/* Aspect Ratio Image Preview */}
                <div className="w-full aspect-square bg-[#12151D] rounded-lg overflow-hidden relative flex items-center justify-center">
                  <img
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Visual fallback
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Controls Bar */}
                <div className="mt-2 pt-2 border-t border-[#1C212E] flex items-center justify-between gap-1 text-[11px]">
                  {/* Left / Right reorder */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLeft(idx)}
                      title="Move Left"
                      className="p-1 rounded bg-[#1A1E29] hover:bg-[#232938] text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx >= validImages.length - 1}
                      onClick={() => moveRight(idx)}
                      title="Move Right"
                      className="p-1 rounded bg-[#1A1E29] hover:bg-[#232938] text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Make Main button */}
                  {!isMain ? (
                    <button
                      type="button"
                      onClick={() => setAsMain(idx)}
                      className="text-[10px] text-[#E07A24] hover:underline font-semibold"
                    >
                      Set Main
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Cover
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    title="Delete Photo"
                    className="p-1 rounded hover:bg-rose-950/60 text-gray-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
