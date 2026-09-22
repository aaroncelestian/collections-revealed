/**
 * Show or hide a full-screen overlay layer.
 *
 * Un-hiding and adding the fade class in separate animation frames leaves
 * Chrome with a frozen mid-transition opacity when beats change quickly, so
 * the un-hide is followed by a synchronous reflow and the class change lands
 * in the same frame.
 */
export function setLayerVisible(root: HTMLElement, visible: boolean) {
  if (visible) {
    if (!root.hidden && root.classList.contains('is-visible')) return
    root.hidden = false
    void root.offsetWidth
    root.classList.add('is-visible')
    return
  }

  if (root.hidden) return
  root.classList.remove('is-visible')
  root.hidden = true
}
