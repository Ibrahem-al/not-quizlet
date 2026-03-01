/**
 * StudyFlow utilities: UUID, timestamps, image compression.
 */

/**
 * Generate UUID v4 for set/card ids.
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Current timestamp (ms).
 */
export function timestamp(): number {
  return Date.now();
}

/**
 * Compress image to base64: max width 800px, target under maxKb.
 * Uses canvas resize + quality to stay under 500kb per image.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  maxKb = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.9;
      const tryEncode = () => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeKb = (dataUrl.length * 3) / 4 / 1024;
        if (sizeKb <= maxKb || quality <= 0.1) {
          resolve(dataUrl);
        } else {
          quality -= 0.1;
          tryEncode();
        }
      };
      tryEncode();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
