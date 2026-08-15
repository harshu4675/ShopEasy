/**
 * Image Proxy Route.
 *
 * Proxies product images from external URLs to avoid CORS/hotlinking issues.
 * GET /api/image-proxy?url=<encoded-url>
 */

const express = require('express');
const router = express.Router();

const PROXY_TIMEOUT = 10000; // 10 seconds
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/image-proxy
 * Proxies an external image through the backend.
 */
router.get('/', async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow http/https
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/avif,image/*,*/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Image fetch failed' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ error: 'Image too large' });
    }

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'Access-Control-Allow-Origin': '*',
    });

    response.body.pipe(res);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Image proxy timeout' });
    }
    console.error('[ImageProxy] Error:', err.message);
    res.status(500).json({ error: 'Image proxy failed' });
  }
});

module.exports = router;