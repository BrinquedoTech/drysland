import gsap from 'gsap'

export default class Element {
  get disabled() {
    return this.element?.style.pointerEvents === 'none'
  }

  constructor(selectorOrElement) {
    this.element =
      typeof selectorOrElement === 'string'
        ? document.querySelector(selectorOrElement)
        : selectorOrElement

    // Verificar se o elemento existe
    if (!this.element) {
      console.warn(`Element not found: ${selectorOrElement}`)
      return
    }

    gsap.set(this.element, { scale: 0 })
    this.element.classList.remove('hidden')
    this.element.setAttribute('tabindex', '-1')
  }

  show(options = { wiggle: false }) {
    if (!this.element) return this
    
    this.animation?.kill()

    this.animation = gsap.to(this.element, {
      scale: 1,
      duration: 0.5,
      ease: 'back.out',
      onComplete: () => options.wiggle && this.element.classList.add('animate-wiggle'),
    })

    return this
  }

  hide() {
    if (!this.element) return this
    
    this.animation?.kill()

    this.animation = gsap.to(this.element, {
      scale: 0,
      duration: 0.5,
      ease: 'back.in',
      onStart: () => this.element.classList.remove('animate-wiggle'),
    })

    return this
  }

  disable(applyClass) {
    if (!this.element) return this
    
    applyClass && this.element.classList.add('disabled')
    this.element.style.pointerEvents = 'none'
    return this
  }

  enable() {
    if (!this.element) return this
    
    this.element.classList.remove('disabled')
    this.element.style.pointerEvents = 'auto'
    return this
  }
}
