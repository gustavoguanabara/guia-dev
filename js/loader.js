/**
 * @file js/loader.js
 * @description Leitor assíncrono do catálogo de dados JSON e preloader resiliente de imagens.
 * Zero external dependencies — HTML5 / ES6 Modules nativo.
 */

/**
 * Carrega e valida os dados do catálogo centralizado de projetos.
 * @param {string} url - Caminho relativo do JSON de dados.
 * @returns {Promise<{author: Object, projects: Array}>}
 */
export async function loadProjectData(url = 'data/projects.json') {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha na requisição de dados: HTTP ${response.status}`);
    }
    const data = await response.json();

    if (!data || !Array.isArray(data.projects)) {
      throw new Error('Formato inválido de projects.json: a propriedade projects deve ser uma lista.');
    }

    return data;
  } catch (error) {
    console.error('[Loader] Erro ao carregar catálogo de dados:', error);
    throw error;
  }
}

/**
 * Pré-carrega uma imagem individualmente, retornando uma Promise com o objeto HTMLImageElement.
 * Em caso de erro, resolve com null sem interromper o fluxo global (resiliência visual).
 * @param {string} src - Caminho da imagem.
 * @returns {Promise<HTMLImageElement|null>}
 */
function preloadSingleImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[Loader] Imagem não encontrada ou indisponível: ${src}. Usando fallback procedural.`);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Pré-carrega todos os ativos de imagem dos projetos concorrentemente com relatório de progresso.
 * @param {Array} projects - Lista de projetos do catálogo.
 * @param {Function} [onProgress] - Callback chamado a cada imagem carregada com (percentual, carregadas, total).
 * @param {Array<string>} [additionalImages] - Lista de URLs de imagens extras a pré-carregar.
 * @returns {Promise<Map<string, HTMLImageElement>>} - Mapa chaveado pelo caminho da imagem.
 */
export async function preloadAllProjectImages(projects, onProgress = null, additionalImages = []) {
  const imageMap = new Map();
  const urlsToLoad = [];

  // Inclui imagens adicionais fornecidas (como as do Hero)
  if (Array.isArray(additionalImages)) {
    additionalImages.forEach((imgUrl) => {
      if (imgUrl && !urlsToLoad.includes(imgUrl)) {
        urlsToLoad.push(imgUrl);
      }
    });
  }

  projects.forEach((proj) => {
    if (proj.element3D && !urlsToLoad.includes(proj.element3D)) {
      urlsToLoad.push(proj.element3D);
    }
    if (proj.backgroundImage && !urlsToLoad.includes(proj.backgroundImage)) {
      urlsToLoad.push(proj.backgroundImage);
    }
  });

  const total = urlsToLoad.length;
  let loadedCount = 0;

  if (total === 0) {
    if (onProgress) onProgress(100, 0, 0);
    return imageMap;
  }

  const loadPromises = urlsToLoad.map(async (src) => {
    const imgElement = await preloadSingleImage(src);
    if (imgElement) {
      imageMap.set(src, imgElement);
    }
    loadedCount += 1;
    if (onProgress) {
      const percentage = Math.round((loadedCount / total) * 100);
      onProgress(percentage, loadedCount, total);
    }
    return { src, imgElement };
  });

  await Promise.all(loadPromises);
  return imageMap;
}
