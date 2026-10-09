/**
 * @file js/main.js
 * @description Ponto de entrada (Bootstrap) do Portfólio Parallax Imersivo.
 * Orquestra o carregamento de dados, pré-carregamento de ativos, inicialização gráfica e interface.
 * Zero external dependencies.
 */

import { loadProjectData, preloadAllProjectImages } from './loader.js';
import { ParallaxController } from './parallax.js';
import { CanvasEngine } from './engine.js';
import { UIManager } from './ui.js';

class App {
  constructor() {
    this.preloader = document.getElementById('preloader');
    this.progressBarFill = document.querySelector('.preloader-bar-fill');
    this.preloaderText = document.querySelector('.preloader-text');
    this.canvas = document.getElementById('parallax-canvas');

    this.parallax = null;
    this.engine = null;
    this.ui = null;
  }

  async init() {
    try {
      this.updatePreloader(10, 'Carregando catálogo...');

      // 1. Carregar catálogo de dados declarativo
      const projectData = await loadProjectData('data/projects.json');
      this.updatePreloader(25, 'Carregando imagens e cenários...');

      // 2. Pré-carregar todas as imagens dos projetos, Hero e Closing com feedback visual
      const additionalImages = [
        projectData.hero?.avatarImage || projectData.author?.avatar || 'images/guanabara-gafanhoto.png',
        projectData.hero?.logoImage || projectData.author?.logo || 'images/logo-gafanhoto.png',
        projectData.closing?.logo || projectData.author?.logo || 'images/logo-gafanhoto.png'
      ].filter(Boolean);
      const imageMap = await preloadAllProjectImages(projectData.projects, (pct, loaded, total) => {
        const visualPct = 25 + Math.round((pct / 100) * 65); // Mapeia de 25% a 90%
        this.updatePreloader(visualPct, `Carregando ativos (${loaded}/${total})...`);
      }, additionalImages);

      this.updatePreloader(95, 'Inicializando motor 2D...');

      // 3. Inicializar o controlador de física e paralaxe LERP
      this.parallax = new ParallaxController({
        lerpFactor: 0.075,
        mouseLerpFactor: 0.05
      });

      // 4. Inicializar gerenciador de interface e renderizar seções
      this.ui = new UIManager(this.parallax, projectData);
      this.ui.initDOM();

      // 5. Inicializar motor gráfico Canvas 2D
      this.engine = new CanvasEngine(this.canvas, this.parallax, projectData, imageMap);
      this.engine.onFrame = (time) => {
        this.ui.update(time);
      };

      // 6. Concluir preloader e iniciar loop
      this.updatePreloader(100, 'Tudo pronto!');

      setTimeout(() => {
        this.hidePreloader();
        this.engine.start();
        console.log('[App] Portfólio Parallax inicializado com sucesso.');
      }, 350);

    } catch (error) {
      console.error('[App] Erro crítico na inicialização:', error);
      this.showFatalError(error);
    }
  }

  updatePreloader(percentage, text) {
    if (this.progressBarFill) {
      this.progressBarFill.style.width = `${percentage}%`;
    }
    if (this.preloaderText) {
      this.preloaderText.textContent = text;
    }
  }

  hidePreloader() {
    if (this.preloader) {
      this.preloader.classList.add('is-hidden');
    }
  }

  showFatalError(error) {
    if (this.preloader) {
      this.preloader.innerHTML = `
        <div style="text-align: center; color: #ff6b6b; font-family: monospace; padding: 2rem;">
          <h2 style="margin-bottom: 1rem;">Falha ao carregar experiência</h2>
          <p style="color: #9aa5b5; margin-bottom: 1.5rem;">${error.message || 'Verifique sua conexão ou servidor local.'}</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #00f2fe; color: #080b12; border-radius: 8px; font-weight: bold; cursor: pointer;">
            Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

// Inicializa a aplicação assim que o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
} else {
  const app = new App();
  app.init();
}
