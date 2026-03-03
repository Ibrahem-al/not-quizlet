/**
 * StudyFlow utilities: UUID, timestamps, image compression, URL helpers.
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

/** Check if a string looks like an image URL. */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  // Must start with http
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => trimmed.includes(ext));
  // Also allow URLs that contain 'image' in the path (common for CDNs)
  const looksLikeImagePath = /\/(images?|img|photos?|pics?|media|assets)\//.test(trimmed);
  // Allow image hosting domains
  const imageHosts = ['imgur.com', 'i.imgur.com', 'ibb.co', 'postimg.cc', 'i.redd.it', 'i.stack.imgur.com'];
  const isImageHost = imageHosts.some(host => trimmed.includes(host));
  return hasImageExtension || looksLikeImagePath || isImageHost;
}

/** Extract image URL from HTML img tag. */
export function extractImageUrlFromHtml(html: string): string | null {
  if (!html || typeof html !== 'string') return null;
  // Try to find src in img tag
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    const url = imgMatch[1].trim();
    return isImageUrl(url) ? url : null;
  }
  // Try to find URLs that look like images
  const urlMatch = html.match(/https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  return null;
}

/** Download image from URL and convert to base64. */
export async function downloadImageFromUrl(
  url: string,
  maxWidth = 800,
  maxKb = 500
): Promise<string> {
  if (!isImageUrl(url)) {
    throw new Error('Invalid image URL');
  }

  // Try direct fetch first
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (response.ok) {
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('URL does not point to an image');
      }
      const file = new File([blob], 'pasted-image', { type: blob.type });
      return compressImage(file, maxWidth, maxKb);
    }
  } catch {
    // Fall through to canvas method
  }

  // Fallback: load via image element + canvas (handles CORS better)
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
        reject(new Error('Canvas not available'));
        return;
      }
      try {
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const tryEncode = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeKb = (dataUrl.length * 3) / 4 / 1024;
          if (sizeKb <= maxKb || quality <= 0.2) {
            resolve(dataUrl);
          } else {
            quality -= 0.1;
            tryEncode();
          }
        };
        tryEncode();
      } catch {
        reject(new Error('Could not process image (CORS restrictions)'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image from URL'));
    img.src = url;
  });
}
