// Supabase client for guestbook
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://dcfmauexwnlkexbjruip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZm1hdWV4d25sa2V4YmpydWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTQ4NjcsImV4cCI6MjA4NTc5MDg2N30.emZoefhHa8L5wVbZne2iq-XZwIhDHHFhpv33t6qQmf4';

// Simple Supabase client using fetch (no SDK dependency)
const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

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

// Fetch visible guestbook entries, newest first
export async function fetchGuestbookEntries() {
  const url = `${SUPABASE_URL}/rest/v1/guestbook_entries?is_visible=eq.true&order=created_at.desc&limit=50`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching guestbook entries:', error);
    return [];
  }
}

// Submit a new guestbook entry
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

  const url = `${SUPABASE_URL}/rest/v1/guestbook_entries`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        name: name.trim(),
        location: location ? location.trim() : null,
        message: message.trim()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit entry: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    recordSubmission();

    return { success: true, entry: result[0] };
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
