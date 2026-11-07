// Tables that scroll sideways fade out at the right edge while there are more columns to see,
// so a phone shows that the box score carries on. The fade goes once you reach the last column.
export function startEdgeFade(root = document) {
  const upd = el => el.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  let queued = false;
  const all = () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; root.querySelectorAll('.tbl-wrap').forEach(upd); });
  };
  const onScroll = e => e.target.classList?.contains('tbl-wrap') && upd(e.target);
  document.addEventListener('scroll', onScroll, true);
  addEventListener('resize', all);
  // Tables appear and change as you move around the site, so check again after each change.
  const mo = new MutationObserver(all);
  mo.observe(document.body, { childList: true, subtree: true });
  all();
  return () => { document.removeEventListener('scroll', onScroll, true); removeEventListener('resize', all); mo.disconnect(); };
}
