(() => {
  const body = document.body;

  // --- Theme Toggle ---
  const toggle = document.getElementById('theme-toggle');
  const iconSun  = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  function applyTheme(dark) {
    body.setAttribute('data-theme', dark ? 'dark' : 'light');
    iconSun.style.display  = dark ? 'block' : 'none';
    iconMoon.style.display = dark ? 'none'  : 'block';
  }

  applyTheme(true); // default dark

  toggle.addEventListener('click', () => {
    const isDark = body.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
  });

  // --- Mouse Highlight ---
  window.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
  });

  // --- IntersectionObserver for Nav ---
  const navLinks = document.querySelectorAll('.sidebar nav a');

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('section[id]').forEach((s) => navObserver.observe(s));

  // --- Fade-in on Scroll ---
  const fadeElements = document.querySelectorAll('.card, .section-text, .arrow-link');
  fadeElements.forEach((el, i) => {
    el.classList.add('fade-in');
    el.style.transitionDelay = (i % 5) * 150 + 'ms';
  });

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Clear the stagger delay after fade-in so it doesn't affect hover transitions
          const delay = parseFloat(entry.target.style.transitionDelay) || 0;
          setTimeout(() => { entry.target.style.transitionDelay = ''; }, delay + 600);
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  fadeElements.forEach((el) => fadeObserver.observe(el));
})();
