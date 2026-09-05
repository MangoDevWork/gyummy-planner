/**
 * Resizes and compresses an uploaded image file into a lightweight WebP/JPEG base64 Data URL.
 * Keeps data small for lightning-fast IndexedDB storage, cloud sync, and lightweight Zip exports.
 */
export function compressImage(
  file: File,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/webp for 40%+ better compression, fallback to image/jpeg
        let dataUrl = '';
        try {
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl.startsWith('data:image/webp')) {
            dataUrl = webpUrl;
          }
        } catch {
          // WebP not supported
        }

        if (!dataUrl) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Re-compresses an existing oversized data URL into a lightweight image (~25KB)
 */
export function recompressDataUrl(
  dataUrl: string,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.65
): Promise<string> {
  // If already small (< 40KB) or not a data URL, return as-is
  if (!dataUrl.startsWith('data:image/') || dataUrl.length < 40000) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let compressed = '';
      try {
        const webpUrl = canvas.toDataURL('image/webp', quality);
        if (webpUrl.startsWith('data:image/webp')) {
          compressed = webpUrl;
        }
      } catch {
        // Fallback
      }

      if (!compressed) {
        compressed = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
