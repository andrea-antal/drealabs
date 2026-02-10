// Guestbook client (reads from static JSON, writes via serverless function)

// Cooldown tracking
const COOLDOWN_MS = 60000; // 60 seconds between submissions
const COOLDOWN_KEY = 'guestbook_last_submit';

export function canSubmit() {
  const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
  if (!lastSubmit) return true;
  return Date.now() - parseInt(lastSubmit, 10) > COOLDOWN_MS;
}

export function getCooldownRemaining() {
  const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
  if (!lastSubmit) return 0;
  const remaining = COOLDOWN_MS - (Date.now() - parseInt(lastSubmit, 10));
  return Math.max(0, Math.ceil(remaining / 1000));
}

function recordSubmission() {
  localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
}

// Fetch visible guestbook entries, newest first (static JSON served from CDN)
export async function fetchGuestbookEntries() {
  try {
    const response = await fetch('/data/guestbook.json?t=' + Date.now());

    if (!response.ok) {
      throw new Error(`Failed to fetch entries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching guestbook entries:', error);
    return [];
  }
}

// Submit a new guestbook entry via serverless function
export async function submitGuestbookEntry(name, location, message) {
  // Validate inputs
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name is required' };
  }
  if (!message || message.trim().length === 0) {
    return { success: false, error: 'Message is required' };
  }
  if (name.length > 50) {
    return { success: false, error: 'Name must be 50 characters or less' };
  }
  if (location && location.length > 50) {
    return { success: false, error: 'Location must be 50 characters or less' };
  }
  if (message.length > 500) {
    return { success: false, error: 'Message must be 500 characters or less' };
  }

  // Check for URLs in message (basic spam prevention)
  const urlPattern = /https?:\/\/|www\./i;
  if (urlPattern.test(message)) {
    return { success: false, error: 'URLs are not allowed in messages' };
  }

  // Check cooldown
  if (!canSubmit()) {
    const remaining = getCooldownRemaining();
    return { success: false, error: `Please wait ${remaining} seconds before posting again` };
  }

  try {
    const response = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        location: location ? location.trim() : null,
        message: message.trim()
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to submit entry' };
    }

    recordSubmission();
    return { success: true, entry: result.entry };
  } catch (error) {
    console.error('Error submitting guestbook entry:', error);
    return { success: false, error: 'Failed to submit entry. Please try again.' };
  }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}
