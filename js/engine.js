/**
 * @file js/engine.js
 * @description Motor gráfico de renderização Canvas 2D com suporte a High-DPI, multi-camadas de parallax,
 * partículas atmosféricas 3D e levitação senoidal de elementos.
 * Zero external dependencies.
 */

export class CanvasEngine {
  constructor(canvasElement, parallaxController, projectData, imageMap) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: false });
    this.parallax = parallaxController;
    this.projectData = projectData;
    this.imageMap = imageMap;

    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.particles = [];
    this.isRunning = false;
    this.animationFrameId = null;

    this.initParticles(80);
    this.resize();
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Otimização para até 2x DPR
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  initParticles(count) {
    this.particles = [];
    const colors = ['#00f2fe', '#4facfe', '#9d4edd', '#ffffff', '#ffd166'];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: 0.2 + Math.random() * 0.8, // Profundidade espacial
        radius: 0.8 + Math.random() * 1.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: 0.15 + Math.random() * 0.55,
        speedY: (0.15 + Math.random() * 0.35),
        pulseSpeed: 0.001 + Math.random() * 0.003
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const renderLoop = (time) => {
      if (!this.isRunning) return;
      this.parallax.update();
      this.render(time);
      if (typeof this.onFrame === 'function') {
        this.onFrame(time);
      }
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this._onResize);
  }

  /**
   * Ciclo principal de desenho a 60 FPS
   */
  render(time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Limpeza do quadro com cor base escura
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0, 0, w, h);

    // 2. Renderização das camadas de background dos projetos (Camada 0)
    this.renderBackgroundLayers(ctx, w, h);

    // 3. Renderização de partículas atmosféricas dinâmicas (Camada intermediária)
    this.renderParticles(ctx, w, h, time);

    // 4. Renderização dos Elementos 3D Centrais em Parallax (Camada 1)
    this.render3DElements(ctx, w, h, time);

    // 5. Vinheta sutil e gradação de iluminação nas bordas
    this.renderVignette(ctx, w, h);
  }

  /**
   * Renderiza os fundos cenográficos com deslocamento reduzido (profundidade de horizonte).
   */
  renderBackgroundLayers(ctx, w, h) {
    const projects = this.projectData.projects;

    projects.forEach((proj, index) => {
      // O índice da seção é (index + 1), pois o índice 0 é a cena Hero
      const sectionIndex = index + 1;
      const metrics = this.parallax.getSectionMetrics(sectionIndex);

      if (!metrics.inView || metrics.visibility <= 0) return;

      const alpha = Math.min(Math.max(metrics.visibility, 0), 1);
      ctx.save();
      ctx.globalAlpha = alpha;

      const bgImage = this.imageMap.get(proj.backgroundImage);

      if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        // Deslocamento de paralaxe lento para o fundo
        const bgParallaxOffset = metrics.distanceRatio * (h * 0.18);
        this.drawCoverImage(ctx, bgImage, 0, bgParallaxOffset, w, h);
      } else {
        // Fallback procedural se a imagem não estiver disponível
        ctx.fillStyle = proj.backgroundColor || '#132338';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
    });
  }

  /**
   * Renderiza as partículas cósmicas/atmosféricas com profundidade Z.
   */
  renderParticles(ctx, w, h, time) {
    ctx.save();
    const scrollDelta = this.parallax.targetScroll - this.parallax.currentScroll;
    const mouseX = this.parallax.currentMouseX;
    const mouseY = this.parallax.currentMouseY;

    this.particles.forEach((p) => {
      // Movimento contínuo + influência do scroll e do mouse proporcional ao Z
      p.y -= p.speedY * p.z;
      p.y -= scrollDelta * 0.08 * p.z;

      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      } else if (p.y > h) {
        p.y = 0;
        p.x = Math.random() * w;
      }

      const pulse = Math.sin(time * p.pulseSpeed) * 0.2;
      const finalAlpha = Math.min(Math.max(p.baseAlpha + pulse, 0.05), 0.9);

      // Deslocamento sutil pelo mouse
      const drawX = p.x + mouseX * 20 * p.z;
      const drawY = p.y + mouseY * 20 * p.z;

      ctx.beginPath();
      ctx.arc(drawX, drawY, p.radius * p.z, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = finalAlpha;
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Renderiza os elementos 3D com levitação senoidal, rotação sutil e profundidade.
   */
  render3DElements(ctx, w, h, time) {
    const projects = this.projectData.projects;
    const isDesktop = w > 1024;
    const isSingleColumn = w <= 1024;

    projects.forEach((proj, index) => {
      const sectionIndex = index + 1;
      const metrics = this.parallax.getSectionMetrics(sectionIndex);

      if (!metrics.inView || metrics.visibility <= 0) return;

      const elementImg = this.imageMap.get(proj.element3D);
      if (!elementImg || !elementImg.complete || elementImg.naturalWidth === 0) return;

      ctx.save();

      // Posição central: em desktop (> 1024px), alternância lateral (esquerda / direita).
      // Em telas compactas/intermediárias (<= 1024px): centralizado horizontalmente no terço superior.
      let targetCenterX = w * 0.5;
      let targetCenterY = h * 0.5;

      if (isDesktop) {
        targetCenterX = (index % 2 === 0) ? w * 0.68 : w * 0.32;
        targetCenterY = h * 0.5;
      } else {
        targetCenterX = w * 0.5;
        // Posicionado no terço superior (aproximadamente 29% da altura da tela)
        targetCenterY = h * 0.29;
      }

      // Deslocamento vertical com paralaxe acentuado proporcional ao formato da tela
      const parallaxSpeedFactor = isSingleColumn ? 0.35 : 0.65;
      const elementParallaxY = metrics.distanceRatio * (h * parallaxSpeedFactor);
      const levitationAmplitude = isSingleColumn ? 8 : 15;
      const levitation = Math.sin(time * 0.002 + index * 1.5) * levitationAmplitude;

      const finalX = targetCenterX + (this.parallax.currentMouseX * (isSingleColumn ? 12 : 25));
      const finalY = targetCenterY + elementParallaxY + levitation + (this.parallax.currentMouseY * (isSingleColumn ? 10 : 20));

      // Escala e rotação dinâmicas
      const scaleFactor = Math.min(Math.max(0.7 + (metrics.visibility * 0.3), 0.5), 1.05);
      const rotation = (metrics.distanceRatio * (isSingleColumn ? 0.05 : 0.08)) + (this.parallax.currentMouseX * 0.03);

      // Tamanho proporcional responsivo rigoroso para mobile/tablet vs desktop amplo
      const baseSize = isSingleColumn
        ? Math.min(w * 0.68, h * 0.32, 300)
        : Math.min(w * 0.45, h * 0.55, 520);
      const aspect = elementImg.naturalWidth / elementImg.naturalHeight;
      const drawWidth = baseSize * scaleFactor;
      const drawHeight = (baseSize / aspect) * scaleFactor;

      ctx.translate(finalX, finalY);
      ctx.rotate(rotation);

      // Sombra volumétrica projetada sob o elemento
      ctx.save();
      ctx.translate(0, drawHeight * 0.45);
      ctx.scale(1, 0.28);
      const shadowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, drawWidth * 0.4);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.globalAlpha = Math.min(metrics.visibility * 0.8, 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, drawWidth * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Desenho do elemento 3D
      ctx.globalAlpha = Math.min(Math.max(metrics.visibility * 1.2, 0), 1);
      ctx.drawImage(
        elementImg,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();
    });
  }

  /**
   * Desenha imagem com redimensionamento proporcional do tipo 'cover'.
   */
  drawCoverImage(ctx, img, offsetX, offsetY, targetWidth, targetHeight) {
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const imgAspect = imgWidth / imgHeight;
    const targetAspect = targetWidth / targetHeight;

    let renderWidth, renderHeight, renderX, renderY;

    if (imgAspect > targetAspect) {
      renderHeight = targetHeight;
      renderWidth = targetHeight * imgAspect;
      renderX = (targetWidth - renderWidth) / 2 + offsetX;
      renderY = offsetY;
    } else {
      renderWidth = targetWidth;
      renderHeight = targetWidth / imgAspect;
      renderX = offsetX;
      renderY = (targetHeight - renderHeight) / 2 + offsetY;
    }

    ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
  }

  /**
   * Vinheta nas bordas para reforçar o contraste e estética cinematográfica.
   */
  renderVignette(ctx, w, h) {
    ctx.save();
    const radius = Math.max(w, h) * 0.75;
    const vignette = ctx.createRadialGradient(w / 2, h / 2, radius * 0.4, w / 2, h / 2, radius);
    vignette.addColorStop(0, 'rgba(8, 11, 18, 0)');
    vignette.addColorStop(0.7, 'rgba(8, 11, 18, 0.35)');
    vignette.addColorStop(1, 'rgba(8, 11, 18, 0.85)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
