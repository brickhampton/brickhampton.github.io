import { lazy, Suspense } from 'react';

// Parts of the site most visits never open load only when they're needed, so the first visit downloads less:
// recording a game, Settings and Admin, the avatar builder, editing a game and the Share image.
// Once the site has loaded they're fetched in the background anyway, so opening them later is instant.
const LOADERS = [];
function later(load, name, fallback = null) {
  const L = lazy(() => load().then(m => ({ default: m[name] })));
  LOADERS.push(load);
  return function Later(props) { return <Suspense fallback={fallback}><L {...props} /></Suspense>; };
}

export const Setup = later(() => import('./screens/Setup.jsx'), 'Setup');
export const Entry = later(() => import('./screens/Entry.jsx'), 'Entry');
export const Settings = later(() => import('./screens/Settings.jsx'), 'Settings');
export const EditGame = later(() => import('./screens/EditGame.jsx'), 'EditGame');
export const AvatarSheet = later(() => import('./screens/AvatarSheet.jsx'), 'AvatarSheet');
export const ShareSheet = later(() => import('./components/ShareSheet.jsx'), 'ShareSheet');

// Fetch the rest once the browser is idle.
export function preloadRest() {
  const go = () => LOADERS.forEach(l => l().catch(() => {}));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 2000);
}
