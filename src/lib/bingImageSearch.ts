export interface BingImageResult {
  id: string;
  url: string;
  thumb: string;
  full: string;
  source: 'bing';
  attribution: string;
  title: string;
  width: number;
  height: number;
}

export async function searchBingImages(
  query: string,
  offset: number = 0
): Promise<BingImageResult[]> {
  const apiKey = import.meta.env.VITE_BING_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error('Bing API key not configured');
  }

  const params = new URLSearchParams({
    q: query,
    count: '12',
    offset: offset.toString(),
    safeSearch: 'Moderate',
    imageType: 'Photo',
  });

  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/images/search?${params.toString()}`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limit exceeded');
    throw new Error(`Bing API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.value) return [];

  return data.value.map((img: any) => ({
    id: img.imageId || img.name,
    url: img.contentUrl,
    thumb: img.thumbnailUrl,
    full: img.contentUrl,
    source: 'bing' as const,
    attribution: img.hostPageDisplayUrl || 'Bing Images',
    title: img.name || query,
    width: img.width,
    height: img.height,
  }));
}

