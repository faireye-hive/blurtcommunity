// now main.js

import { CONFIG } from "./config.js";
import { createPostItem, convertMarkdownToHtml } from "./utils.js";
import { rpcCall } from "./api.js";
import {
  renderMembers,
  renderCommunityInfo,
  resetModalContent,
  updateModalContent,
  displayModalError,
  toggleTabVisibility,
  displayCommunityError,
} from "./render.js";

// Desestrutura as constantes (agora incluindo PAGE_SIZE e CACHE_TTL)
const {
  COMMUNITY_NAME,
  POSTS_LIMIT,
  CACHE_KEYS,
  SECONDARY_TAGS,
  CACHE_TTL,
  PAGE_SIZE,
} = CONFIG;

// *** VARIÁVEIS GLOBAIS PARA CONTROLE DE ESTADO ***
const state = {
  allCommunityMembers: [],
  allPostsCache: [],
  currentPostOffset: 0,
  isLoading: false,
  searchTimeout: null,
};

async function loadPostInModal(author, permlink) {
  // 1. Chama a função de reset do render.js
  resetModalContent();

  try {
    // 2. Lógica de busca da API (permanece aqui)
    const postData = await rpcCall("bridge.get_post", {
      author: author,
      permlink: permlink,
    });

    if (!postData) {
      displayModalError("Postagem não encontrada.");
      return;
    }

    // 3. Transforma o Markdown (permanece aqui ou em utils.js)
    const htmlContent = convertMarkdownToHtml(postData.body);

    // 4. Chama a função de atualização do render.js
    updateModalContent(postData, htmlContent);
  } catch (error) {
    console.error("Erro ao carregar o post no modal:", error);
    // 5. Chama a função de erro do render.js
    displayModalError(error.message);
  }
}

// Helper para verificar expiração de cache
const isCacheExpired = (cacheString, key) => {
  if (!cacheString) return true;

  const cachedObject = JSON.parse(cacheString);
  if (Date.now() < cachedObject.timestamp) {
    return false;
  } else {
    localStorage.removeItem(key);
    return true;
  }
};

// *** FUNÇÕES DE MEMBROS (Inclui Tratamento de Erro e Debouncing) ***

async function loadCommunity() {
  const communityCacheString = localStorage.getItem(CACHE_KEYS.COMMUNITY_INFO);
  const membersCacheString = localStorage.getItem(CACHE_KEYS.MEMBER_LIST);

  let data = null;
  let member = null;

  try {
    // *** TRATAMENTO DE ERROS INICIADO ***
    // ... (lógica de cache - inalterada)
    if (communityCacheString && membersCacheString) {
      const communityExpired = isCacheExpired(
        communityCacheString,
        CACHE_KEYS.COMMUNITY_INFO
      );
      const membersExpired = isCacheExpired(
        membersCacheString,
        CACHE_KEYS.MEMBER_LIST
      );

      if (!communityExpired && !membersExpired) {
        data = JSON.parse(communityCacheString).data;
        member = JSON.parse(membersCacheString).data;
      } else {
        localStorage.removeItem(CACHE_KEYS.COMMUNITY_INFO);
        localStorage.removeItem(CACHE_KEYS.MEMBER_LIST);
      }
    }

    if (!data) {
      const dataPromise = rpcCall("bridge.get_community", {
        name: COMMUNITY_NAME,
      });
      const memberPromise = rpcCall("bridge.list_subscribers", {
        community: COMMUNITY_NAME,
        limit: POSTS_LIMIT,
      });

      [data, member] = await Promise.all([dataPromise, memberPromise]);

      if (data && member) {
        const expirationTime = Date.now() + CACHE_TTL;
        localStorage.setItem(
          CACHE_KEYS.COMMUNITY_INFO,
          JSON.stringify({ data: data, timestamp: expirationTime })
        );
        localStorage.setItem(
          CACHE_KEYS.MEMBER_LIST,
          JSON.stringify({ data: member, timestamp: expirationTime })
        );
      }
    }

    if (!data) return;

    // 3. Renderiza a informação da comunidade
    renderCommunityInfo(data);

    // 4. Renderiza a lista de membros
    if (member) {
      state.allCommunityMembers = member;
      renderMembers(state.allCommunityMembers);
    }
  } catch (error) {
    // *** TRATAMENTO DE ERROS FINALIZADO ***
    console.error("Erro ao carregar dados da Comunidade:", error);
    displayCommunityError("Não foi possível carregar os dados da API.");
  }
}

