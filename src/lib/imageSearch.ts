export interface ImageResult {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl?: string;
  source: 'google' | 'bing' | 'wikimedia' | 'unsplash' | 'pexels';
  attribution?: string;
}

const UNSPLASH_ACCESS_KEY = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_UNSPLASH_ACCESS_KEY : '';
const PEXELS_API_KEY = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_PEXELS_API_KEY : '';
const GOOGLE_CSE_KEY = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_CSE_KEY : '';
const GOOGLE_CSE_CX = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GOOGLE_CSE_CX : '';
const BING_API_KEY = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_BING_API_KEY : '';

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? '').trim();
}

/** Sanitize and truncate for search query (max 100 chars). */
export function sanitizeSearchQuery(text: string, maxLen = 100): string {
  return stripHtml(text).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/** Make query image-focused so results match the word/concept (e.g. "apple" → "apple photo"). */
function toImageSearchQuery(q: string): string {
  const t = q.trim();
  if (!t) return 'vocabulary';
  const lower = t.toLowerCase();
  const alreadyImage =
    /\b(photo|image|picture|diagram|map|chart|illustration|drawing|icon|logo)\b/.test(lower);
  const wordCount = t.split(/\s+/).length;
  if (!alreadyImage && wordCount <= 3) return t + ' photo';
  return t;
}

/** CORS proxy fallbacks when direct fetch is blocked. */
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

/** Load image via <img> + canvas (works when server allows cross-origin image but not fetch). */
function loadImageViaCanvas(imageUrl: string, maxWidth: number, maxKb: number): Promise<string> {
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
          if (sizeKb <= maxKb || quality <= 0.2) resolve(dataUrl);
          else {
            quality -= 0.1;
            tryEncode();
          }
        };
        tryEncode();
      } catch {
        reject(new Error('Image could not be used (CORS)'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/** Fetch image from URL and convert to base64. Tries direct fetch, then proxies, then img+canvas. */
export async function fetchAndOptimizeImage(imageUrl: string, maxWidth = 800, maxKb = 500): Promise<string> {
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }
  const tryFetch = async (url: string): Promise<Blob> => {
    const res = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
    return res.blob();
  };

  let blob: Blob | null = null;
  try {
    blob = await tryFetch(trimmed);
  } catch {
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(trimmed);
        blob = await tryFetch(proxyUrl);
        break;
      } catch {
        continue;
      }
    }
  }

  if (blob) {
    const file = new File([blob], 'image', { type: blob.type || 'image/jpeg' });
    return compressImageFile(file, maxWidth, maxKb);
  }

  try {
    return await loadImageViaCanvas(trimmed, maxWidth, maxKb);
  } catch {
    throw new Error('Could not load image from link. Try a direct image URL (e.g. ending in .jpg/.png) or upload a file.');
  }
}

/** Compress a File to base64 (JPEG or WebP), target under maxKb. */
function compressImageFile(file: File, maxWidth: number, maxKb: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.crossOrigin = 'anonymous';
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
      const type = 'image/jpeg';
      let quality = 0.8;
      const tryEncode = () => {
        const dataUrl = canvas.toDataURL(type, quality);
        const sizeKb = (dataUrl.length * 3) / 4 / 1024;
        if (sizeKb <= maxKb || quality <= 0.2) {
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

/** Google Custom Search (image search) – returns top images for the query, paginated. */
async function searchGoogleImages(query: string, page = 1, perPage = 10): Promise<ImageResult[]> {
  if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_CX) return [];
  const q = query.trim() || 'vocabulary';
  const num = Math.min(10, Math.max(1, perPage));
  const start = (page - 1) * num + 1;
  if (start > 100) return []; // API max 100 results total
  const params = new URLSearchParams({
    key: GOOGLE_CSE_KEY,
    cx: GOOGLE_CSE_CX,
    q,
    searchType: 'image',
    num: String(num),
    start: String(start),
    safe: 'active',
    imgType: 'photo',
  });
  const res = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params}`);
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT');
    const body = await res.text();
    throw new Error(`Google search error: ${res.status}: ${body.slice(0, 100)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      link: string;
      image?: { thumbnailLink?: string; contextLink?: string };
      title?: string;
      displayLink?: string;
    }>;
  };
  const items = data.items ?? [];
  return items.map((item, i) => ({
    id: `google-${start + i}-${item.link.slice(-24).replace(/[^a-zA-Z0-9]/g, '')}`,
    url: item.link,
    thumb: item.image?.thumbnailLink ?? item.link,
    author: item.displayLink ?? 'Google',
    authorUrl: item.image?.contextLink,
    source: 'google' as const,
    attribution: item.title,
  }));
}

