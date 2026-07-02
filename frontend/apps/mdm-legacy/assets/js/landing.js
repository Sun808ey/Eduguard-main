// Landing page interactions for EduGuard system
// Lightweight, unobtrusive, and safe: runs only on the landing page.
(function () {
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  const page = document.body;
  if (!page || !page.classList.contains('landing-page')) return;

  const header = qs('.landing-header');
  const navToggle = qs('[data-nav-toggle]');
  const navMenu = qs('[data-nav-menu]');
  const form = qs('#demo-form');
  const status = qs('#form-status');
  const countTargets = qsa('[data-countup]');

  if (navToggle && navMenu && header) {
    navToggle.addEventListener('click', () => {
      const expanded = header.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    qsa('a[href^="#"]', navMenu).forEach((link) => {
      link.addEventListener('click', () => {
        header.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Smooth scrolling for anchors, with no-op if the browser already supports CSS scroll-behavior.
  qsa('a[href^="#"]', document).forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', hash);
    });
  });

  // Count-up animation when stats enter the viewport.
  if (countTargets.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.countup || '0');
        const duration = 1200;
        const start = performance.now();
        const startValue = 0;

        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const value = Math.round(startValue + (target - startValue) * progress);
          el.textContent = String(value);
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else if (target === 0) {
            el.textContent = '0';
          }
        }

        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.45 });

    countTargets.forEach((target) => observer.observe(target));
  }

  if (form && status) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const fields = Array.from(form.elements).filter((el) => {
        return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
      });
      let firstInvalid = null;

      fields.forEach((field) => {
        const input = field;
        if (!input.checkValidity()) {
          input.setAttribute('aria-invalid', 'true');
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.removeAttribute('aria-invalid');
        }
      });

      if (firstInvalid) {
        status.textContent = 'Please complete the required fields before submitting.';
        firstInvalid.focus();
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting…';
      }

      status.textContent = 'Request submitted successfully. We will contact you soon.';
      form.reset();

      window.setTimeout(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit request';
        }
      }, 1200);
    });
  }
})();