// *** NOVO: Função de Busca com Debouncing ***
function handleMemberSearch() {
  clearTimeout(state.searchTimeout); // Limpa o timer anterior

  // Novo timer: só executa a função se o usuário parar de digitar por 300ms
  state.searchTimeout = setTimeout(() => {
    const searchTerm = document
      .getElementById("member-search")
      .value.toLowerCase();
    const filteredMembers = state.allCommunityMembers.filter((u) =>
      u[0].toLowerCase().includes(searchTerm)
    );
    renderMembers(filteredMembers);
  }, 300);
}

// *** LÓGICA DE POSTS E INFINITE SCROLL ***

// Funções loadNextBatch e handleInfiniteScroll (inalteradas - já estavam ok)

function loadNextBatch() {
  if (
    state.isLoading ||
    state.currentPostOffset >= state.allPostsCache.length
  ) {
    return;
  }

  const postsTab = document.getElementById("posts");
  if (!postsTab.classList.contains("active")) {
    return;
  }

  state.isLoading = true;
  const loadingIndicator = document.getElementById("infinite-scroll-loading");
  loadingIndicator.style.display = "block";

  const list = document.getElementById("posts-list");
  const nextBatch = state.allPostsCache.slice(
    state.currentPostOffset,
    state.currentPostOffset + PAGE_SIZE
  );

  nextBatch.forEach((post) => list.appendChild(createPostItem(post)));

  state.currentPostOffset += PAGE_SIZE;

  state.isLoading = false;
  loadingIndicator.style.display = "none";

  if (state.currentPostOffset >= state.allPostsCache.length) {
    window.removeEventListener("scroll", handleInfiniteScroll);
  }
}

function handleInfiniteScroll() {
  const postsTab = document.getElementById("posts");
  if (!postsTab || !postsTab.classList.contains("active")) {
    return;
  }

  const threshold = 500;
  const nearBottom =
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - threshold;

  if (nearBottom) {
    loadNextBatch();
  }
}