/** Wikimedia Commons API – no API key required, CORS-friendly. */
async function searchWikimedia(query: string, limit = 12): Promise<ImageResult[]> {
  const endpoint = 'https://commons.wikimedia.org/w/api.php';
  const searchTerm = toImageSearchQuery(query.trim() || 'vocabulary');
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: searchTerm,
    srnamespace: '6',
    format: 'json',
    origin: '*',
    srlimit: String(limit),
  });
  const res = await fetch(`${endpoint}?${params}`);
  if (!res.ok) throw new Error(`Wikimedia error: ${res.status}`);
  const data = (await res.json()) as {
    query?: { search?: Array<{ pageid: number; title: string }> };
  };
  const search = data.query?.search ?? [];
  return search.map((item) => {
    const encoded = encodeURIComponent(item.title);
    const thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=300`;
    const full = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=800`;
    return {
      id: `wikimedia-${item.pageid}`,
      url: full,
      thumb,
      author: 'Wikimedia Commons',
      source: 'wikimedia' as const,
      attribution: `Wikimedia Commons: ${item.title}`,
    };
  });
}

async function searchBing(query: string, page = 1, _perPage = 9): Promise<ImageResult[]> {
  if (!BING_API_KEY) return [];
  const count = 12; // Bing API uses count=12 per request
  const offset = (page - 1) * count;
  try {
    const { searchBingImages } = await import('./bingImageSearch');
    const list = await searchBingImages(query, offset);
    return list.map((img) => ({
      id: img.id,
      url: img.full,
      thumb: img.thumb,
      author: img.attribution,
      authorUrl: undefined,
      source: 'bing' as const,
      attribution: img.attribution,
    }));
  } catch {
    return [];
  }
}

async function searchUnsplash(query: string, page = 1, perPage = 9): Promise<ImageResult[]> {
  const key = UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const q = encodeURIComponent(toImageSearchQuery(query || 'vocabulary'));
  const url = `https://api.unsplash.com/search/photos?query=${q}&per_page=${perPage}&page=${page}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (res.status === 403) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ id: string; urls: { regular: string; small: string }; user: { name: string; links: { html: string } } }> };
  const results = data.results ?? [];
  return results.map((r) => ({
    id: `unsplash-${r.id}`,
    url: r.urls.regular,
    thumb: r.urls.small,
    author: r.user.name,
    authorUrl: r.user.links.html,
    source: 'unsplash',
  }));
}

async function searchPexels(query: string, page = 1, perPage = 9): Promise<ImageResult[]> {
  const key = PEXELS_API_KEY;
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(toImageSearchQuery(query || 'vocabulary'))}&per_page=${perPage}&page=${page}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: key },
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Pexels error: ${res.status}`);
  const data = (await res.json()) as { photos?: Array<{ id: number; src: { large: string; small: string }; photographer: string; photographer_url: string }> };
  const photos = data.photos ?? [];
  return photos.map((p) => ({
    id: `pexels-${p.id}`,
    url: p.src.large,
    thumb: p.src.small,
    author: p.photographer,
    authorUrl: p.photographer_url,
    source: 'pexels' as const,
  }));
}

export function hasImageSearchKeys(): boolean {
  return !!(GOOGLE_CSE_KEY && GOOGLE_CSE_CX) || !!BING_API_KEY || !!(UNSPLASH_ACCESS_KEY || PEXELS_API_KEY);
}

/** Prefer Google CSE when configured for better relevance. */
export function isGoogleImageSearchConfigured(): boolean {
  return !!(GOOGLE_CSE_KEY && GOOGLE_CSE_CX);
}

/** Image search is always available via Wikimedia (no API key). */
export function isImageSearchAvailable(): boolean {
  return true;
}

export class ImageSearchService {
  async search(query: string, page = 1, perPage = 9): Promise<ImageResult[]> {
    const q = query.trim() || 'vocabulary';
    const imageQuery = toImageSearchQuery(q);

    // Prefer Google Custom Search when configured (best relevance, same as Google Images)
    if (GOOGLE_CSE_KEY && GOOGLE_CSE_CX) {
      try {
        const googleResults = await searchGoogleImages(imageQuery, page, perPage);
        if (googleResults.length > 0) return googleResults;
      } catch (e) {
        if (e instanceof Error && e.message === 'RATE_LIMIT') throw e;
        // fall through to other sources
      }
    }

    try {
      const wikimedia = await searchWikimedia(imageQuery, perPage);
      if (wikimedia.length > 0) return wikimedia;
    } catch {
      // fall through
    }
    if (BING_API_KEY) {
      try {
        const bingResults = await searchBing(imageQuery, page, perPage);
        if (bingResults.length > 0) return bingResults;
      } catch {
        // fall through
      }
    }
    if (UNSPLASH_ACCESS_KEY) {
      try {
        return await searchUnsplash(imageQuery, page, perPage);
      } catch (e) {
        if (e instanceof Error && e.message === 'RATE_LIMIT' && PEXELS_API_KEY) {
          return await searchPexels(imageQuery, page, perPage);
        }
        throw e;
      }
    }
    if (PEXELS_API_KEY) {
      return await searchPexels(imageQuery, page, perPage);
    }
    return [];
  }

  async downloadAsBase64(imageUrl: string, maxKb = 500): Promise<string> {
    return fetchAndOptimizeImage(imageUrl, 800, maxKb);
  }
}

export const imageSearchService = new ImageSearchService();
