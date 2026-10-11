/**
 * @file js/ui.js
 * @description Gerenciamento de interface DOM, barra de progresso ultrafina, renderização de cards,
 * navegação lateral por dots e transições de visibilidade.
 * Zero external dependencies.
 */

export class UIManager {
  constructor(parallaxController, projectData) {
    this.parallax = parallaxController;
    this.projectData = projectData;

    this.progressBar = document.getElementById('scroll-progress');
    this.navDotsContainer = document.getElementById('nav-dots');
    this.scenesContainer = document.getElementById('scenes-container');
    this.projectsContainer = document.getElementById('projects-container');

    this.dotElements = [];
    this.cardElements = [];
    this.activeSectionIndex = 0;
  }

  /**
   * Constrói e injeta a estrutura dinâmica de projetos e navegação no DOM.
   */
  initDOM() {
    this.renderHero();
    this.renderProjects();
    this.renderClosingSection();
    this.renderNavDots();

    // Registra todas as cenas no controlador de parallax
    const allScenes = document.querySelectorAll('.scene');
    this.parallax.registerSections(allScenes);

    // Mapeia os cards para efeitos de transição
    this.cardElements = document.querySelectorAll('.project-card, .hero-content, .closing-container');

    // Mapeia os elementos do palco visual do Hero para o parallax multicamadas
    this.heroLogoLayer = document.getElementById('hero-logo-layer');
    this.heroAvatarLayer = document.getElementById('hero-avatar-layer');
    this.heroGlowAura = document.querySelector('.hero-glow-aura');
    this.heroContainer = document.querySelector('.hero-container');
    this.heroContent = document.querySelector('.hero-content');
    this.heroVisual = document.getElementById('hero-visual-stage') || document.querySelector('.hero-visual');

    // Posiciona as imagens dentro do painel no mobile (logo abaixo do autor) ou ao lado no desktop
    this.adjustHeroLayout = this.adjustHeroLayout.bind(this);
    this.adjustHeroLayout();
    window.addEventListener('resize', this.adjustHeroLayout);
  }

  /**
   * Adapta o posicionamento do visual do Hero:
   * Em telas compactas e intermediárias (<= 1024px), fica DENTRO do painel de conteúdo logo abaixo de "Criado por Gustavo Guanabara".
   * Em telas widescreen (> 1024px), fica como coluna adjacente ao lado do painel de conteúdo.
   */
  adjustHeroLayout() {
    if (!this.heroVisual || !this.heroContent || !this.heroContainer) return;
    const isSingleColumn = window.innerWidth <= 1024;

    if (isSingleColumn) {
      if (this.heroVisual.parentElement !== this.heroContent) {
        this.heroContent.appendChild(this.heroVisual);
      }
    } else {
      if (this.heroVisual.parentElement !== this.heroContainer) {
        this.heroContainer.appendChild(this.heroVisual);
      }
    }
  }

  /**
   * Renderiza os dados editoriais e visuais da seção Hero a partir de data/projects.json
   */
  renderHero() {
    const heroData = this.projectData.hero || {};
    const author = this.projectData.author || {};

    // 1. Badge do Hero
    const badgeEl = document.querySelector('.hero-badge');
    if (badgeEl) {
      const badgeText = heroData.badge || 'PORTFÓLIO VIBECODING // 2026';
      badgeEl.innerHTML = `<span class="hero-badge-pulse"></span>${badgeText}`;
    }

    // 2. Título do Hero com formatação inteligente para GuIA / IA
    const titleEl = document.querySelector('.hero-title');
    if (titleEl) {
      const rawTitle = heroData.title || 'GuIA do Desenvolvedor Moderno';
      titleEl.innerHTML = this.formatHeroTitle(rawTitle);
      const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').trim();
      titleEl.setAttribute('aria-label', cleanTitle);

      // Sincroniza o título da página (preserva o title do HTML ou adota pageTitle declarativo)
      if (this.projectData.pageTitle || heroData.pageTitle) {
        document.title = this.projectData.pageTitle || heroData.pageTitle;
      }

      // Sincroniza meta tags
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && heroData.subtitle) {
        metaDesc.setAttribute('content', `${cleanTitle}: ${heroData.subtitle}`);
      }
      const metaAuthor = document.querySelector('meta[name="author"]');
      if (metaAuthor && author.name) {
        metaAuthor.setAttribute('content', author.name);
      }
    }

