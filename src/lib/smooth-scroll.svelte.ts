/**
 * Smooth horizontal board scrolling for the Metro tile board.
 *
 * Owns the wheel-driven easing loop (requestAnimationFrame), the scroll
 * progress/canScroll/activeGroup state read by the footer, and the rule
 * that a user wheel scroll dismisses an open context menu while incidental
 * programmatic scrolls do not.
 */
export class SmoothScroller {
  canScroll = $state(false)
  scrollProgress = $state(0)
  activeGroup = $state(0)

  #targetScroll = 0
  #currentScroll = 0
  #smoothFrame: number | null = null
  /**
   * Timestamp of the last wheel event, used to tell user scrolls (dismiss the
   * context menu) from incidental programmatic ones such as layout-transition
   * clamps and scrollIntoView, which must not dismiss it.
   */
  #wheelIntentAt = 0

  #getScroller: () => HTMLElement | null
  #isReducedMotion: () => boolean
  #isMenuOpen: () => boolean
  #closeMenu: () => void

  constructor(deps: {
    getScroller: () => HTMLElement | null
    isReducedMotion: () => boolean
    isMenuOpen: () => boolean
    closeMenu: () => void
  }) {
    this.#getScroller = deps.getScroller
    this.#isReducedMotion = deps.isReducedMotion
    this.#isMenuOpen = deps.isMenuOpen
    this.#closeMenu = deps.closeMenu
  }

  updateScroll = () => {
    const scroller = this.#getScroller()
    if (!scroller)
      return
    const max = scroller.scrollWidth - scroller.clientWidth
    this.canScroll = max > 3
    this.scrollProgress = max > 0 ? scroller.scrollLeft / max : 0
    if (this.#smoothFrame === null) {
      this.#targetScroll = scroller.scrollLeft
      this.#currentScroll = scroller.scrollLeft
    }
    const elements = [
      ...scroller.querySelectorAll<HTMLElement>('[data-testid="metro-group"]'),
    ]
    const left = scroller.scrollLeft + 80
    this.activeGroup = Math.max(
      0,
      elements.findLastIndex(element => element.offsetLeft <= left),
    )
  }

  /**
   * A user scroll (wheel/touchpad) dismisses the context menu. Incidental
   * programmatic scrolls (layout transitions, scrollIntoView) do not.
   */
  closeMenuOnBoardScroll = () => {
    if (this.#isMenuOpen() && performance.now() - this.#wheelIntentAt < 600)
      this.#closeMenu()
    this.updateScroll()
  }

  cancelSmoothScroll = () => {
    if (this.#smoothFrame !== null) {
      cancelAnimationFrame(this.#smoothFrame)
      this.#smoothFrame = null
    }
    const scroller = this.#getScroller()
    if (scroller)
      scroller.style.scrollBehavior = ''
  }

  #smoothScroll = () => {
    const scroller = this.#getScroller()
    if (!scroller) {
      this.#smoothFrame = null
      return
    }
    const diff = this.#targetScroll - this.#currentScroll

    // Stop when close enough
    if (Math.abs(diff) < 0.5) {
      this.#currentScroll = this.#targetScroll
      scroller.scrollLeft = this.#currentScroll
      this.#smoothFrame = null
      scroller.style.scrollBehavior = ''
      return
    }

    this.#currentScroll += diff * 0.15 // easing factor (lower = smoother/slower)
    scroller.scrollLeft = this.#currentScroll
    this.#smoothFrame = requestAnimationFrame(this.#smoothScroll)
  }

  wheel = (event: WheelEvent) => {
    this.#wheelIntentAt = performance.now()
    const scroller = this.#getScroller()
    if (
      !scroller
      || event.ctrlKey
      || !this.canScroll
      || Math.abs(event.deltaX) >= Math.abs(event.deltaY)
    ) {
      return
    }

    if (scroller.scrollHeight > scroller.clientHeight + 4 && !event.shiftKey)
      return

    event.preventDefault()

    const delta
      = event.deltaY
        * (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
          ? scroller.clientWidth
          : 1)

    if (this.#isReducedMotion()) {
      this.cancelSmoothScroll()
      scroller.scrollLeft += delta
      this.#targetScroll = scroller.scrollLeft
      this.#currentScroll = scroller.scrollLeft
      return
    }

    if (this.#smoothFrame === null) {
      // Resync in case of external scrolls (scrollbar, keyboard, buttons).
      this.#targetScroll = scroller.scrollLeft
      this.#currentScroll = scroller.scrollLeft
      // Avoid CSS smooth behavior double-smoothing direct scrollLeft writes.
      scroller.style.scrollBehavior = 'auto'
    }

    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    this.#targetScroll = Math.min(Math.max(this.#targetScroll + delta, 0), maxScroll)

    if (this.#smoothFrame === null) {
      this.#smoothFrame = requestAnimationFrame(this.#smoothScroll)
    }
  }

  scroll = (direction: -1 | 1) => {
    this.cancelSmoothScroll()
    const scroller = this.#getScroller()
    scroller?.scrollBy({
      left: direction * Math.max(250, scroller.clientWidth * 0.65),
      behavior: this.#isReducedMotion() ? 'instant' : 'smooth',
    })
  }

  jump = (index: number) => {
    const scroller = this.#getScroller()
    const element
      = scroller?.querySelectorAll<HTMLElement>('[data-testid="metro-group"]')[index]
    if (element !== undefined && scroller !== null)
      this.cancelSmoothScroll()
    if (element !== undefined && scroller !== null) {
      scroller.scrollTo({
        left: Math.max(0, element.offsetLeft - 68),
        behavior: this.#isReducedMotion() ? 'instant' : 'smooth',
      })
    }
  }
}
