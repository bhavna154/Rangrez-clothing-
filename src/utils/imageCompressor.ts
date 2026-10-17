/**
 * Image compression and phone gallery upload helper for RANGREZ
 * Automatically downscales large phone camera photos to max 1600px (WebP/JPEG)
 * with proportional aspect ratios and high visual fidelity.
 */

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Resizes and compresses an image File from the phone gallery
 */
export async function compressAndResizeImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, don't re-compress on canvas (keep vector crispness)
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          blob: file,
          dataUrl,
          name: file.name,
          originalSize: file.size,
          compressedSize: file.size,
          width: 0,
          height: 0
        });
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file from gallery'));

    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Proportional scale down if larger than 1600px
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP, fallback to JPEG
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL(mimeType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL(mimeType, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            resolve({
              blob,
              dataUrl,
              name: file.name.replace(/\.[^/.]+$/, '') + (mimeType === 'image/webp' ? '.webp' : '.jpg'),
              originalSize: file.size,
              compressedSize: blob.size,
              width,
              height
            });
          },
          mimeType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a compressed image to /api/upload endpoint
 */
export async function uploadImageToServer(
  compressed: CompressionResult,
  token: string
): Promise<string> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        dataUrl: compressed.dataUrl,
        name: compressed.name
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.url;
  } catch (err: any) {
    // If backend upload fails, fallback to high-quality compressed dataUrl
    // so user work is never lost.
    console.warn('Backend image upload endpoint failed, falling back to data URL:', err);
    return compressed.dataUrl;
  }
}
