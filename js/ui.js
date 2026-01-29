let panelElement;
let backdropElement;
let captainsLogElement;
let messageBottleElement;
let isOpen = false;
let onCloseCallback = null;
let changelogLoaded = false;

async function loadChangelog() {
  if (changelogLoaded) return;

  try {
    const response = await fetch('data/changelog.json?t=' + Date.now());
    const data = await response.json();
    const container = document.querySelector('.changelog-entries');

    if (!container) return;

    container.innerHTML = data.entries.map(entry => `
      <div class="changelog-entry">
        <div class="changelog-version">v${entry.version}</div>
        <div class="changelog-date">${formatDate(entry.date)}</div>
        <ul class="changelog-list">
          ${entry.changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
      </div>
    `).join('');

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
  onCloseCallback = closeCallback;

  // Close on backdrop click
  backdropElement.addEventListener('click', closePanel);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeAll();
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
}

export function showPanel(project) {
  if (!panelElement || !project) return;

  // Populate content
  const title = panelElement.querySelector('.panel-title');
  const description = panelElement.querySelector('.panel-description');
  const techContainer = panelElement.querySelector('.panel-tech');
  const screenshot = panelElement.querySelector('.panel-screenshot');
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

  // Screenshot
  if (screenshot) {
    if (project.screenshot) {
      screenshot.src = project.screenshot;
      screenshot.alt = project.title;
      screenshot.style.display = 'block';
    } else {
      screenshot.src = '';
      screenshot.alt = '';
      screenshot.style.display = 'none';
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
