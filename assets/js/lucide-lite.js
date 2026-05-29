// Local icon shim for the root dashboard.
// It preserves the existing data-lucide markup without depending on the Lucide CDN.
(function () {
  const ICONS = {
    'layout-dashboard': '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />',
    smartphone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18h2" />',
    shield: '<path d="M12 2 19 5v6c0 5-3.5 8.5-7 11-3.5-2.5-7-6-7-11V5z" />',
    'app-window': '<rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 8.5h17" />',
    'file-search': '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><circle cx="11.5" cy="13.5" r="2.5" /><path d="m13.5 15.5 2 2" />',
    'alert-triangle': '<path d="M10.3 4.5 2.7 18a1.5 1.5 0 0 0 1.3 2.2h16a1.5 1.5 0 0 0 1.3-2.2L13.7 4.5a1.8 1.8 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 16h.01" />',
    'bar-chart-2': '<path d="M4 20h16" /><path d="M7 20V10" /><path d="M12 20V6" /><path d="M17 20v-8" />',
    settings: '<circle cx="12" cy="12" r="3.25" /><path d="M12 2.75v2.4M12 18.85v2.4M4.95 4.95l1.7 1.7M17.35 17.35l1.7 1.7M2.75 12h2.4M18.85 12h2.4M4.95 19.05l1.7-1.7M17.35 6.65l1.7-1.7" />',
    'log-out': '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" /><path d="M16 16l4-4-4-4" /><path d="M20 12H9" />',
    menu: '<path d="M4 6h16M4 12h16M4 18h16" />',
    'chevron-right': '<path d="m9 6 6 6-6 6" />',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" />',
    'refresh-cw': '<path d="M20 12a8 8 0 0 0-14.5-4.5" /><path d="M4 4v5h5" /><path d="M4 12a8 8 0 0 0 14.5 4.5" /><path d="M20 20v-5h-5" />',
    download: '<path d="M12 3v10" /><path d="m8 10 4 4 4-4" /><path d="M4 20h16" />',
    plus: '<path d="M12 5v14M5 12h14" />',
    search: '<circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />',
    'check-circle': '<circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" />',
    'alert-circle': '<circle cx="12" cy="12" r="9" /><path d="M12 7v5" /><path d="M12 16h.01" />',
    'user-plus': '<path d="M16 19v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="3" /><path d="M19 8v6M22 11h-6" />',
    'qr-code': '<rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />',
    'lock-keyhole': '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><path d="M12 14v3" />',
    'shield-check': '<path d="M12 2 19 5v6c0 5-3.5 8.5-7 11-3.5-2.5-7-6-7-11V5z" /><path d="m9 12 2 2 4-4" />',
    'shield-off': '<path d="M12 2 19 5v6c0 5-3.5 8.5-7 11-.9-.6-1.8-1.2-2.6-1.9" /><path d="M4 4l16 16" />',
    'battery-low': '<rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 11v2" /><path d="M6 12h4" />',
    clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
    'file-text': '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M9 13h6M9 17h6M9 9h3" />',
    'wifi': '<path d="M2.5 8.5a16 16 0 0 1 19 0" /><path d="M6.5 12.5a10 10 0 0 1 11 0" /><path d="M10.5 16.5a4 4 0 0 1 3 0" /><circle cx="12" cy="20" r="1" />',
    'key-round': '<path d="M14 10a4 4 0 1 0-1.5 3.1L21 21" /><circle cx="10" cy="10" r="1.5" />',
    'edit-3': '<path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />',
  };

  function buildSvg(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || '<circle cx="12" cy="12" r="9" /><path d="M8 12h8" />';
    return svg;
  }

  function createIcons() {
    document.querySelectorAll('svg[data-lucide]:not([data-lucide-processed])').forEach((element) => {
      const iconName = element.getAttribute('data-lucide');
      const replacement = buildSvg(iconName);
      if (element.getAttribute('width')) replacement.setAttribute('width', element.getAttribute('width'));
      if (element.getAttribute('height')) replacement.setAttribute('height', element.getAttribute('height'));
      if (element.getAttribute('style')) replacement.setAttribute('style', element.getAttribute('style'));
      if (element.getAttribute('class')) replacement.setAttribute('class', element.getAttribute('class'));
      element.replaceWith(replacement);
      replacement.setAttribute('data-lucide-processed', 'true');
    });
  }

  window.lucide = { createIcons };
})();