    // 3. Subtítulo do Hero
    const subtitleEl = document.querySelector('.hero-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = heroData.subtitle || 'Projetos reais, feitos 100% com vibe coding sensato e muita criatividade para os iniciantes em Tecnologia';
    }

    // 4. Tag de Autoria (rolagem suave até o último painel de contatos)
    const authorTagEl = document.querySelector('.hero-author-tag');
    if (authorTagEl) {
      authorTagEl.innerHTML = this.formatAuthorTag(heroData.authorTag, author.name);
      authorTagEl.setAttribute('role', 'button');
      authorTagEl.setAttribute('tabindex', '0');
      authorTagEl.setAttribute('aria-label', 'Navegar até a seção de contatos e redes sociais de Gustavo Guanabara');
      authorTagEl.title = 'Clique para rolar até os links de contato';

      if (this._onAuthorTagClick) {
        authorTagEl.removeEventListener('click', this._onAuthorTagClick);
        authorTagEl.removeEventListener('keydown', this._onAuthorTagKeydown);
      }

      this._onAuthorTagClick = (e) => {
        e.preventDefault();
        const closingIndex = this.projectData.projects.length + 1;
        this.parallax.scrollToSection(closingIndex);
      };

      this._onAuthorTagKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const closingIndex = this.projectData.projects.length + 1;
          this.parallax.scrollToSection(closingIndex);
        }
      };

      authorTagEl.addEventListener('click', this._onAuthorTagClick);
      authorTagEl.addEventListener('keydown', this._onAuthorTagKeydown);
    }

    // 5. Imagens do Palco Visual
    this.renderHeroImages();
  }

  /**
   * Formata o título do Hero para destacar "IA" com gradiente cibernético
   */
  formatHeroTitle(title) {
    if (!title) return '';
    if (title.includes('highlight-ai')) {
      return title;
    }
    if (title.includes('GuIA')) {
      return title.replace(/GuIA/g, 'Gu<span class="highlight-ai">IA</span>');
    }
    if (/guia/i.test(title)) {
      return title.replace(/guia/i, (match) => {
        const prefix = match.slice(0, 2);
        const aiSuffix = match.slice(2);
        return `${prefix}<span class="highlight-ai">${aiSuffix}</span>`;
      });
    }
    if (/\bIA\b/.test(title)) {
      return title.replace(/\bIA\b/g, '<span class="highlight-ai">IA</span>');
    }
    return title;
  }

  /**
   * Formata a tag de autoria com ênfase no nome do autor
   */
  formatAuthorTag(authorTag, authorName) {
    const defaultName = authorName || 'Gustavo Guanabara';
    const text = authorTag || `Criado por ${defaultName}`;
    if (text.includes('<strong>')) {
      return `<span>${text}</span>`;
    }
    if (authorName && text.includes(authorName)) {
      return `<span>${text.replace(authorName, `<strong>${authorName}</strong>`)}</span>`;
    }
    return `<span>${text}</span>`;
  }

  /**
   * Atualiza as imagens e atributos das camadas do Hero
   */
  renderHeroImages() {
    const heroData = this.projectData.hero || {};
    const author = this.projectData.author || {};

    const logoSrc = heroData.logoImage || author.logo || 'images/logo-gafanhoto.png';
    const avatarSrc = heroData.avatarImage || author.avatar || 'images/guanabara-gafanhoto.png';

    const logoImg = document.querySelector('.hero-logo-img');
    if (logoImg) {
      logoImg.src = logoSrc;
      logoImg.alt = heroData.logoAlt || 'Logo Gafanhoto';
    }

    const avatarImg = document.querySelector('.hero-avatar-img');
    if (avatarImg) {
      avatarImg.src = avatarSrc;
      avatarImg.alt = heroData.avatarAlt || `${author.name || 'Gustavo Guanabara'} com Capuz Gafanhoto`;
    }
  }

  /**
   * Renderiza os cards dos projetos a partir dos dados do JSON.
   */
  renderProjects() {
    if (!this.projectsContainer) return;
    this.projectsContainer.innerHTML = '';

    const projects = this.projectData.projects;

    projects.forEach((proj, index) => {
      const section = document.createElement('section');
      section.className = 'scene project-scene';
      section.id = `scene-${proj.id}`;
      section.dataset.index = (index + 1).toString();

      // Card semântico do projeto
      const card = document.createElement('div');
      card.className = 'project-card';
      card.dataset.projectIndex = index.toString();

      const badge = document.createElement('span');
      badge.className = 'project-badge';
      badge.textContent = proj.badge || `PROJETO 0${index + 1}`;

      const title = document.createElement('h2');
      title.className = 'project-title';
      title.textContent = proj.title;

      const desc = document.createElement('p');
      desc.className = 'project-description';
      desc.textContent = proj.description;

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      if (proj.projectUrl) {
        const btn = document.createElement('a');
        btn.href = proj.projectUrl;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.className = 'btn-cta';
        btn.innerHTML = `
          <span>${proj.buttonLabel || 'Acessar Projeto'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        `;
        actions.appendChild(btn);
      }

      card.appendChild(badge);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(actions);

      section.appendChild(card);
      this.projectsContainer.appendChild(section);
    });
  }

  /**
   * Renderiza a seção final de encerramento e contatos (RN-009 / RN-010).
   */
  renderClosingSection() {
    const existingClosing = document.getElementById('scene-closing');
    if (existingClosing) {
      existingClosing.remove();
    }

    const author = this.projectData.author || {};
    const closingData = this.projectData.closing || {};
    const closingSection = document.createElement('section');
    closingSection.className = 'scene closing-scene';
    closingSection.id = 'scene-closing';
    closingSection.dataset.index = (this.projectData.projects.length + 1).toString();

    const container = document.createElement('div');
    container.className = 'closing-container';

    // 1. Emblema solto com a logo (se configurada e não desativada explicitamente)
    const logoSrc = closingData.logo !== undefined ? closingData.logo : (author.logo || 'images/logo-gafanhoto.png');
    if (logoSrc) {
      const emblemWrapper = document.createElement('div');
      emblemWrapper.className = 'closing-brand-emblem';

      const logoImg = document.createElement('img');
      logoImg.src = logoSrc;
      logoImg.alt = closingData.logoAlt || 'Logo Gafanhoto';
      logoImg.className = 'closing-logo-img';
      emblemWrapper.appendChild(logoImg);
      container.appendChild(emblemWrapper);
    }

    // 2. Badge opcional caso definido no JSON
    if (closingData.badge) {
      const badge = document.createElement('div');
      badge.className = 'hero-badge';
      badge.style.margin = '0 auto 1.5rem auto';
      badge.innerHTML = `<span class="hero-badge-pulse"></span>${closingData.badge}`;
      container.appendChild(badge);
    }

    // 3. Título de encerramento
    const title = document.createElement('h2');
    title.className = 'closing-title';
    title.textContent = closingData.title || 'Construindo a proxima geração Dev';
    container.appendChild(title);

    // 4. Subtítulo / bio institucional
    const bio = document.createElement('p');
    bio.className = 'closing-bio';
    bio.textContent = closingData.subtitle || author.bio || 'Acompanhe o nosso trabalho para ficar sempre atualizado com as novidades. Os projetos apresentados aqui serão construídos do zero, usando nossa técnica.';
    container.appendChild(bio);

    // 5. Grid de redes sociais (suporta closingData.socialLinks ou author.socialLinks)
    const socialLinks = closingData.socialLinks || author.socialLinks || [];
    if (Array.isArray(socialLinks) && socialLinks.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'social-links-grid';

      socialLinks.forEach((link) => {
        const card = document.createElement('a');
        card.href = link.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'social-card';

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'social-icon-wrapper';
        iconWrapper.innerHTML = this.getSocialSvgIcon(link.icon);

        const infoWrapper = document.createElement('div');
        const platformName = document.createElement('div');
        platformName.className = 'social-info-platform';
        platformName.textContent = link.platform;

        const descText = document.createElement('div');
        descText.className = 'social-info-desc';
        descText.textContent = link.description || 'Conectar agora';

        infoWrapper.appendChild(platformName);
        infoWrapper.appendChild(descText);

        card.appendChild(iconWrapper);
        card.appendChild(infoWrapper);
        grid.appendChild(card);
      });

      container.appendChild(grid);
    }

    // 6. Rodapé configurável via closing.footer ou closing.footerText com versão e link de teste
    const footerText = document.createElement('div');
    footerText.className = 'closing-footer';
    const authorName = author.name || 'Gustavo Guanabara';
    const appVersion = this.projectData.version || '1.0.9';
    const testLinkHtml = `<a href="test.html" class="test-health-link" title="Diagnóstico & Testes do Ambiente" aria-label="Ambiente de Testes">🧪</a>`;
    let finalFooter = closingData.footer || closingData.footerText || `&copy; 2026 ${authorName} &bull; Projetos Vibecoding v${appVersion}`;
    if (!finalFooter.includes('test.html') && !finalFooter.includes('🧪')) {
      finalFooter = `${finalFooter} ${testLinkHtml}`;
    }
    footerText.innerHTML = finalFooter;
    container.appendChild(footerText);

    closingSection.appendChild(container);
    this.scenesContainer.appendChild(closingSection);
  }

  /**
   * Constrói os indicadores de navegação lateral (dots).
   */
  renderNavDots() {
    if (!this.navDotsContainer) return;
    this.navDotsContainer.innerHTML = '';
    this.dotElements = [];

    const heroLabel = this.projectData.hero?.navLabel || 'Início';
    const closingLabel = this.projectData.closing?.navLabel || 'Contatos';

    const sectionsData = [
      { name: heroLabel, index: 0 },
      ...this.projectData.projects.map((p, idx) => ({ name: p.title, index: idx + 1 })),
      { name: closingLabel, index: this.projectData.projects.length + 1 }
    ];

    sectionsData.forEach((sec) => {
      const button = document.createElement('button');
      button.className = 'nav-dot';
      button.dataset.index = sec.index.toString();
      button.setAttribute('aria-label', `Navegar para seção ${sec.name}`);

      const tooltip = document.createElement('span');
      tooltip.className = 'nav-dot-tooltip';
      tooltip.textContent = sec.name;

      button.appendChild(tooltip);

      button.addEventListener('click', () => {
        this.parallax.scrollToSection(sec.index);
      });

      this.navDotsContainer.appendChild(button);
      this.dotElements.push(button);
    });

    if (this.dotElements.length > 0) {
      this.dotElements[0].classList.add('is-active');
    }
  }

  /**
   * Atualização contínua por frame
   * @param {number} [time] - Timestamp de alta precisão em milissegundos
   */
  update(time = performance.now()) {
    // 1. Atualizar Barra de Progresso Ultrafina (GPU scaleX)
    if (this.progressBar) {
      this.progressBar.style.transform = `scaleX(${this.parallax.globalProgress})`;
    }

    // 2. Determinar a seção mais ativa e atualizar os dots de navegação
    let closestIndex = 0;
    let minDistance = Infinity;

    this.parallax.sectionElements.forEach((_, idx) => {
      const metrics = this.parallax.getSectionMetrics(idx);
      const absDist = Math.abs(metrics.distanceRatio);
      if (absDist < minDistance) {
        minDistance = absDist;
        closestIndex = idx;
      }
    });

    if (closestIndex !== this.activeSectionIndex) {
      this.activeSectionIndex = closestIndex;
      this.dotElements.forEach((dot, idx) => {
        if (idx === closestIndex) {
          dot.classList.add('is-active');
        } else {
          dot.classList.remove('is-active');
        }
      });
    }

    // 3. Suavização de visibilidade e transform dos cards HTML
    const isSingleColumn = window.innerWidth <= 1024;
    this.parallax.sectionElements.forEach((section, idx) => {
      const card = section.querySelector('.project-card, .hero-content, .closing-container');
      if (!card) return;

      const metrics = this.parallax.getSectionMetrics(idx);
      if (metrics.inView) {
        let opacity;
        if (idx === 0) {
          // O painel Hero permanece 100% visível e sólido durante a visualização inicial
          // Só inicia o fade out após o usuário rolar além de 15% da altura da viewport
          const heroScrollOffset = Math.max(0, this.parallax.currentScroll - (window.innerHeight * 0.15));
          const heroExitProgress = Math.min(Math.max(heroScrollOffset / (window.innerHeight * 0.75), 0), 1);
          opacity = Math.max(0, 1 - heroExitProgress * 1.2);
        } else {
          opacity = Math.min(Math.max((metrics.visibility - 0.1) / 0.9, 0), 1);
        }
        const translateY = metrics.distanceRatio * (isSingleColumn ? 14 : 35);
        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `translateY(${translateY.toFixed(1)}px)`;
      } else {
        card.style.opacity = '0';
      }
    });

    // 4. Parallax multicamada do Hero (Guanabara em primeiro plano + Logo Gafanhoto atrás dele)
    if (this.heroLogoLayer || this.heroAvatarLayer) {
      const heroMetrics = this.parallax.getSectionMetrics(0);

      if (heroMetrics.inView) {
        const mouseX = this.parallax.currentMouseX;
        const mouseY = this.parallax.currentMouseY;
        const heroScrollOffset = Math.max(0, this.parallax.currentScroll - (window.innerHeight * 0.15));
        const heroExitProgress = Math.min(Math.max(heroScrollOffset / (window.innerHeight * 0.75), 0), 1);
        const heroLayerAlpha = Math.max(0, 1 - heroExitProgress * 1.2);

        // Camada Traseira: Logo Gafanhoto (Movimento Parallax de fundo com profundidade Z acentuada)
        if (this.heroLogoLayer) {
          const logoParallaxY = heroMetrics.distanceRatio * (isSingleColumn ? 65 : 140);
          const logoMouseX = mouseX * (isSingleColumn ? -10 : -18);
          const logoMouseY = mouseY * (isSingleColumn ? -7 : -12);
          const logoRot = (heroMetrics.distanceRatio * (isSingleColumn ? 3 : 6)) + (mouseX * -2);
          const logoScale = 1 + Math.sin(time * 0.0018) * 0.02;

          this.heroLogoLayer.style.transform = `translate3d(calc(-50% + ${logoMouseX.toFixed(1)}px), calc(-50% + ${(logoParallaxY + logoMouseY).toFixed(1)}px), 0) rotate(${logoRot.toFixed(2)}deg) scale(${logoScale.toFixed(3)})`;
          this.heroLogoLayer.style.opacity = heroLayerAlpha.toFixed(3);
        }

        // Camada Frontal: Foto Gustavo Guanabara (Movimento Parallax mais sutil + levitação senoidal)
        if (this.heroAvatarLayer) {
          const avatarParallaxY = heroMetrics.distanceRatio * (isSingleColumn ? 30 : 60);
          const levitation = Math.sin(time * 0.0022) * (isSingleColumn ? 5 : 9);
          const avatarMouseX = mouseX * (isSingleColumn ? 8 : 16);
          const avatarMouseY = mouseY * (isSingleColumn ? 6 : 12);

          this.heroAvatarLayer.style.transform = `translate3d(${avatarMouseX.toFixed(1)}px, ${(avatarParallaxY + levitation + avatarMouseY).toFixed(1)}px, 0)`;
          this.heroAvatarLayer.style.opacity = heroLayerAlpha.toFixed(3);
        }

        // Aura de Brilho / Glow atmosférico
        if (this.heroGlowAura) {
          const glowPulse = 0.65 + Math.sin(time * 0.002) * 0.2;
          const glowParallaxY = heroMetrics.distanceRatio * (isSingleColumn ? 45 : 90);
          this.heroGlowAura.style.transform = `translate3d(${(mouseX * (isSingleColumn ? -4 : -8)).toFixed(1)}px, ${(glowParallaxY + mouseY * (isSingleColumn ? -3 : -6)).toFixed(1)}px, 0) scale(${glowPulse.toFixed(2)})`;
          this.heroGlowAura.style.opacity = Math.max(0, (heroLayerAlpha * glowPulse)).toFixed(3);
        }
      } else {
        if (this.heroLogoLayer) this.heroLogoLayer.style.opacity = '0';
        if (this.heroAvatarLayer) this.heroAvatarLayer.style.opacity = '0';
        if (this.heroGlowAura) this.heroGlowAura.style.opacity = '0';
      }
    }
  }

  /**
   * Retorna os SVGs de alta definição para os ícones sociais
   */
  getSocialSvgIcon(iconName) {
    switch (iconName) {
      case 'github':
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        `;
      case 'youtube':
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        `;
      case 'instagram':
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        `;
      case 'linkedin':
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.762-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        `;
      case 'outros':
      case 'links':
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        `;
      default:
        return `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        `;
    }
  }
}
