/*
 * Section-snap scroll — wheel/keyboard snaps the viewport between top-level
 * `.page-shell > section` blocks. Disabled on touch devices, small screens,
 * and when the user prefers reduced motion.
 *
 * Per-page customisation: set `window.SECTION_SNAP_CONFIG` BEFORE this script
 * loads, e.g.
 *
 *   <script>
 *     window.SECTION_SNAP_CONFIG = {
 *       skipClasses: ['contact-cta', 'partners'],
 *       mergeWithNext: ['news-home'],
 *     };
 *   </script>
 *   <script src="section-snap.js"></script>
 *
 * Defaults to `skipClasses: ['contact-cta']` and no merges.
 */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  if (window.matchMedia('(max-width: 960px)').matches) return;

  const cfg = window.SECTION_SNAP_CONFIG || {};
  const SKIP_CLASSES    = cfg.skipClasses    || ['contact-cta'];
  const MERGE_WITH_NEXT = cfg.mergeWithNext  || [];

  const allSections = Array.from(document.querySelectorAll('.page-shell > section'));
  const sections = allSections.filter(s => {
    if (SKIP_CLASSES.some(c => s.classList.contains(c))) return false;
    if (s.offsetHeight === 0) return false;
    return true;
  });
  if (sections.length < 2) return;

  const AT_TARGET_TOL = 4;
  const INERTIA_GUARD = 600;
  const MIN_DELTA = 4;
  const FALLBACK_ANIM = 1500;

  let isAnimating = false;
  let snapDoneAt = 0;
  let fallbackTimer = null;

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const sectionSnapY = (section, isFirst) => {
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    let h = rect.height;
    const vh = window.innerHeight;
    if (isFirst) return 0;
    if (MERGE_WITH_NEXT.some(c => section.classList.contains(c))) {
      const next = section.nextElementSibling;
      if (next && next.tagName === 'SECTION') {
        h += next.getBoundingClientRect().height;
      }
    }
    const centered = top + h / 2 - vh / 2;
    return Math.max(0, Math.min(maxScroll(), Math.round(centered)));
  };

  const buildTargets = () => {
    const list = sections.map((s, i) => sectionSnapY(s, i === 0));
    list.push(maxScroll());
    return [...new Set(list)].sort((a, b) => a - b);
  };

  const findNextTarget = (targets, direction) => {
    const y = window.scrollY;
    if (direction > 0) {
      for (let i = 0; i < targets.length; i++) {
        if (targets[i] > y + AT_TARGET_TOL) return targets[i];
      }
      return null;
    }
    for (let i = targets.length - 1; i >= 0; i--) {
      if (targets[i] < y - AT_TARGET_TOL) return targets[i];
    }
    return null;
  };

  const finishSnap = () => {
    if (!isAnimating) return;
    isAnimating = false;
    snapDoneAt = performance.now();
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  };

  if ('onscrollend' in window) {
    window.addEventListener('scrollend', finishSnap);
  }

  const snapToTarget = (target) => {
    if (target == null) return;
    if (Math.abs(target - window.scrollY) < AT_TARGET_TOL) return;
    isAnimating = true;
    window.scrollTo({ top: target, behavior: 'auto' });
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(finishSnap, FALLBACK_ANIM);
  };

  const isInsideScrollable = (target) => {
    let node = target;
    while (node && node !== document.body) {
      if (node.scrollHeight > node.clientHeight + 1) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY)) return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  const onWheel = (e) => {
    if (isInsideScrollable(e.target)) return;
    e.preventDefault();

    if (isAnimating) return;
    if (performance.now() - snapDoneAt < INERTIA_GUARD) return;
    if (Math.abs(e.deltaY) < MIN_DELTA) return;

    const direction = e.deltaY > 0 ? 1 : -1;
    snapToTarget(findNextTarget(buildTargets(), direction));
  };

  const onKeyDown = (e) => {
    const map = { 'PageDown': 1, 'PageUp': -1, 'ArrowDown': 1, 'ArrowUp': -1, 'Home': 'first', 'End': 'last' };
    const action = map[e.key];
    if (action === undefined) return;

    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

    e.preventDefault();
    if (isAnimating) return;

    const targets = buildTargets();
    if (action === 'first') snapToTarget(targets[0]);
    else if (action === 'last') snapToTarget(targets[targets.length - 1]);
    else snapToTarget(findNextTarget(targets, action));
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
})();
