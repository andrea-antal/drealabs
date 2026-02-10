import { fetchGuestbookEntries, submitGuestbookEntry, formatRelativeTime, canSubmit, getCooldownRemaining } from './guestbook.js';

let panelElement;
let backdropElement;
let captainsLogElement;
let messageBottleElement;
let adventureModalElement;
let portfolioModalElement;
let lightboxElement;
let transitionOverlay;
let npcDialogElement;
let guestbookElement;
let isOpen = false;
let onCloseCallback = null;
let changelogLoaded = false;

// Carousel state
let currentSlide = 0;
let totalSlides = 0;
let touchStartX = 0;
let touchEndX = 0;

// NPC Dialog state
let currentDialogNPC = null;
let currentDialogIndex = 0;

async function loadChangelog() {
  if (changelogLoaded) return;

  try {
    const response = await fetch('data/changelog.json?t=' + Date.now());
    const data = await response.json();
    const container = document.querySelector('.changelog-entries');

    if (!container) return;

    // Only show the latest entry
    const latest = data.entries[0];
    if (latest) {
      container.innerHTML = `
        <div class="changelog-entry">
          <div class="changelog-version">v${latest.version}</div>
          <div class="changelog-date">${formatDate(latest.date)}</div>
          <ul class="changelog-list">
            ${latest.changes.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    changelogLoaded = true;
  } catch (e) {
    console.error('Failed to load changelog:', e);
  }
}

function formatDate(dateStr) {
  // Parse as local date to avoid timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initUI(closeCallback) {
  panelElement = document.getElementById('project-panel');
  backdropElement = document.getElementById('panel-backdrop');
  captainsLogElement = document.getElementById('captains-log');
  messageBottleElement = document.getElementById('message-bottle');
  adventureModalElement = document.getElementById('adventure-modal');
  portfolioModalElement = document.getElementById('portfolio-modal');
  lightboxElement = document.getElementById('image-lightbox');
  transitionOverlay = document.getElementById('transition-overlay');
  npcDialogElement = document.getElementById('npc-dialog');
  guestbookElement = document.getElementById('guestbook-panel');
  onCloseCallback = closeCallback;

  // Close on backdrop click
  backdropElement.addEventListener('click', closePanel);

  // Close on Escape key, carousel navigation with arrow keys
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxElement?.classList.contains('visible')) {
        closeLightbox();
      } else if (isOpen) {
        closeAll();
      }
    }
    // Arrow key navigation for carousel when panel is open (and lightbox not open)
    if (panelElement?.classList.contains('open') && !lightboxElement?.classList.contains('visible') && totalSlides > 1) {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    }
  });

  // Close button
  const closeBtn = document.getElementById('panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
  }

  // Captain's log close button
  const logCloseBtn = document.getElementById('log-close');
  if (logCloseBtn) {
    logCloseBtn.addEventListener('click', closeCaptainsLog);
  }

  // Close captain's log on click outside content
  if (captainsLogElement) {
    captainsLogElement.addEventListener('click', (e) => {
      if (e.target === captainsLogElement) {
        closeCaptainsLog();
      }
    });
  }

  // Close message bottle on click outside image (but not on the link)
  if (messageBottleElement) {
    messageBottleElement.addEventListener('click', (e) => {
      if (e.target === messageBottleElement) {
        closeMessageBottle();
      }
    });
  }

  // Adventure modal close handlers
  if (adventureModalElement) {
    adventureModalElement.addEventListener('click', (e) => {
      if (e.target === adventureModalElement) {
        closeAdventureModal();
      }
    });
    const closeBtn = adventureModalElement.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeAdventureModal);
  }

  // Portfolio modal close handlers
  if (portfolioModalElement) {
    portfolioModalElement.addEventListener('click', (e) => {
      if (e.target === portfolioModalElement) {
        closePortfolioModal();
      }
    });
    const closeBtn = portfolioModalElement.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closePortfolioModal);
  }

  // Carousel arrow click handlers
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // Carousel touch/swipe handlers
  const carousel = document.querySelector('.carousel');
  if (carousel) {
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  // Lightbox close handlers
  if (lightboxElement) {
    lightboxElement.addEventListener('click', (e) => {
      if (e.target === lightboxElement || e.target.id === 'lightbox-image') {
        closeLightbox();
      }
    });
  }

  const lightboxCloseBtn = document.getElementById('lightbox-close');
  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }

  // NPC Dialog handlers
  if (npcDialogElement) {
    // Close on backdrop click
    npcDialogElement.addEventListener('click', (e) => {
      if (e.target === npcDialogElement) {
        closeNPCDialog();
      }
    });

    // Close button
    const dialogCloseBtn = document.getElementById('dialog-close');
    if (dialogCloseBtn) {
      dialogCloseBtn.addEventListener('click', closeNPCDialog);
    }

    // Continue button
    const dialogNextBtn = npcDialogElement.querySelector('.dialog-next');
    if (dialogNextBtn) {
      dialogNextBtn.addEventListener('click', advanceDialog);
    }
  }

  // Guestbook handlers
  if (guestbookElement) {
    // Close button
    const guestbookCloseBtn = document.getElementById('guestbook-close');
    if (guestbookCloseBtn) {
      guestbookCloseBtn.addEventListener('click', closeGuestbook);
    }

    // Form submission
    const guestbookForm = document.getElementById('guestbook-form');
    if (guestbookForm) {
      guestbookForm.addEventListener('submit', handleGuestbookSubmit);

      // Character count for message
      const messageInput = guestbookForm.querySelector('textarea[name="message"]');
      const charCount = guestbookForm.querySelector('.guestbook-char-count');
      if (messageInput && charCount) {
        messageInput.addEventListener('input', () => {
          charCount.textContent = `${messageInput.value.length}/500`;
        });
      }
    }
  }
}

export function showPanel(project) {
  if (!panelElement || !project) return;

  // Populate content
  const title = panelElement.querySelector('.panel-title');
  const description = panelElement.querySelector('.panel-description');
  const techContainer = panelElement.querySelector('.panel-tech');
  const liveLink = panelElement.querySelector('.panel-link-live');
  const githubLink = panelElement.querySelector('.panel-link-github');

  if (title) title.textContent = project.title;
  if (description) description.textContent = project.description;

  // Tech tags
  if (techContainer) {
    techContainer.innerHTML = '';
    project.tech.forEach((tech) => {
      const tag = document.createElement('span');
      tag.className = 'tech-tag';
      tag.textContent = tech;
      techContainer.appendChild(tag);
    });
  }

  // Handle screenshots - support both old 'screenshot' (string) and new 'screenshots' (array)
  const carousel = panelElement.querySelector('.carousel');
  const slidesContainer = panelElement.querySelector('.carousel-slides');
  const dotsContainer = panelElement.querySelector('.carousel-dots');
  const prevBtn = panelElement.querySelector('.carousel-prev');
  const nextBtn = panelElement.querySelector('.carousel-next');
  const carouselHint = document.querySelector('.carousel-hint');

  // Normalize screenshots to array
  let screenshots = [];
  if (project.screenshots && Array.isArray(project.screenshots)) {
    screenshots = project.screenshots;
  } else if (project.screenshot) {
    screenshots = [project.screenshot];
  }

  // Filter out empty strings
  screenshots = screenshots.filter(s => s && s.trim() !== '');

  if (carousel && slidesContainer && dotsContainer) {
    // Reset carousel state
    currentSlide = 0;
    totalSlides = screenshots.length;

    if (totalSlides === 0) {
      // No screenshots - hide carousel and hint
      carousel.classList.add('hidden');
      if (carouselHint) carouselHint.classList.add('hidden');
    } else {
      carousel.classList.remove('hidden');
      if (carouselHint) carouselHint.classList.remove('hidden');

      // Build slides
      slidesContainer.innerHTML = screenshots.map((src, index) => `
        <div class="carousel-slide">
          <img src="${src}" alt="${project.title} screenshot ${index + 1}" data-src="${src}">
        </div>
      `).join('');

      // Add click handlers to open lightbox
      slidesContainer.querySelectorAll('.carousel-slide img').forEach(img => {
        img.addEventListener('click', () => {
          openLightbox(img.dataset.src);
        });
      });

      // Build dots
      dotsContainer.innerHTML = screenshots.map((_, index) => `
        <button class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to slide ${index + 1}"></button>
      `).join('');

      // Add dot click handlers
      dotsContainer.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          goToSlide(parseInt(dot.dataset.index, 10));
        });
      });

      // Show/hide arrows and dots based on slide count
      if (totalSlides <= 1) {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        dotsContainer.classList.add('hidden');
      } else {
        if (prevBtn) prevBtn.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');
        dotsContainer.classList.remove('hidden');
      }

      // Reset slide position
      slidesContainer.style.transform = 'translateX(0)';
    }
  }

  // Links
  if (liveLink) {
    if (project.links?.live) {
      liveLink.href = project.links.live;
      liveLink.style.display = 'inline-block';
    } else {
      liveLink.style.display = 'none';
    }
  }

  if (githubLink) {
    if (project.links?.github) {
      githubLink.href = project.links.github;
      githubLink.style.display = 'inline-block';
    } else {
      githubLink.style.display = 'none';
    }
  }

  // Show panel
  panelElement.classList.add('open');
  backdropElement.classList.add('open');
  isOpen = true;
}

export function closePanel() {
  if (!panelElement) return;

  panelElement.classList.remove('open');
  backdropElement.classList.remove('open');
  isOpen = false;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function isPanelOpen() {
  return isOpen;
}

export async function showCaptainsLog() {
  if (!captainsLogElement) return;

  await loadChangelog();
  captainsLogElement.classList.add('visible');
  isOpen = true;
}

export function closeCaptainsLog() {
  if (!captainsLogElement) return;

  captainsLogElement.classList.remove('visible');
  isOpen = false;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function showMessageBottle() {
  if (!messageBottleElement) return;

  messageBottleElement.classList.add('visible');
  isOpen = true;
}

export function closeMessageBottle() {
  if (!messageBottleElement) return;

  messageBottleElement.classList.remove('visible');
  isOpen = false;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function showAdventureModal() {
  if (!adventureModalElement) return;

  adventureModalElement.classList.add('visible');
  isOpen = true;
}

export function closeAdventureModal() {
  if (!adventureModalElement) return;

  adventureModalElement.classList.remove('visible');
  isOpen = false;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function showPortfolioModal() {
  if (!portfolioModalElement) return;

  portfolioModalElement.classList.add('visible');
  isOpen = true;
}

export function closePortfolioModal() {
  if (!portfolioModalElement) return;

  portfolioModalElement.classList.remove('visible');
  isOpen = false;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function showNPCDialog(npc) {
  if (!npcDialogElement || !npc) return;

  currentDialogNPC = npc;
  currentDialogIndex = 0;

  // Set NPC name
  const nameEl = npcDialogElement.querySelector('.dialog-name');
  if (nameEl) nameEl.textContent = npc.name;

  // Show first dialog line
  updateDialogText();

  npcDialogElement.classList.add('visible');
  isOpen = true;
}

export function closeNPCDialog() {
  if (!npcDialogElement) return;

  npcDialogElement.classList.remove('visible');
  isOpen = false;
  currentDialogNPC = null;
  currentDialogIndex = 0;

  if (onCloseCallback) {
    onCloseCallback();
  }
}

function advanceDialog() {
  if (!currentDialogNPC) return;

  currentDialogIndex++;

  if (currentDialogIndex >= currentDialogNPC.dialog.length) {
    // End of dialog
    closeNPCDialog();
  } else {
    updateDialogText();
  }
}

function updateDialogText() {
  if (!npcDialogElement || !currentDialogNPC) return;

  const textEl = npcDialogElement.querySelector('.dialog-text');
  const nextBtn = npcDialogElement.querySelector('.dialog-next');

  if (textEl) {
    textEl.textContent = currentDialogNPC.dialog[currentDialogIndex];
  }

  // Update button text for last message
  if (nextBtn) {
    const isLastMessage = currentDialogIndex >= currentDialogNPC.dialog.length - 1;
    nextBtn.textContent = isLastMessage ? 'Close' : 'Continue';
  }
}

export function isNPCDialogOpen() {
  return npcDialogElement?.classList.contains('visible') || false;
}

// Guestbook functions
export async function showGuestbook() {
  if (!guestbookElement) return;

  // Show panel with backdrop
  guestbookElement.classList.add('open');
  backdropElement.classList.add('open');
  isOpen = true;

  // Load entries
  await loadGuestbookEntries();
}

export function closeGuestbook() {
  if (!guestbookElement) return;

  guestbookElement.classList.remove('open');
  backdropElement.classList.remove('open');
  isOpen = false;

  // Clear form
  const form = document.getElementById('guestbook-form');
  if (form) {
    form.reset();
    const charCount = form.querySelector('.guestbook-char-count');
    if (charCount) charCount.textContent = '0/500';
    const errorEl = form.querySelector('.guestbook-error');
    if (errorEl) errorEl.textContent = '';
  }

  if (onCloseCallback) {
    onCloseCallback();
  }
}

export function isGuestbookOpen() {
  return guestbookElement?.classList.contains('open') || false;
}

async function loadGuestbookEntries() {
  const container = document.getElementById('guestbook-entries');
  if (!container) return;

  container.innerHTML = '<p class="guestbook-loading">Loading entries...</p>';

  const entries = await fetchGuestbookEntries();

  if (entries.length === 0) {
    container.innerHTML = '<p class="guestbook-empty">No entries yet. Be the first to sign!</p>';
    return;
  }

  container.innerHTML = entries.map(entry => {
    const flag = locationToFlag(entry.location);
    const locationHtml = entry.location
      ? (flag
          ? `<span class="guestbook-entry-flag" title="${escapeHtml(entry.location)}">${flag}</span>`
          : `<span class="guestbook-entry-location">${escapeHtml(entry.location)}</span>`)
      : '';

    return `
      <div class="guestbook-entry">
        <div class="guestbook-entry-header">
          <div>
            <span class="guestbook-entry-name">${escapeHtml(entry.name)}</span>
            ${locationHtml}
          </div>
          <span class="guestbook-entry-time">${formatRelativeTime(entry.created_at)}</span>
        </div>
        <p class="guestbook-entry-message">${escapeHtml(entry.message)}</p>
      </div>
    `;
  }).join('');
}

async function handleGuestbookSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const errorEl = form.querySelector('.guestbook-error');
  const submitBtn = form.querySelector('.guestbook-submit');

  // Check honeypot (if filled, it's a bot)
  const honeypot = form.querySelector('input[name="website"]');
  if (honeypot && honeypot.value) {
    // Silently fail for bots
    form.reset();
    return;
  }

  // Get form values
  const name = form.querySelector('input[name="name"]').value;
  const location = form.querySelector('input[name="location"]').value;
  const message = form.querySelector('textarea[name="message"]').value;

  // Disable submit while processing
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  errorEl.textContent = '';

  const result = await submitGuestbookEntry(name, location, message);

  if (result.success) {
    // Clear form and show pending message
    form.reset();
    const charCount = form.querySelector('.guestbook-char-count');
    if (charCount) charCount.textContent = '0/500';
    errorEl.style.color = 'var(--glow-cyan, #0ff)';
    errorEl.textContent = 'Signed! Your entry will appear shortly.';
    setTimeout(() => {
      errorEl.textContent = '';
      errorEl.style.color = '';
    }, 5000);
  } else {
    errorEl.textContent = result.error;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign Guestbook';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Convert location to country flag emoji
function locationToFlag(location) {
  if (!location) return null;

  const loc = location.toLowerCase().trim();

  // Map of common locations/countries to ISO 3166-1 alpha-2 codes
  const countryMap = {
    // Countries
    'usa': 'US', 'united states': 'US', 'america': 'US', 'us': 'US',
    'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'britain': 'GB', 'scotland': 'GB', 'wales': 'GB',
    'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ', 'nz': 'NZ',
    'germany': 'DE', 'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'portugal': 'PT',
    'netherlands': 'NL', 'holland': 'NL', 'belgium': 'BE', 'switzerland': 'CH',
    'austria': 'AT', 'poland': 'PL', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
    'ireland': 'IE', 'greece': 'GR', 'turkey': 'TR', 'russia': 'RU', 'ukraine': 'UA',
    'japan': 'JP', 'china': 'CN', 'korea': 'KR', 'south korea': 'KR', 'taiwan': 'TW',
    'india': 'IN', 'pakistan': 'PK', 'bangladesh': 'BD', 'indonesia': 'ID',
    'thailand': 'TH', 'vietnam': 'VN', 'philippines': 'PH', 'malaysia': 'MY', 'singapore': 'SG',
    'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
    'south africa': 'ZA', 'egypt': 'EG', 'nigeria': 'NG', 'kenya': 'KE',
    'israel': 'IL', 'uae': 'AE', 'saudi arabia': 'SA',
    'czech republic': 'CZ', 'czechia': 'CZ', 'hungary': 'HU', 'romania': 'RO',
    // Major cities (map to their countries)
    'new york': 'US', 'nyc': 'US', 'los angeles': 'US', 'la': 'US', 'san francisco': 'US', 'sf': 'US',
    'chicago': 'US', 'seattle': 'US', 'boston': 'US', 'austin': 'US', 'miami': 'US',
    'london': 'GB', 'manchester': 'GB', 'birmingham': 'GB', 'edinburgh': 'GB',
    'paris': 'FR', 'berlin': 'DE', 'munich': 'DE', 'frankfurt': 'DE',
    'amsterdam': 'NL', 'rome': 'IT', 'milan': 'IT', 'madrid': 'ES', 'barcelona': 'ES',
    'tokyo': 'JP', 'osaka': 'JP', 'beijing': 'CN', 'shanghai': 'CN', 'hong kong': 'HK',
    'seoul': 'KR', 'taipei': 'TW', 'bangkok': 'TH', 'mumbai': 'IN', 'delhi': 'IN',
    'sydney': 'AU', 'melbourne': 'AU', 'toronto': 'CA', 'vancouver': 'CA', 'montreal': 'CA',
    'sao paulo': 'BR', 'rio': 'BR', 'mexico city': 'MX', 'buenos aires': 'AR',
    'dubai': 'AE', 'tel aviv': 'IL', 'moscow': 'RU', 'stockholm': 'SE', 'oslo': 'NO',
    'copenhagen': 'DK', 'helsinki': 'FI', 'dublin': 'IE', 'lisbon': 'PT', 'vienna': 'AT',
    'brussels': 'BE', 'zurich': 'CH', 'geneva': 'CH', 'warsaw': 'PL', 'prague': 'CZ'
  };

  // Try exact match first
  let code = countryMap[loc];

  // If no exact match, try to find a key contained in the location
  if (!code) {
    for (const [key, value] of Object.entries(countryMap)) {
      if (loc.includes(key) || key.includes(loc)) {
        code = value;
        break;
      }
    }
  }

  if (!code) return null;

  // Convert country code to flag emoji (regional indicator symbols)
  const flag = code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');

  return flag;
}

function closeAll() {
  if (panelElement?.classList.contains('open')) {
    closePanel();
  } else if (captainsLogElement?.classList.contains('visible')) {
    closeCaptainsLog();
  } else if (messageBottleElement?.classList.contains('visible')) {
    closeMessageBottle();
  } else if (npcDialogElement?.classList.contains('visible')) {
    closeNPCDialog();
  } else if (guestbookElement?.classList.contains('open')) {
    closeGuestbook();
  }
}

// Carousel navigation functions
function goToSlide(index) {
  if (index < 0 || index >= totalSlides) return;

  currentSlide = index;
  const slidesContainer = document.querySelector('.carousel-slides');
  const dots = document.querySelectorAll('.carousel-dot');

  if (slidesContainer) {
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  // Update active dot
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function nextSlide() {
  if (totalSlides <= 1) return;
  const nextIndex = (currentSlide + 1) % totalSlides;
  goToSlide(nextIndex);
}

function prevSlide() {
  if (totalSlides <= 1) return;
  const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
  goToSlide(prevIndex);
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      nextSlide(); // Swipe left = next
    } else {
      prevSlide(); // Swipe right = prev
    }
  }
}

// Lightbox functions
function openLightbox(src) {
  if (!lightboxElement) return;

  const img = document.getElementById('lightbox-image');
  if (img) {
    img.src = src;
  }
  lightboxElement.classList.add('visible');
}

function closeLightbox() {
  if (!lightboxElement) return;

  lightboxElement.classList.remove('visible');
  const img = document.getElementById('lightbox-image');
  if (img) {
    img.src = '';
  }
}

// Transition overlay functions
export function fadeOut(duration = 400) {
  return new Promise(resolve => {
    if (!transitionOverlay) {
      resolve();
      return;
    }
    transitionOverlay.style.transition = `opacity ${duration}ms ease`;
    transitionOverlay.classList.add('active');
    setTimeout(resolve, duration);
  });
}

export function fadeIn(duration = 400) {
  return new Promise(resolve => {
    if (!transitionOverlay) {
      resolve();
      return;
    }
    transitionOverlay.style.transition = `opacity ${duration}ms ease`;
    transitionOverlay.classList.remove('active');
    setTimeout(resolve, duration);
  });
}
