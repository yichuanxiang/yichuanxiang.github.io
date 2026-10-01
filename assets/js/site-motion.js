(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const timing = { fast: 240, enter: 360, stagger: 35, easing: 'cubic-bezier(.22,1,.36,1)' };
  const playing = new WeakMap();
  const animate = (node, frames, options) => {
    if (!node || reduce.matches || !node.animate) return;
    playing.get(node)?.cancel();
    const animation = node.animate(frames, { duration: timing.fast, easing: timing.easing, ...options });
    playing.set(node, animation);
    animation.finished.then(() => { if (playing.get(node) === animation) playing.delete(node); }).catch(() => {});
  };
  const reveal = nodes => {
    let index = 0;
    [...nodes].forEach(node => {
      const rect = node.getBoundingClientRect();
      if (node.hidden || rect.bottom < 0 || rect.top > innerHeight) return;
      animate(node, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timing.enter, delay: Math.min(index++, 5) * timing.stagger });
    });
  };
  window.StationMotion = {
    reveal,
    bookmark(button, active) {
      animate(button.querySelector('svg'), [{ transform: 'scale(1) rotate(0)' }, { transform: `scale(${active ? 1.3 : .85}) rotate(${active ? -12 : 8}deg)`, offset: .4 }, { transform: 'scale(1) rotate(0)' }]);
    }
  };
  const controls = 'button, .station-shortcuts > a, .cappu-action, .station-page-nav > a, #menu a, .interest-entry > summary';
  document.addEventListener('click', event => {
    const control = event.target.closest(controls);
    if (!control || control.disabled || reduce.matches) return;
    animate(control, [{ scale: '1' }, { scale: '.96', offset: .25 }, { scale: '1' }]);
    const rect = control.getBoundingClientRect();
    const ink = document.createElement('span');
    ink.className = 'station-click-ink';
    ink.setAttribute('aria-hidden', 'true');
    ink.style.left = `${event.detail ? event.clientX : rect.left + rect.width / 2}px`;
    ink.style.top = `${event.detail ? event.clientY : rect.top + rect.height / 2}px`;
    document.body.append(ink);
    const remove = () => ink.remove();
    ink.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 650);
    if (control.matches('[data-focus-minutes], [data-focus-custom], [data-focus-reset]')) requestAnimationFrame(() => reveal(document.querySelectorAll('.focus-clock')));
  }, true);
  // Leave off-screen content fully readable even when JS or observers are unavailable.
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      const entered = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
      reveal(entered);
      entered.forEach(node => observer.unobserve(node));
    }, { threshold: .08 });
    document.querySelectorAll('.post-entry, .station-list-row, .update-timeline article, .station-shortcuts > a').forEach(node => {
      if (node.getBoundingClientRect().top >= innerHeight) observer.observe(node);
    });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    document.querySelectorAll('.station-click-ink').forEach(node => node.remove());
    document.getAnimations().filter(animation => !animation.effect?.pseudoElement).forEach(animation => animation.cancel());
  });
})();
