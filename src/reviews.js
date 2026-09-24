export const customerReviews = [
  {
    name: 'Thomas',
    title: 'Super tevreden',
    text: 'Super tevreden! Vakkundig, betrouwbaar en correcte service. Voor onderhoud en herstellingen aan auto’s, grasmaaiers en brommers ben je hier aan het juiste adres. Zeker een aanrader!',
    rating: 5,
  },
  {
    name: 'Jelle',
    title: 'Zeer goede werking',
    text: 'Zeer goede werking! Had een brommer gekocht een 2takt en was volledig kapot daardoor heb ik hem hier afgegeven en was in 2dagen klaar! Nu werkt mijn brommer volledig! Dus niet twijfelen en hier gwn je brommer binnsteken. Mike werkt aan je brommer voor een zeer lage prijs',
    rating: 5,
  },
  {
    name: 'Nelis',
    title: 'Goede service',
    text: 'Heel goeie service en kwaliteit verzekerd. Zeker en vast aan te raden voor anderen grtz Nelis',
    rating: 5,
  },
  {
    name: 'Shakira',
    title: 'Zeker en vast 5 sterren waard',
    text: 'Zeker en vast 5 sterren waard! Al enkele keren voor mijn auto langsgegaan en alleen maar positieve dingen te melden! Hij weet zeker en vast waar hij met bezig is, en weet goed hoe hij klanten kan tevreden stellen met zijn services! Zeker een aanrader.',
    rating: 5,
  },
  {
    name: 'Toby',
    title: 'Goede service aan een correcte prijs',
    text: 'Mijn BMW 1-reeks bij Mike binnengebracht voor onderhoud en heel tevreden van de service. Alles was correct uitgevoerd en de prijs was ook heel goed. Mike weet duidelijk waar hij mee bezig is. Niets op aan te merken en ik zou zeker opnieuw gaan.',
    rating: 5,
  },
];

const carousel = document.querySelector('[data-review-carousel]');

