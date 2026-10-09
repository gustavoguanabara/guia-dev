/**
 * @file js/parallax.js
 * @description Motor matemático de física LERP, cálculos de projeção e gerenciamento de coordenadas de rolagem.
 * Zero external dependencies.
 */

export class ParallaxController {
  constructor(options = {}) {
    this.lerpFactor = options.lerpFactor || 0.075;
    this.mouseLerpFactor = options.mouseLerpFactor || 0.05;

    // Estado do scroll
    this.targetScroll = window.scrollY || 0;
    this.currentScroll = this.targetScroll;
    this.maxScroll = 1;
    this.globalProgress = 0;

    // Estado do mouse / touch (normalizado de -1 a 1)
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;

    // Estado de toque e respiração autônoma 2.5D para mobile
    this.isTouchActive = false;
    this.hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    this.lastInteractionTime = performance.now();

    // Cache de seções
    this.sectionElements = [];
    this.totalSections = 0;

    this._onScroll = this._onScroll.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onResize = this._onResize.bind(this);

    this.initListeners();
    this.updateDimensions();
  }

  initListeners() {
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._onResize, { passive: true });
    }
  }

  destroy() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
    window.removeEventListener('resize', this._onResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._onResize);
    }
  }

  _onScroll() {
    this.targetScroll = window.scrollY || window.pageYOffset || 0;
  }

  _onMouseMove(event) {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;
    this.targetMouseX = (event.clientX - halfWidth) / halfWidth;
    this.targetMouseY = (event.clientY - halfHeight) / halfHeight;
  }

  _onTouchStart(event) {
    this.isTouchActive = true;
    this.lastInteractionTime = performance.now();
    if (event.touches && event.touches[0]) {
      this._updateTouchCoords(event.touches[0]);
    }
  }

  _onTouchMove(event) {
    this.lastInteractionTime = performance.now();
    if (event.touches && event.touches[0]) {
      this._updateTouchCoords(event.touches[0]);
    }
  }

  _onTouchEnd() {
    this.isTouchActive = false;
    this.lastInteractionTime = performance.now();
  }

  _updateTouchCoords(touch) {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;
    this.targetMouseX = (touch.clientX - halfWidth) / halfWidth;
    this.targetMouseY = (touch.clientY - halfHeight) / halfHeight;
  }

  _onResize() {
    this.updateDimensions();
  }

  registerSections(elements) {
    this.sectionElements = Array.from(elements);
    this.totalSections = this.sectionElements.length;
    this.updateDimensions();
  }

  updateDimensions() {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const windowHeight = window.innerHeight;
    this.maxScroll = Math.max(docHeight - windowHeight, 1);
  }

  /**
   * Atualiza a interpolação suave (LERP) a cada frame do requestAnimationFrame.
   * @param {number} [time] - Timestamp de alta precisão
   */
  update(time = performance.now()) {
    // Interpolação LERP do scroll
    const scrollDelta = this.targetScroll - this.currentScroll;
    this.currentScroll += scrollDelta * this.lerpFactor;

    if (Math.abs(scrollDelta) < 0.01) {
      this.currentScroll = this.targetScroll;
    }

    // Progresso global normalizado (0.0 no topo a 1.0 no final)
    this.globalProgress = Math.min(Math.max(this.currentScroll / this.maxScroll, 0), 1);

    // Respiração 2.5D autônoma para dispositivos móveis ou quando inativo
    if (!this.isTouchActive && this.hasTouch) {
      const idleTiltX = Math.sin(time * 0.0012) * 0.35;
      const idleTiltY = Math.cos(time * 0.0016) * 0.25;
      this.targetMouseX = idleTiltX;
      this.targetMouseY = idleTiltY;
    }

    // Interpolação LERP do mouse/tilt para efeito 2.5D
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * this.mouseLerpFactor;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * this.mouseLerpFactor;
  }

  /**
   * Calcula a métrica espacial de uma seção em relação à viewport atual.
   * @param {number} index - Índice da seção.
   * @returns {{ distanceRatio: number, visibility: number, inView: boolean }}
   */
  getSectionMetrics(index) {
    if (!this.sectionElements[index]) {
      return { distanceRatio: 0, visibility: 0, inView: false };
    }

    const element = this.sectionElements[index];
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Distância do centro da seção em relação ao centro da janela
    // -1 quando a seção acabou de sair pelo topo, 0 no centro exato, +1 quando está prestes a entrar pela base
    const sectionCenter = rect.top + rect.height / 2;
    const viewportCenter = windowHeight / 2;
    const distanceRatio = (sectionCenter - viewportCenter) / windowHeight;

    // Fator de visibilidade de 0 a 1 (1 quando centralizado, 0 quando fora)
    const visibility = Math.max(0, 1 - Math.abs(distanceRatio) * 1.15);
    const inView = rect.bottom > 0 && rect.top < windowHeight;

    return {
      distanceRatio,
      visibility: Math.min(visibility, 1),
      inView,
      top: rect.top,
      height: rect.height
    };
  }

  /**
   * Rola suavemente até a seção desejada.
   * @param {number} index - Índice da seção.
   */
  scrollToSection(index) {
    if (!this.sectionElements[index]) return;
    const targetElement = this.sectionElements[index];
    targetElement.scrollIntoView({ behavior: 'smooth' });
  }
}
