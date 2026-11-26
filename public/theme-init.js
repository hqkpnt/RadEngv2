(function () {
  // 1. Active Anti-Clickjacking Guard (protects static hosting like GitHub Pages)
  try {
    if (window.self !== window.top) {
      try {
        window.top.location.replace(window.self.location.href);
      } catch (_e) {
        window.__CLICKJACKING_BLOCKED__ = true;
      }
    }
  } catch (_err) {
    window.__CLICKJACKING_BLOCKED__ = true;
  }

  // 2. Pre-render theme & font initialization (no flash)
  try {
    var raw = localStorage.getItem('engapp_v2_prefs');
    var prefs = raw ? JSON.parse(raw) : {};
    var theme = prefs.theme || 'system';
    var resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-font', prefs.fontSize || 'medium');
    document.documentElement.setAttribute('data-track', 'rad_dsa');
  } catch (_e) {}
})();
