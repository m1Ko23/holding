(() => {
    let footerHeight = 0;
    let rafId = null;

    const measureFooter = () => {
        const footer = document.querySelector('.footer');
        if (!footer) return;
        footerHeight = footer.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', footerHeight + 'px');
        updateWavesBottom();
    };

    const updateWavesBottom = () => {
        if (!footerHeight) return;
        const fromBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
        const visibleFooter = Math.max(0, Math.min(footerHeight, footerHeight - fromBottom));
        document.documentElement.style.setProperty('--waves-bottom', visibleFooter + 'px');
    };

    const onScroll = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            updateWavesBottom();
            rafId = null;
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', measureFooter);
    } else {
        measureFooter();
    }
    window.addEventListener('load', measureFooter);
    window.addEventListener('resize', measureFooter);
    window.addEventListener('scroll', onScroll, { passive: true });
})();

document.addEventListener("DOMContentLoaded", () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const defaultTrigger = (trigger, start = "top 85%") => ({
        trigger,
        start,
        toggleActions: "play none none none",
    });

    // Helper: split a paragraph's text into per-line wrappers for line-by-line reveal
    const splitToLines = (el) => {
        if (el.dataset.lineSplit) return el.querySelectorAll('.line-inner');

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue && node.nodeValue.trim()) textNodes.push(node);
        }

        const wordSpans = [];
        textNodes.forEach(tn => {
            const parent = tn.parentNode;
            const frag = document.createDocumentFragment();
            const parts = tn.nodeValue.split(/(\s+)/);
            parts.forEach(p => {
                if (p === '') return;
                if (/\s+/.test(p)) {
                    frag.appendChild(document.createTextNode(p));
                } else {
                    const w = document.createElement('span');
                    w.style.display = 'inline-block';
                    w.textContent = p;
                    frag.appendChild(w);
                    wordSpans.push(w);
                }
            });
            parent.replaceChild(frag, tn);
        });

        if (!wordSpans.length) {
            el.dataset.lineSplit = '1';
            return [];
        }

        const linesMap = new Map();
        wordSpans.forEach(w => {
            const top = w.offsetTop;
            if (!linesMap.has(top)) linesMap.set(top, []);
            linesMap.get(top).push(w);
        });
        // Sort lines by their visual top so margin detection is correct
        const sortedTops = Array.from(linesMap.keys()).sort((a, b) => a - b);

        // Determine the typical (smallest) line-to-line distance to detect paragraph gaps
        let typicalGap = Infinity;
        for (let i = 1; i < sortedTops.length; i++) {
            const d = sortedTops[i] - sortedTops[i - 1];
            if (d > 0 && d < typicalGap) typicalGap = d;
        }
        if (!isFinite(typicalGap)) typicalGap = 0;

        el.innerHTML = '';
        const lineInners = [];
        sortedTops.forEach((top, i) => {
            const words = linesMap.get(top);
            const lineWrap = document.createElement('span');
            lineWrap.className = 'line';
            lineWrap.style.display = 'block';
            lineWrap.style.overflow = 'hidden';

            // Preserve abnormal gaps (paragraph-like spacing) as margin-top on the next line
            if (i > 0 && typicalGap > 0) {
                const gap = top - sortedTops[i - 1];
                const extra = gap - typicalGap;
                if (extra > typicalGap * 0.5) {
                    lineWrap.style.marginTop = extra + 'px';
                }
            }

            const inner = document.createElement('span');
            inner.className = 'line-inner';
            inner.style.display = 'inline-block';
            inner.style.willChange = 'transform, opacity';
            inner.textContent = words.map(w => w.textContent).join(' ');

            lineWrap.appendChild(inner);
            el.appendChild(lineWrap);
            lineInners.push(inner);
        });

        el.dataset.lineSplit = '1';
        return lineInners;
    };

    // Helper: split text into words wrapped in inline-block spans (preserves inline DOM)
    const splitToWords = (el) => {
        if (el.dataset.split) return el.querySelectorAll('.split-word');
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.trim()) textNodes.push(node);
        }
        textNodes.forEach(n => {
            const parent = n.parentNode;
            const frag = document.createDocumentFragment();
            const words = n.nodeValue.split(/(\s+)/);
            words.forEach(w => {
                if (w.trim()) {
                    const span = document.createElement('span');
                    span.className = 'split-word';
                    span.style.display = 'inline-block';
                    span.style.willChange = 'transform, opacity';
                    span.textContent = w;
                    frag.appendChild(span);
                } else {
                    frag.appendChild(document.createTextNode(w));
                }
            });
            parent.replaceChild(frag, n);
        });
        el.dataset.split = '1';
        return el.querySelectorAll('.split-word');
    };

    // Helper: split a heading into per-line masks (overflow:hidden) so each line can rise from below.
    // Preserves inline formatting (e.g. `<span class="fw-semibold">`) by copying parent classes/styles
    // onto the per-word span before the rebuild.
    const splitHeadingByLine = (h) => {
        if (h.dataset.lineGrouped) return Array.from(h.querySelectorAll('.line-inner'));

        const words = splitToWords(h);
        if (!words.length) {
            h.dataset.lineGrouped = '1';
            return [];
        }

        // Copy parent inline classes/styles onto each word span so formatting survives the move
        words.forEach(w => {
            let parent = w.parentNode;
            while (parent && parent !== h) {
                if (parent.classList) {
                    parent.classList.forEach(c => {
                        if (c && c !== 'split-word') w.classList.add(c);
                    });
                }
                if (parent.style && parent.style.cssText) {
                    w.style.cssText = parent.style.cssText + ';' + w.style.cssText;
                }
                parent = parent.parentNode;
            }
        });

        // Group words by visual line (offsetTop)
        const linesMap = new Map();
        words.forEach(w => {
            const top = w.offsetTop;
            if (!linesMap.has(top)) linesMap.set(top, []);
            linesMap.get(top).push(w);
        });
        const sortedLines = Array.from(linesMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, ws]) => ws);

        // Rebuild: each line is a `.line` mask containing a `.line-inner` to animate
        h.innerHTML = '';
        const inners = [];
        sortedLines.forEach(lineWords => {
            const mask = document.createElement('span');
            mask.className = 'line';
            mask.style.display = 'block';
            mask.style.overflow = 'hidden';
            // Allow descender room so glyphs aren't clipped at the bottom
            mask.style.paddingBottom = '0.12em';
            mask.style.marginBottom = '-0.12em';

            const inner = document.createElement('span');
            inner.className = 'line-inner';
            inner.style.display = 'inline-block';
            inner.style.willChange = 'transform, opacity';

            lineWords.forEach((w, i) => {
                inner.appendChild(w);
                if (i < lineWords.length - 1) inner.appendChild(document.createTextNode(' '));
            });

            mask.appendChild(inner);
            h.appendChild(mask);
            inners.push(inner);
        });

        h.dataset.lineGrouped = '1';
        return inners;
    };

    // ===== 1. HERO =====
    const heroContent = document.querySelector('.page-hero__content, .hero__content, .about-hero__content');
    if (heroContent) {
        const heroTargets = [];

        const tl = gsap.timeline({
            delay: 0.15,
            onComplete: () => {
                if (heroTargets.length) gsap.set(heroTargets, { clearProps: "all" });
            }
        });

        const label = heroContent.querySelector('.section-label, .page-hero__label');
        if (label) {
            heroTargets.push(label);
            tl.fromTo(label,
                { x: -40, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0);
        }

        const heading = heroContent.querySelector('h1, .hero__title, .page-hero__title');
        if (heading) {
            const lines = splitHeadingByLine(heading);
            if (lines.length) {
                heroTargets.push(...lines);
                tl.fromTo(lines,
                    { yPercent: 110, opacity: 0 },
                    { yPercent: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out" }, 0.15);
            } else {
                heroTargets.push(heading);
                tl.fromTo(heading,
                    { y: 60, opacity: 0, scale: 0.96 },
                    { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: "power4.out" }, 0.15);
            }
        }

        const para = heroContent.querySelector('p');
        if (para) {
            const lines = splitToLines(para);
            if (lines.length) {
                heroTargets.push(...lines);
                tl.fromTo(lines,
                    { yPercent: 110, opacity: 0 },
                    { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: "power3.out" }, 0.35);
            } else {
                heroTargets.push(para);
                tl.fromTo(para,
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, 0.4);
            }
        }

        const actions = heroContent.querySelector('.hero__actions, .page-hero__actions, .about-hero__actions');
        if (actions && actions.children.length) {
            const actionChildren = Array.from(actions.children);
            heroTargets.push(...actionChildren);
            tl.fromTo(actionChildren,
                { y: 20, opacity: 0, scale: 0.9 },
                { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: "back.out(1.6)" }, 0.6);
        }

        const scrollHint = document.querySelector('.hero__scroll');
        if (scrollHint) {
            heroTargets.push(scrollHint);
            tl.fromTo(scrollHint,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8 }, 0.9);
        }
    }

    // ===== 2. SECTION LABELS (line grows, text fades) =====
    document.querySelectorAll('.section-label').forEach(label => {
        if (heroContent && heroContent.contains(label)) return;

        const line = label.querySelector('.section-label__line');
        const texts = Array.from(label.children).filter(c => c !== line);

        const tl = gsap.timeline({ scrollTrigger: defaultTrigger(label, "top 90%") });
        if (line) {
            tl.from(line, { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power3.out" }, 0);
        }
        if (texts.length) {
            tl.from(texts, { opacity: 0, x: -10, duration: 0.6, stagger: 0.05, ease: "power2.out" }, 0.2);
        }
    });

    // ===== 3. HEADINGS (line-by-line reveal) =====
    const headingSelectors = [
        '.section-heading', '.about__heading', '.investors__heading',
        '.flagship__title', '.geography__heading', '.culture__heading',
        '.partner-cta__heading', '.news-featured__title', '.news-subscribe__title',
        '.career-cta__title', '.contact-form-section__title', '.contact-cta__heading',
        '.inv-stats__heading', '.principles__heading', '.faq__heading'
    ].join(', ');
    document.querySelectorAll(headingSelectors).forEach(h => {
        if (heroContent && heroContent.contains(h)) return;
        if (!h.textContent.trim()) return;

        const lines = splitHeadingByLine(h);
        if (!lines.length) return;
        gsap.from(lines, {
            scrollTrigger: defaultTrigger(h, "top 88%"),
            yPercent: 110,
            opacity: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out"
        });
    });

    // ===== 4. PARAGRAPHS (line-by-line reveal) =====
    document.querySelectorAll('.page-shell p').forEach(p => {
        if (heroContent && heroContent.contains(p)) return;
        if (!p.textContent.trim()) return;

        const lines = splitToLines(p);
        if (!lines.length) return;

        gsap.from(lines, {
            scrollTrigger: defaultTrigger(p, "top 90%"),
            yPercent: 110,
            opacity: 0,
            duration: 0.85,
            stagger: 0.08,
            ease: "power3.out"
        });
    });

    // ===== 5. GRID CARDS (stagger with scale) =====
    // Note: .vacancy-list is intentionally excluded — its rows are animated
    // separately in block #18 (slide-from-left). Running both leaves random
    // rows stuck at opacity 0 when the two `from()` tweens overlap.
    const gridSelectors = [
        '.advantages__grid', '.values__grid', '.divisions__grid',
        '.team-grid', '.inv-stats__grid', '.inv-sectors__grid', '.formats__grid',
        '.sectors__grid', '.portfolio__grid', '.benefits__grid', '.principles__list',
        '.news-grid', '.stats', '.culture__features', '.investors__features',
        '.geography__cities', '.flagship__meta'
    ];
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    document.querySelectorAll(gridSelectors.join(', ')).forEach(grid => {
        if (!grid.children.length) return;
        // On mobile the staff/team grid feels jerky — cards stack into one column
        // and the stagger leaves later cards sitting at opacity:0 until scrolled to.
        if (isMobile && grid.classList.contains('team-grid')) return;
        gsap.from(Array.from(grid.children), {
            scrollTrigger: defaultTrigger(grid, "top 85%"),
            y: 60, opacity: 0, scale: 0.92,
            duration: 0.8, stagger: { each: 0.08, from: "start" },
            ease: "power3.out",
            clearProps: "transform,opacity"
        });
    });

    // ===== 6. TIMELINE (alternating sides) =====
    // Skip when the horizontal-pin mode is active — the page-level script in
    // about.html handles the entrance, and ScrollTriggers based on item bounds
    // don't fire correctly while the section is pinned and panned horizontally.
    const horizontalTimeline = window.matchMedia('(min-width: 961px)').matches
        && document.querySelector('.history .timeline');
    if (!horizontalTimeline) {
        document.querySelectorAll('.timeline__item').forEach((item, i) => {
            const card = item.querySelector('.timeline__card');
            const node = item.querySelector('.timeline__node, .timeline__dot');
            const year = item.querySelector('.timeline__year');
            const fromLeft = item.classList.contains('timeline__item--odd') || i % 2 === 0;

            const tl = gsap.timeline({ scrollTrigger: defaultTrigger(item, "top 82%") });
            if (node) {
                tl.from(node, { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(2)" }, 0);
            }
            if (card) {
                tl.from(card, {
                    x: fromLeft ? -60 : 60, opacity: 0,
                    duration: 0.9, ease: "power3.out"
                }, 0.1);
            }
            if (year) {
                tl.from(year, {
                    x: fromLeft ? 60 : -60, opacity: 0,
                    duration: 0.9, ease: "power3.out"
                }, 0.1);
            }
        });
    }

    // ===== 7. STAT COUNTERS =====
    document.querySelectorAll('.stats__number, .inv-stat__number, .proj-stats__number, .hero__stat-number, .about-hero__stat-number, .career-metrics__value, .pi-stats__num, .news-stats__number').forEach(el => {
        const raw = el.textContent.trim();
        // Number can include space or comma thousand separators (Russian notation: "3 500")
        const match = raw.match(/^([^\d-]*?)(-?\d[\d\s, ]*(?:\.\d+)?)(.*)$/);
        if (!match) return;
        const prefix = match[1];
        const suffix = match[3];
        const numStr = match[2].replace(/[\s, ]/g, '');
        const target = parseFloat(numStr);
        if (!isFinite(target)) return;
        const decimals = (numStr.split('.')[1] || '').length;

        // Format the live tween value as Russian-locale number (spaces between thousands).
        const fmt = (n) => n.toLocaleString('ru-RU', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

        // Big-unit case (e.g. "$1 млрд+"): a single-digit count from 0→1 is dull.
        // Expand into the next-smaller unit and tick through it (245 млн … 875 млн)
        // before snapping back to the original label at completion.
        const bigUnit = suffix.match(/(млрд|миллиард|billion)/i);
        if (bigUnit && target > 0 && target < 1000) {
            const expanded = target * 1000;
            const downUnit = ' млн';
            const counter = { v: 0 };
            gsap.to(counter, {
                v: expanded,
                duration: 2.2,
                ease: "power2.out",
                scrollTrigger: defaultTrigger(el, "top 90%"),
                onUpdate() {
                    el.textContent = prefix + Math.round(counter.v).toLocaleString('ru-RU') + downUnit;
                },
                onComplete() {
                    el.textContent = raw;
                }
            });
            return;
        }

        // Slow numbers under 100 are fine at 1.6s; for thousands use a longer
        // duration so the digits visibly tick through hundreds.
        const duration = target >= 1000 ? 2.4 : (target >= 100 ? 2 : 1.6);

        const counter = { v: 0 };
        gsap.to(counter, {
            v: target,
            duration,
            ease: "power2.out",
            scrollTrigger: defaultTrigger(el, "top 90%"),
            onUpdate() {
                el.textContent = prefix + fmt(counter.v) + suffix;
            },
            onComplete() {
                // Ensure final state matches the original markup exactly.
                el.textContent = raw;
            }
        });
    });

    // ===== 8. LARGE IMAGES / MEDIA (clip-path reveal + subtle zoom) =====
    const mediaSelectors = [
        '.about__image-wrap', '.culture__image-col', '.investors__image-col',
        '.principles__image-wrap', '.flagship__visual', '.geography__map-col',
        '.partner-cta__image', '.career-split__media', '.about-split__media',
        '.news-featured__media'
    ];
    document.querySelectorAll(mediaSelectors.join(', ')).forEach(media => {
        gsap.from(media, {
            scrollTrigger: defaultTrigger(media, "top 85%"),
            clipPath: "inset(0 0 100% 0)",
            duration: 1.1, ease: "power3.inOut"
        });
        const img = media.querySelector('img');
        if (img) {
            gsap.from(img, {
                scrollTrigger: defaultTrigger(media, "top 85%"),
                scale: 1.15, duration: 1.4, ease: "power2.out"
            });
        }
    });

    // ===== 9. PARALLAX on images while scrolling =====
    document.querySelectorAll('.investors__image, .partner-cta__image img, .about__image, .principles__image').forEach(img => {
        gsap.to(img, {
            y: -60,
            ease: "none",
            scrollTrigger: {
                trigger: img,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    // ===== 10. BUTTONS / CTA BURST (exclude hero — already animated above) =====
    document.querySelectorAll('.partner-cta__actions, .career-cta__actions, .investors__content > .btn').forEach(cta => {
        if (heroContent && heroContent.contains(cta)) return;
        const children = cta.children.length ? Array.from(cta.children) : [cta];
        gsap.from(children, {
            scrollTrigger: defaultTrigger(cta, "top 90%"),
            y: 20, opacity: 0, scale: 0.85,
            duration: 0.7, stagger: 0.1, ease: "back.out(1.6)",
            clearProps: "transform,opacity"
        });
    });

    // ===== 11. LINK-ARROW subtle rise =====
    document.querySelectorAll('.link-arrow').forEach(link => {
        const section = link.closest('section');
        if (!section) return;
        gsap.from(link, {
            scrollTrigger: defaultTrigger(section, "top 80%"),
            x: -16, opacity: 0, duration: 0.7, ease: "power2.out", delay: 0.2
        });
    });

    // ===== 12. SLIDER (projects-swiper) =====
    document.querySelectorAll('.projects-slider, .projects-swiper-wrap').forEach(slider => {
        gsap.from(slider, {
            scrollTrigger: defaultTrigger(slider, "top 85%"),
            y: 40, opacity: 0, scale: 0.97,
            duration: 1, ease: "power3.out"
        });
    });

    // ===== 13. 3D CARD TILT on mouse hover =====
    const tiltSelector = [
        '.advantage-card', '.value-card', '.division-card', '.team-card',
        '.inv-stat', '.inv-sector', '.principle-item', '.format-card',
        '.benefit-card', '.sector-card', '.proj-card',
        '.contact-info__card', '.contact-dept-card', '.contact-office-card',
        '.project-card', '.direction-card'
    ].join(', ');

    document.querySelectorAll(tiltSelector).forEach(card => {
        const maxTilt = 6;
        const toX = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2.out" });
        const toY = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2.out" });
        const toLift = gsap.quickTo(card, "y", { duration: 0.4, ease: "power2.out" });

        card.style.transformStyle = "preserve-3d";
        card.style.transformPerspective = "1000px";

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            toX(x * maxTilt);
            toY(-y * maxTilt);
            toLift(-4);
        });
        card.addEventListener('mouseleave', () => {
            toX(0); toY(0); toLift(0);
        });
    });

    // ===== 14. MAGNETIC BUTTONS =====
    document.querySelectorAll('.btn--blue, .btn--outline, .btn--outline-blue, .proj-btn, .link-arrow').forEach(btn => {
        const strength = 10;
        const toX = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
        const toY = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
            const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
            toX(x * strength);
            toY(y * strength);
        });
        btn.addEventListener('mouseleave', () => {
            toX(0); toY(0);
        });
    });

    // ===== 15. IMAGE ZOOM on card hover =====
    document.querySelectorAll('.proj-card, .direction-card, .project-card, .portfolio-item').forEach(card => {
        const img = card.querySelector('img');
        if (!img) return;
        const zoomIn = gsap.quickTo(img, "scale", { duration: 0.6, ease: "power2.out" });
        card.addEventListener('mouseenter', () => zoomIn(1.08));
        card.addEventListener('mouseleave', () => zoomIn(1));
    });

    // ===== 16. FAQ accordion smooth expand =====
    const faqItems = Array.from(document.querySelectorAll('.faq-item'));
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-item__question, .faq-item__header');
        const body = item.querySelector('.faq-item__answer, .faq-item__body, .faq-item__content');
        if (!btn || !body) return;
        gsap.set(body, { height: 0, overflow: 'hidden', opacity: 0 });

        btn.addEventListener('click', () => {
            const wasOpen = item.classList.contains('faq-item--open');

            faqItems.forEach(other => {
                if (other === item || !other.classList.contains('faq-item--open')) return;
                const otherBody = other.querySelector('.faq-item__answer, .faq-item__body, .faq-item__content');
                const otherBtn = other.querySelector('.faq-item__question');
                if (otherBody) gsap.to(otherBody, { height: 0, opacity: 0, duration: 0.4, ease: "power2.inOut" });
                other.classList.remove('faq-item--open');
                if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
            });

            if (wasOpen) {
                item.classList.remove('faq-item--open');
                btn.setAttribute('aria-expanded', 'false');
                gsap.to(body, { height: 0, opacity: 0, duration: 0.4, ease: "power2.inOut" });
            } else {
                item.classList.add('faq-item--open');
                btn.setAttribute('aria-expanded', 'true');
                gsap.to(body, { height: "auto", opacity: 1, duration: 0.5, ease: "power2.out" });
            }
        });
    });

    // ===== 17. PROCESS STEPS (career) — numbered reveal with line grow =====
    document.querySelectorAll('.process-step, .process__item').forEach((step, i) => {
        const num = step.querySelector('.process-step__number, .process__number');
        const line = step.querySelector('.process-step__line, .process__line');
        const title = step.querySelector('.process-step__title, .process__title');
        const text = step.querySelector('.process-step__text, .process__text');

        const tl = gsap.timeline({ scrollTrigger: defaultTrigger(step, "top 85%") });
        if (num) tl.fromTo(num,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" }, 0);
        if (line) tl.fromTo(line,
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.8, ease: "power3.out" }, 0.2);
        if (title) tl.fromTo(title,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.3);
        if (text) tl.fromTo(text,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.4);
    });

    // ===== 18. VACANCY ROWS (career) — slide in from left =====
    // clearProps so the JS-driven filter (show/hide rows) can manipulate
    // display without leaving items stuck at opacity 0 / shifted x.
    document.querySelectorAll('.vacancy-row').forEach((row, i) => {
        gsap.from(row, {
            scrollTrigger: defaultTrigger(row, "top 88%"),
            x: -30, opacity: 0,
            duration: 0.6, ease: "power3.out",
            clearProps: 'transform,opacity'
        });
    });

    // ===== 19. TESTIMONIAL CARDS flip-in =====
    // .team-card is intentionally excluded — it's already animated by the
    // .team-grid stagger in block #5; running both leaves random cards stuck
    // at opacity:0 because the two tweens fight over the same property.
    document.querySelectorAll('.testimonial-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: defaultTrigger(card, "top 85%"),
            y: 40, opacity: 0, rotateY: 15,
            duration: 0.9, ease: "power3.out",
            transformPerspective: 800
        });
    });

    // ===== 20. SECTOR CARDS / PORTFOLIO — stagger from center =====
    document.querySelectorAll('.sectors__grid, .inv-sectors__grid, .portfolio__grid, .formats__grid').forEach(grid => {
        if (!grid.children.length) return;
        gsap.from(Array.from(grid.children), {
            scrollTrigger: defaultTrigger(grid, "top 82%"),
            y: 60, opacity: 0, scale: 0.85, rotateZ: 3,
            duration: 0.8, stagger: { each: 0.08, from: "center" },
            ease: "back.out(1.4)"
        });
    });

    // ===== 21. INVESTORS — "How to" steps numbered reveal =====
    document.querySelectorAll('.steps .step').forEach((step, i) => {
        const num = step.querySelector('.step__num');
        const content = step.querySelector('.step__content');
        const tl = gsap.timeline({ scrollTrigger: defaultTrigger(step, "top 85%") });
        if (num) {
            tl.fromTo(num,
                { scale: 0, opacity: 0, rotate: -90 },
                { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(1.8)" }, 0);
        }
        if (content) {
            tl.fromTo(content,
                { x: 40, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 0.2);
        }
    });

    // ===== 22. INVESTORS — sector percent counter =====
    document.querySelectorAll('.inv-sector__percent').forEach(el => {
        const raw = el.textContent.trim();
        const match = raw.match(/^(-?\d+[\d.,]*)(.*)$/);
        if (!match) return;
        const target = parseFloat(match[1].replace(/,/g, ''));
        const suffix = match[2];
        if (!isFinite(target)) return;
        const decimals = (match[1].split('.')[1] || '').length;
        const counter = { v: 0 };
        gsap.to(counter, {
            v: target,
            duration: 1.8,
            ease: "power2.out",
            scrollTrigger: defaultTrigger(el, "top 88%"),
            onUpdate() {
                el.textContent = counter.v.toFixed(decimals) + suffix;
            }
        });
    });

    // ===== 23. INVESTORS — sector card enhanced reveal =====
    document.querySelectorAll('.inv-sector').forEach(sector => {
        const header = sector.querySelector('.inv-sector__header');
        const name = sector.querySelector('.inv-sector__name');
        const projects = sector.querySelector('.inv-sector__projects');
        const desc = sector.querySelector('.inv-sector__desc');
        const stats = sector.querySelector('.inv-sector__stats');

        const tl = gsap.timeline({ scrollTrigger: defaultTrigger(sector, "top 85%") });
        if (header) tl.fromTo(header,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0);
        if (name) tl.fromTo(name,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.1);
        if (projects) tl.fromTo(projects,
            { y: 15, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.2);
        if (desc) tl.fromTo(desc,
            { y: 15, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.3);
        if (stats && stats.children.length) tl.fromTo(Array.from(stats.children),
            { y: 10, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" }, 0.4);
    });

// ===== 25. INVESTORS — heading split emphasis (skip if already line-grouped) =====
    document.querySelectorAll('.inv-stats__heading, .principles__heading, .faq__heading, .contact-cta__heading').forEach(h => {
        if (h.dataset.lineGrouped || h.dataset.split) return;
        const lines = splitHeadingByLine(h);
        if (!lines.length) return;
        gsap.from(lines, {
            scrollTrigger: defaultTrigger(h, "top 88%"),
            yPercent: 110,
            opacity: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out"
        });
    });

    // ===== 26. INVESTORS — page-hero parallax bg =====
    const investorsHeroBg = document.querySelector('.page-hero .page-hero__bg img');
    if (investorsHeroBg) {
        gsap.to(investorsHeroBg, {
            y: 100, scale: 1.1,
            ease: "none",
            scrollTrigger: {
                trigger: '.page-hero',
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // Footer is position:fixed with custom reveal-from-under-body effect — no scroll animations here.

    // ===== 27. PAGE LOAD FADE =====
    // Subtle initial fade so the very first paint feels intentional.
    gsap.from('body', { opacity: 0, duration: 0.6, ease: 'power2.out' });

    // ===== 28. IMAGES — clip-path reveal when entering view =====
    document.querySelectorAll('.proj-card__image-wrap, .news-card__image-wrap, .pi-content__image, .ni-content__image, .pi-gallery__item, .culture__image-col, .investors__image-col, .about-who__image-wrap, .about__image-wrap, .career-split__media, .principles__image-wrap, .partner-cta__image').forEach(el => {
        gsap.fromTo(el,
            { clipPath: 'inset(8% 8% 8% 8%)', opacity: 0 },
            {
                clipPath: 'inset(0% 0% 0% 0%)',
                opacity: 1,
                duration: 1.1,
                ease: 'power3.out',
                scrollTrigger: defaultTrigger(el, 'top 88%'),
            }
        );
    });

    // ===== 29. ALL SECTION HEADINGS — line-by-line rise (where not already animated) =====
    document.querySelectorAll('.section-heading, .pi-content__h2, .ni-content__h2').forEach(h => {
        if (h.dataset.lineGrouped || h.dataset.split) return;
        if (heroContent && heroContent.contains(h)) return;
        const lines = splitHeadingByLine(h);
        if (!lines.length) return;
        gsap.from(lines, {
            scrollTrigger: defaultTrigger(h, 'top 88%'),
            yPercent: 110,
            opacity: 0,
            duration: 0.85,
            stagger: 0.09,
            ease: 'power3.out',
        });
    });

    // ===== 30. PARAGRAPH FADE-UP for big body text =====
    document.querySelectorAll('.about__para, .investors__para, .culture__para, .pi-overview__para, .ni-content__p, .ni-hero__lead, .pi-hero__lead, .geography__panel-desc').forEach(p => {
        gsap.from(p, {
            scrollTrigger: defaultTrigger(p, 'top 90%'),
            y: 24,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
        });
    });

    // ===== 31. CURSOR SPOTLIGHT on dark cards =====
    // A soft radial light follows the cursor inside each tracked card.
    const spotlightSelector = [
        '.advantage-card', '.value-card', '.division-card', '.principle-item',
        '.format-card', '.benefit-card', '.proj-card', '.team-card',
        '.contact-info__card', '.contact-dept-card', '.pi-info-card',
        '.ni-card', '.pi-feature', '.inv-sector', '.founder-card'
    ].join(', ');
    document.querySelectorAll(spotlightSelector).forEach(card => {
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
        const glow = document.createElement('span');
        glow.className = 'cursor-glow';
        Object.assign(glow.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            background: 'radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(86,124,223,0.18), transparent 65%)',
            opacity: '0',
            transition: 'opacity .35s ease',
            zIndex: '0',
            mixBlendMode: 'screen',
        });
        card.appendChild(glow);
        card.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });
        card.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * 100;
            const y = ((e.clientY - r.top) / r.height) * 100;
            glow.style.setProperty('--mx', x + '%');
            glow.style.setProperty('--my', y + '%');
        });
    });

    // ===== 32. BG PARALLAX for any section with [data-parallax] =====
    document.querySelectorAll('[data-parallax]').forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        gsap.to(el, {
            yPercent: -20 * speed,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            }
        });
    });

    // ===== 33. SCROLL PROGRESS BAR (top of viewport) =====
    if (!document.querySelector('.scroll-progress')) {
        const bar = document.createElement('div');
        bar.className = 'scroll-progress';
        Object.assign(bar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            height: '2px',
            width: '0%',
            background: 'linear-gradient(90deg, #567cdf, #b9cdff)',
            zIndex: '9999',
            pointerEvents: 'none',
            transformOrigin: 'left center',
            transition: 'width .15s ease-out',
            boxShadow: '0 0 12px rgba(86,124,223,.6)',
        });
        document.body.appendChild(bar);
        const updateBar = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
            bar.style.width = pct + '%';
        };
        window.addEventListener('scroll', updateBar, { passive: true });
        updateBar();
    }

    // ===== 34. SVG ICONS subtle float (decorative icons in card headers) =====
    document.querySelectorAll('.advantage-card__icon-wrap, .value-card__icon-wrap, .division-card__icon-wrap, .pi-feature__num, .principle-item__icon-wrap').forEach((el, i) => {
        gsap.to(el, {
            y: -4,
            duration: 2.4 + (i % 3) * 0.3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: (i * 0.15) % 1.2,
        });
    });

    // ===== 35. SMOOTH refresh on resize (handle dynamic layouts) =====
    let rzTm = null;
    window.addEventListener('resize', () => {
        clearTimeout(rzTm);
        rzTm = setTimeout(() => ScrollTrigger.refresh(), 250);
    });

    // ===== 36a. CAREER PAGE — section-specific richness =====
    (() => {
        // Career-split: text from one side, image from the other
        document.querySelectorAll('.career-split').forEach(split => {
            const media = split.querySelector('.career-split__media');
            const content = split.querySelector('.career-split__content');
            const isReversed = split.querySelector('.career-split__content--left');
            if (media) {
                gsap.from(media, {
                    scrollTrigger: defaultTrigger(split, 'top 80%'),
                    x: isReversed ? 60 : -60,
                    opacity: 0,
                    duration: 1,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity',
                });
            }
            if (content) {
                gsap.from(content, {
                    scrollTrigger: defaultTrigger(split, 'top 80%'),
                    x: isReversed ? -60 : 60,
                    opacity: 0,
                    duration: 1,
                    delay: 0.15,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity',
                });
            }
        });

        // Career-split bullet points cascade in
        document.querySelectorAll('.career-split__points').forEach(list => {
            gsap.from(list.children, {
                scrollTrigger: defaultTrigger(list, 'top 88%'),
                y: 18,
                opacity: 0,
                duration: 0.55,
                stagger: 0.08,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
            });
        });

        // Career-metrics — slight scale-pop on each value as it counts up
        document.querySelectorAll('.career-metrics__item').forEach(item => {
            gsap.from(item, {
                scrollTrigger: defaultTrigger(item, 'top 92%'),
                y: 24,
                opacity: 0,
                duration: 0.7,
                ease: 'back.out(1.4)',
                clearProps: 'transform,opacity',
            });
        });

        // Vacancy chevrons rotate on row hover
        document.querySelectorAll('.vacancy-row').forEach(row => {
            const chev = row.querySelector('.vacancy-row__chevron, .vacancy-row__icon');
            if (!chev) return;
            row.addEventListener('mouseenter', () => gsap.to(chev, { x: 6, duration: 0.35, ease: 'power2.out' }));
            row.addEventListener('mouseleave', () => gsap.to(chev, { x: 0, duration: 0.35, ease: 'power2.out' }));
        });

        // Benefits hover lift (extra to the existing card animations)
        document.querySelectorAll('.benefit-card').forEach(card => {
            const icon = card.querySelector('.benefit-card__icon-wrap');
            card.addEventListener('mouseenter', () => {
                if (icon) gsap.to(icon, { rotate: 8, scale: 1.08, duration: 0.45, ease: 'back.out(2)' });
            });
            card.addEventListener('mouseleave', () => {
                if (icon) gsap.to(icon, { rotate: 0, scale: 1, duration: 0.45, ease: 'power2.out' });
            });
        });

        // Process step number — rotate-in
        document.querySelectorAll('.process-step__number, .process__number').forEach((num, i) => {
            gsap.from(num, {
                scrollTrigger: defaultTrigger(num, 'top 88%'),
                rotate: -45,
                scale: 0.6,
                opacity: 0,
                duration: 0.9,
                ease: 'back.out(1.8)',
                clearProps: 'transform,opacity',
            });
        });
    })();

    // ===== 36. GOLDEN PARTICLES — soft motes drifting across the entire viewport =====
    (() => {
        if (document.querySelector('.particles')) return;

        // Append inside page-shell so particles sit between the waves (z:-1)
        // and the section content (z:1+) — they show through transparent sections
        // but stay behind cards/text/buttons that have their own backgrounds.
        const host = document.querySelector('.page-shell') || document.body;
        const layer = document.createElement('div');
        layer.className = 'particles';
        // Prepend so the layer sits at the bottom of the DOM stacking order — combined
        // with z-index:0 (and z-index:2 on real sections) it stays behind page content.
        host.insertBefore(layer, host.firstChild);

        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const COUNT = isMobile ? 60 : 120;
        const rand = (min, max) => Math.random() * (max - min) + min;

        const spawn = (delay = 0) => {
            const p = document.createElement('span');
            p.className = 'particle';
            const size = rand(1, 3);
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            layer.appendChild(p);
            animate(p, delay, true);
        };

        const animate = (p, delay = 0, firstRun = false) => {
            const startX = rand(0, window.innerWidth);
            const startY = firstRun
                ? rand(0, window.innerHeight)        // first time: scatter everywhere
                : rand(-40, window.innerHeight + 40); // respawn anywhere too
            const driftX = rand(-200, 200);
            const driftY = rand(-200, 200);
            const duration = rand(12, 24);
            const peakOpacity = rand(0.6, 1);

            gsap.set(p, { x: startX, y: startY, scale: rand(0.6, 1.3), opacity: 0 });

            const tl = gsap.timeline({ delay, onComplete: () => animate(p, 0, false) });
            // Twinkle: fade in, hold, fade out
            tl.to(p, { opacity: peakOpacity, duration: duration * 0.18, ease: 'sine.out' }, 0)
              .to(p, { opacity: 0, duration: duration * 0.22, ease: 'sine.in' }, duration * 0.78)
              // Random drift in any direction
              .to(p, {
                  x: startX + driftX,
                  y: startY + driftY,
                  duration,
                  ease: 'none',
              }, 0)
              // Subtle scale pulse for a more alive feel
              .to(p, {
                  scale: '+=' + rand(-0.3, 0.4),
                  duration: duration / 2,
                  yoyo: true,
                  repeat: 1,
                  ease: 'sine.inOut',
              }, 0);
        };

        for (let i = 0; i < COUNT; i++) {
            spawn(rand(0, 6));
        }

        // Re-distribute when viewport resizes significantly
        let resizeTm = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTm);
            resizeTm = setTimeout(() => {
                gsap.killTweensOf(layer.querySelectorAll('.particle'));
                layer.innerHTML = '';
                const newCount = window.matchMedia('(max-width: 768px)').matches ? 60 : 120;
                for (let i = 0; i < newCount; i++) spawn(rand(0, 4));
            }, 400);
        });
    })();
});