async function loadPostsByTag(tag, containerId) {
  const list = document.getElementById(containerId);
  let allPosts = [];
  const postsCacheString = localStorage.getItem(CACHE_KEYS.ALL_POSTS);

  // 1. UX: ESTADO DE CARREGAMENTO INICIAL
  const isMainTagAndNoCache = tag === COMMUNITY_NAME && !postsCacheString;
  if (isMainTagAndNoCache) {
    list.innerHTML = `<div class="text-center p-4 text-muted" id="loading-spinner"><i class="bi bi-arrow-clockwise h4 spin"></i> Loading posts...</div>`;
  }

  try {
    // *** TRATAMENTO DE ERROS INICIADO ***
    // 1. Tenta carregar as postagens do localStorage (com cache aging)
    if (postsCacheString) {
      const cachedObject = JSON.parse(postsCacheString);

      if (Date.now() < cachedObject.timestamp) {
        allPosts = cachedObject.data;
      } else {
        localStorage.removeItem(CACHE_KEYS.ALL_POSTS);
      }
    }

    // 2. Se não houver no localStorage, chama a API (apenas para a tag principal)
    if (allPosts.length === 0 && tag === COMMUNITY_NAME) {
      allPosts = await rpcCall("bridge.get_ranked_posts", {
        sort: "created",
        tag: COMMUNITY_NAME,
        limit: POSTS_LIMIT,
      });

      if (allPosts && allPosts.length > 0) {
        const expirationTime = Date.now() + CACHE_TTL;
        localStorage.setItem(
          CACHE_KEYS.ALL_POSTS,
          JSON.stringify({ data: allPosts, timestamp: expirationTime })
        );
      }
    }

    // Armazena o cache completo para paginação e filtros secundários
    if (allPosts.length > 0) {
      state.allPostsCache = allPosts;
    }

    // 3. Renderiza/Filtra
    list.innerHTML = "";
    let postsToDisplay = [];

    if (tag === COMMUNITY_NAME) {
      // LÓGICA DE PAGINAÇÃO PARA A ABA PRINCIPAL

      state.currentPostOffset = 0;
      postsToDisplay = state.allPostsCache.slice(0, PAGE_SIZE);
      state.currentPostOffset = PAGE_SIZE;

      postsToDisplay.forEach((post) => list.appendChild(createPostItem(post)));

      document.getElementById("infinite-scroll-loading").style.display = "none";
    } else {
      // LÓGICA DE FILTRO PARA ABAS SECUNDÁRIAS

      postsToDisplay = state.allPostsCache.filter((post) =>
        post.json_metadata?.tags?.includes(tag)
      );

      if (postsToDisplay.length === 0) {
        let tagName =
          tag === COMMUNITY_NAME ? "Posts" : `Posts com a tag "${tag}"`;
        list.innerHTML = `<div class="p-4 text-muted text-center">Nenhum ${tagName.toLowerCase()} encontrado.</div>`;
      } else {
        postsToDisplay.forEach((post) =>
          list.appendChild(createPostItem(post))
        );
      }
    }
  } catch (error) {
    // *** TRATAMENTO DE ERROS FINALIZADO ***
    console.error("Erro ao carregar posts:", error);
    // Exibe a mensagem de erro no container principal
    list.innerHTML = `
            <div class="alert alert-danger text-center">
                Não foi possível carregar os posts. Verifique a conexão com a API.
            </div>
        `;
    // Oculta o spinner se estiver visível
    document.getElementById("infinite-scroll-loading").style.display = "none";
  }
}

// Função handleUrlChange (inalterada - já estava ok com Deep Linking)
function handleUrlChange() {
  let hash = window.location.hash || "#posts";
  const tabId = hash.substring(1);

  const targetTabPane = document.getElementById(tabId);
  if (!targetTabPane) {
    hash = "#posts";
    window.location.hash = hash;
    return;
  }

  // 1. Chama a função de renderização de abas
  toggleTabVisibility(hash, tabId);

  // 2. Lógica de carregamento de dados (permanece aqui)
  if (tabId !== "posts") {
    const tag = SECONDARY_TAGS[tabId];
    const containerId = tabId + "-list";

    const list = document.getElementById(containerId);
    if (list.children.length === 0 || list.innerHTML.includes("Nenhum")) {
      loadPostsByTag(tag, containerId);
    }
  }
}

// *** BLOCO DE EXECUÇÃO FINAL (Inicialização) ***
(async () => {
  // ... (carregamento inicial de comunidade e posts - INALTERADO) ...
  await loadCommunity();
  await loadPostsByTag(COMMUNITY_NAME, "posts-list");
  handleUrlChange();

  document
    .getElementById("member-search")
    .addEventListener("keyup", handleMemberSearch);
  window.addEventListener("hashchange", handleUrlChange);
  window.addEventListener("scroll", handleInfiniteScroll);

  document.addEventListener("click", (event) => {
    // Busca o elemento que foi clicado (ou seu ancestral mais próximo)
    // que tenha o atributo 'data-permlink' (ou seja, um item de postagem).
    const postItem = event.target.closest("[data-permlink]");

    if (postItem) {
      event.preventDefault(); // Impede a navegação do <a>

      const author = postItem.getAttribute("data-author");
      const permlink = postItem.getAttribute("data-permlink");

      // 1. Carrega o conteúdo no modal (usando sua função refatorada)
      loadPostInModal(author, permlink);

      // 2. Abre o modal programaticamente usando o JS do Bootstrap 5
      const modal = new bootstrap.Modal(document.getElementById("postModal"));
      modal.show();
    }
  });

  
})();
