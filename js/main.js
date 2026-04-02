(() => {
  const html = document.documentElement;

  // --- Theme Toggle ---
  const toggle = document.getElementById('theme-toggle');
  const iconSun  = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  function applyTheme(dark) {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    iconSun.style.display  = dark ? 'block' : 'none';
    iconMoon.style.display = dark ? 'none'  : 'block';
  }

  applyTheme(true); // default dark

  toggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
  });

  // --- Star Field ---
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.3 + 0.2,
        alpha: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.0008 + 0.0003,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }

  resizeCanvas();
  initStars();
  requestAnimationFrame(drawStars);
  window.addEventListener('resize', () => { resizeCanvas(); initStars(); });

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
