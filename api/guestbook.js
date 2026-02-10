// Rate limiting: simple in-memory IP map (resets on cold start)
const rateMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 60 seconds
const RATE_LIMIT_MAX = 3; // max submissions per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  const { name, location, message, website } = req.body || {};

  // Honeypot: reject if website field is filled
  if (website) {
    return res.status(200).json({ success: true }); // Silent success for bots
  }

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (name.trim().length > 50) {
    return res.status(400).json({ error: 'Name must be 50 characters or less' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.trim().length > 500) {
    return res.status(400).json({ error: 'Message must be 500 characters or less' });
  }
  if (location && typeof location === 'string' && location.trim().length > 50) {
    return res.status(400).json({ error: 'Location must be 50 characters or less' });
  }

  // No URLs in message
  const urlPattern = /https?:\/\/|www\./i;
  if (urlPattern.test(message)) {
    return res.status(400).json({ error: 'URLs are not allowed in messages' });
  }
  if (urlPattern.test(name)) {
    return res.status(400).json({ error: 'URLs are not allowed in name' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const OWNER = 'andrea-antal';
  const REPO = 'drealabs';
  const FILE_PATH = 'data/guestbook.json';
  const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

  try {
    // 1. Fetch current file from GitHub
    const getResponse = await fetch(API_BASE, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'drealabs-guestbook'
      }
    });

    if (!getResponse.ok) {
      const errText = await getResponse.text();
      console.error('GitHub GET failed:', getResponse.status, errText);
      return res.status(500).json({ error: 'Failed to read guestbook' });
    }

    const fileData = await getResponse.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );

    // 2. Append new entry
    const newEntry = {
      name: name.trim(),
      location: location && typeof location === 'string' ? location.trim() || null : null,
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    currentContent.unshift(newEntry); // Newest first

    // 3. Commit updated file back
    const updatedContent = Buffer.from(
      JSON.stringify(currentContent, null, 2) + '\n'
    ).toString('base64');

    const putResponse = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'drealabs-guestbook'
      },
      body: JSON.stringify({
        message: `guestbook: ${newEntry.name} signed`,
        content: updatedContent,
        sha: fileData.sha
      })
    });

    if (!putResponse.ok) {
      const errText = await putResponse.text();
      console.error('GitHub PUT failed:', putResponse.status, errText);
      return res.status(500).json({ error: 'Failed to save entry' });
    }

    return res.status(200).json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Guestbook API error:', error);
    return res.status(500).json({ error: 'Failed to submit entry. Please try again.' });
  }
}
