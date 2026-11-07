import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import { CrashGuard } from './components/Crash.jsx';
import { sfx } from './lib/sfx.js';

// A soft click for every button, link and chip. Keys on the recording pad, the player list and the tappable avatars
// make their own sounds instead.
addEventListener('pointerdown', e => {
  const el = e.target.closest?.('button, a[href], [role="button"], select, input[type="checkbox"]');
  if (!el || el.disabled || el.closest('.key, .prow, .pstage, .hstage')) return;
  sfx('tap');
}, { capture: true, passive: true });

// After the site is updated, a page left open may ask for files that no longer exist. Reloading picks up the
// new version (a game being recorded is kept on the device).
addEventListener('vite:preloadError', e => { e.preventDefault(); location.reload(); });

createRoot(document.getElementById('root')).render(<CrashGuard><App /></CrashGuard>);
