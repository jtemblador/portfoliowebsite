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

  const observer = new IntersectionObserver(
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

  document.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
})();
