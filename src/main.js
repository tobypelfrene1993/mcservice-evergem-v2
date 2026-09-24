const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const header = document.querySelector('[data-header]');

const closeMenu = (returnFocus = false) => {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Menu openen');
  navigation.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  if (returnFocus) menuButton.focus();
};

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(willOpen));
    menuButton.setAttribute('aria-label', willOpen ? 'Menu sluiten' : 'Menu openen');
    navigation.classList.toggle('is-open', willOpen);
    document.body.classList.toggle('menu-open', willOpen);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('has-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
}

const analyticsPath = window.location.pathname;
const isAnalyticsDashboard = analyticsPath === '/admin' || analyticsPath.startsWith('/admin/');

if (!isAnalyticsDashboard) {
  const analyticsEndpoint = '/api/analytics/event';
  const sessionKey = 'mcservice_analytics_session';
  const allowedLinkEvents = [
    { event: 'whatsapp_click', matches: (link) => link.hostname === 'wa.me' || link.href.toLowerCase().includes('whatsapp') },
    { event: 'email_click', matches: (link) => link.protocol === 'mailto:' },
    { event: 'phone_click', matches: (link) => link.protocol === 'tel:' },
    { event: 'trustpilot_click', matches: (link) => link.hostname === 'trustpilot.com' || link.hostname.endsWith('.trustpilot.com') },
  ];

  const createSessionId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((byte, index) => `${index === 4 || index === 6 || index === 8 || index === 10 ? '-' : ''}${byte.toString(16).padStart(2, '0')}`).join('');
  };

  const getSessionId = () => {
    try {
      const existing = sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      const created = createSessionId();
      sessionStorage.setItem(sessionKey, created);
      return created;
    } catch {
      return createSessionId();
    }
  };

  const sessionId = getSessionId();
  const sendAnalyticsEvent = (eventType) => {
    const body = JSON.stringify({ event_type: eventType, path: analyticsPath, session_id: sessionId });
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(analyticsEndpoint, new Blob([body], { type: 'application/json' }));
        if (sent) return;
      }
      fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // Analytics must never interfere with navigation or site functionality.
    }
  };

  sendAnalyticsEvent('page_view');
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    try {
      const link = new URL(anchor.href, window.location.href);
      const match = allowedLinkEvents.find((candidate) => candidate.matches(link));
      if (match) sendAnalyticsEvent(match.event);
    } catch {
      // Ignore malformed links without affecting the click.
    }
  });
}