if (carousel && carousel.dataset.initialized !== 'true') {
  carousel.dataset.initialized = 'true';
  const viewport = carousel.querySelector('[data-review-viewport]');
  const track = carousel.querySelector('[data-review-track]');
  const controls = document.querySelector('[data-review-controls]');
  const previousButton = document.querySelector('[data-review-previous]');
  const nextButton = document.querySelector('[data-review-next]');
  const dots = document.querySelector('[data-review-dots]');
  const status = carousel.querySelector('[data-review-status]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reviewCount = customerReviews.length;
  let visibleCount = 1;
  let activeIndex = 0;
  let trackIndex = 0;
  let isAnimating = false;
  let autoplayTimer;
  let interactionTimer;
  let resizeTimer;
  let hoverPaused = false;
  let focusPaused = false;
  let interactionPaused = false;
  let pointerStartX;
  let pointerId;

  const createReviewCard = (review, index, clone = false) => {
    const article = document.createElement('article');
    article.className = 'customer-review-card';
    article.setAttribute('aria-label', `Klantreview ${index + 1} van ${reviewCount}`);
    if (clone) article.setAttribute('aria-hidden', 'true');
    const stars = document.createElement('div');
    stars.className = 'customer-review-stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `${review.rating} van 5 sterren`);
    const starText = document.createElement('span');
    starText.setAttribute('aria-hidden', 'true');
    starText.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
    stars.append(starText);
    const title = document.createElement('h3');
    title.textContent = review.title;
    const quote = document.createElement('blockquote');
    const text = document.createElement('p');
    text.textContent = review.text;
    quote.append(text);
    const author = document.createElement('p');
    author.className = 'customer-review-author';
    const name = document.createElement('strong');
    name.textContent = review.name;
    author.append(name);
    article.append(stars, title, quote, author);
    return article;
  };

  const maximumVisible = () => window.innerWidth >= 1200 ? 3 : window.innerWidth >= 700 ? 2 : 1;
  const cardStep = () => {
    const card = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : viewport.clientWidth;
  };
  const updateDots = () => {
    [...dots.children].forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };
  const positionTrack = (animate = true) => {
    track.classList.toggle('is-moving', animate && !reducedMotion.matches);
    track.style.transform = `translate3d(${-trackIndex * cardStep()}px,0,0)`;
  };
  const normalizeTrack = () => {
    if (trackIndex >= visibleCount + reviewCount) trackIndex -= reviewCount;
    if (trackIndex < visibleCount) trackIndex += reviewCount;
    positionTrack(false);
    isAnimating = false;
  };
  const stopAutoplay = () => window.clearInterval(autoplayTimer);
  const canAutoplay = () => reviewCount > 1 && !reducedMotion.matches && !document.hidden && !hoverPaused && !focusPaused && !interactionPaused;
  const startAutoplay = () => {
    stopAutoplay();
    if (!canAutoplay()) return;
    autoplayTimer = window.setInterval(() => moveBy(1, false), 6000);
  };
  const pauseForInteraction = () => {
    interactionPaused = true;
    stopAutoplay();
    window.clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => {
      interactionPaused = false;
      if (canAutoplay()) moveBy(1, false);
      startAutoplay();
    }, 6000);
  };
  const announcePosition = () => {
    status.textContent = `Review ${activeIndex + 1} van ${reviewCount}`;
  };
  const moveBy = (direction, manual = true) => {
    if (reviewCount < 2 || isAnimating) return;
    if (manual) pauseForInteraction();
    activeIndex = (activeIndex + direction + reviewCount) % reviewCount;
    trackIndex += direction;
    isAnimating = !reducedMotion.matches;
    positionTrack(true);
    updateDots();
    announcePosition();
    if (reducedMotion.matches) normalizeTrack();
  };
  const goToReview = (index) => {
    if (index === activeIndex || isAnimating) return;
    pauseForInteraction();
    activeIndex = index;
    trackIndex = visibleCount + activeIndex;
    isAnimating = !reducedMotion.matches;
    positionTrack(true);
    updateDots();
    announcePosition();
    if (reducedMotion.matches) normalizeTrack();
  };
  const rebuildTrack = () => {
    visibleCount = Math.min(maximumVisible(), reviewCount);
    carousel.dataset.visible = String(visibleCount);
    const before = customerReviews.slice(-visibleCount).map((review, offset) => createReviewCard(review, reviewCount - visibleCount + offset, true));
    const originals = customerReviews.map((review, index) => createReviewCard(review, index));
    const after = customerReviews.slice(0, visibleCount).map((review, index) => createReviewCard(review, index, true));
    track.replaceChildren(...before, ...originals, ...after);
    trackIndex = visibleCount + activeIndex;
    controls.hidden = reviewCount < 2;
    status.hidden = reviewCount < 2;
    positionTrack(false);
  };

  customerReviews.forEach((review, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ga naar review ${index + 1}: ${review.name}`);
    dot.addEventListener('click', () => goToReview(index));
    dots.append(dot);
  });
  previousButton.addEventListener('click', () => moveBy(-1));
  nextButton.addEventListener('click', () => moveBy(1));
  viewport.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveBy(event.key === 'ArrowRight' ? 1 : -1);
  });
  viewport.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
    pointerId = event.pointerId;
    viewport.setPointerCapture?.(pointerId);
    pauseForInteraction();
  });
  viewport.addEventListener('pointerup', (event) => {
    if (pointerStartX === undefined) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = undefined;
    if (Math.abs(distance) >= 45) moveBy(distance < 0 ? 1 : -1, false);
  });
  viewport.addEventListener('pointercancel', () => {
    pointerStartX = undefined;
  });
  track.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') normalizeTrack();
  });
  carousel.addEventListener('mouseenter', () => {
    hoverPaused = true;
    stopAutoplay();
  });
  carousel.addEventListener('mouseleave', () => {
    hoverPaused = false;
    startAutoplay();
  });
  carousel.addEventListener('focusin', () => {
    focusPaused = true;
    stopAutoplay();
  });
  carousel.addEventListener('focusout', () => {
    window.setTimeout(() => {
      focusPaused = carousel.contains(document.activeElement);
      startAutoplay();
    }, 0);
  });
  document.addEventListener('visibilitychange', startAutoplay);
  reducedMotion.addEventListener('change', () => {
    normalizeTrack();
    startAutoplay();
  });
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuildTrack, 120);
  }, { passive: true });

  rebuildTrack();
  updateDots();
  announcePosition();
  startAutoplay();
}
