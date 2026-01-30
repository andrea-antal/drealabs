let panelElement;
let backdropElement;
let captainsLogElement;
let messageBottleElement;
let lightboxElement;
let isOpen = false;
let onCloseCallback = null;
let changelogLoaded = false;

// Carousel state
let currentSlide = 0;
let totalSlides = 0;
let touchStartX = 0;
let touchEndX = 0;

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
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initUI(closeCallback) {
  panelElement = document.getElementById('project-panel');
  backdropElement = document.getElementById('panel-backdrop');
  captainsLogElement = document.getElementById('captains-log');
  messageBottleElement = document.getElementById('message-bottle');
  lightboxElement = document.getElementById('image-lightbox');
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

function closeAll() {
  if (panelElement?.classList.contains('open')) {
    closePanel();
  } else if (captainsLogElement?.classList.contains('visible')) {
    closeCaptainsLog();
  } else if (messageBottleElement?.classList.contains('visible')) {
    closeMessageBottle();
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
