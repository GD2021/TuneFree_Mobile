const cache = new Map<string, Promise<void>>();
const MAX_CACHE_SIZE = 500;

const pruneCache = () => {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const keys = cache.keys();
  while (cache.size > MAX_CACHE_SIZE) {
    const key = keys.next().value as string | undefined;
    if (key) cache.delete(key);
    else break;
  }
};

export const prefetchImage = (url?: string | null): Promise<void> => {
  if (!url || typeof url !== "string") return Promise.resolve();

  const cached = cache.get(url);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  })
    .then(() => {
      pruneCache();
    })
    .catch(() => {
      // Remove failed entries to allow retry
      cache.delete(url);
    });

  cache.set(url, promise);
  return promise;
};

export const clearImageCache = () => {
  cache.clear();
};
