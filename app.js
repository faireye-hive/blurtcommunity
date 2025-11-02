// app.js

import { CONFIG } from './config.js'; 
import { createPostItem } from './utils.js'

// Desestrutura as constantes (agora incluindo PAGE_SIZE e CACHE_TTL)
const { RPC_URL, COMMUNITY_NAME, POSTS_LIMIT, CACHE_KEYS, SECONDARY_TAGS, CACHE_TTL, PAGE_SIZE } = CONFIG;

// *** VARIÁVEIS GLOBAIS PARA CONTROLE DE ESTADO ***
let allCommunityMembers = []; 
let allPostsCache = [];       
let currentPostOffset = 0;    
let isLoading = false;        
let searchTimeout;            // *** NOVO: Variável para Debouncing da busca ***

function convertMarkdownToHtml(markdownText) {
    // A função marked.parse() faz o trabalho pesado de conversão de Markdown para HTML.
    // O `marked.js` deve ser carregado no index.html antes deste script.
    return marked.parse(markdownText || '', { sanitize: true }); 
}

async function loadPostInModal(author, permlink) {
    const titleElement = document.getElementById('postModalLabel');
    const contentElement = document.getElementById('modal-post-content');
    const authorElement = document.getElementById('modal-post-author');
    const votesElement = document.getElementById('modal-post-votes');
    const commentsElement = document.getElementById('modal-post-comments');

    // 1. Resetar o conteúdo do modal
    titleElement.textContent = 'Carregando...';
    contentElement.innerHTML = `<div class="text-center p-5 text-muted"><i class="bi bi-arrow-clockwise h4 spin"></i> Carregando conteúdo...</div>`;
    authorElement.textContent = '';
    votesElement.textContent = '0';
    commentsElement.textContent = '0';

    try {
        // 2. Chamar a API para obter o conteúdo completo do post
        // Usaremos bridge.get_post pois é mais simples que getContent
        const postData = await rpcCall('bridge.get_post', { author: author, permlink: permlink });

        if (!postData) {
            contentElement.innerHTML = `<div class="alert alert-warning text-center">Postagem não encontrada.</div>`;
            return;
        }

        // 3. Preencher o modal com os dados
        titleElement.textContent = postData.title;
        authorElement.textContent = `Publicado por @${postData.author}`;
        votesElement.textContent = postData.active_votes.length;
        commentsElement.textContent = postData.children;
        
        // 4. Converter e Injetar o Conteúdo
        const htmlContent = convertMarkdownToHtml(postData.body);
        contentElement.innerHTML = htmlContent;

    } catch (error) {
        console.error("Erro ao carregar o post no modal:", error);
        titleElement.textContent = 'Erro';
        contentElement.innerHTML = `<div class="alert alert-danger text-center">Falha ao carregar o post: ${error.message}</div>`;
    }
}

// Função para chamadas de API (permanece a mesma)
async function rpcCall(method, params = {}, id = 1) {
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id })
    });
    // Se a resposta HTTP não for OK, lança um erro
    if (!res.ok) {
         throw new Error(`RPC Call failed with status: ${res.status}`);
    }
    const json = await res.json();
    
    // Se a resposta JSON contiver um erro, lança um erro
    if (json.error) {
        throw new Error(`RPC Error: ${json.error.message}`);
    }
    
    return json.result;
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
    
    try { // *** TRATAMENTO DE ERROS INICIADO ***
        // ... (lógica de cache - inalterada)
        if (communityCacheString && membersCacheString) {
            const communityExpired = isCacheExpired(communityCacheString, CACHE_KEYS.COMMUNITY_INFO);
            const membersExpired = isCacheExpired(membersCacheString, CACHE_KEYS.MEMBER_LIST);

            if (!communityExpired && !membersExpired) {
                data = JSON.parse(communityCacheString).data;
                member = JSON.parse(membersCacheString).data;
            } else {
                localStorage.removeItem(CACHE_KEYS.COMMUNITY_INFO);
                localStorage.removeItem(CACHE_KEYS.MEMBER_LIST);
            }
        }
        
        if (!data) {
            const dataPromise = rpcCall('bridge.get_community', { name: COMMUNITY_NAME });
            const memberPromise = rpcCall('bridge.list_subscribers', { community: COMMUNITY_NAME, "limit": POSTS_LIMIT });
            
            [data, member] = await Promise.all([dataPromise, memberPromise]);

            if (data && member) {
                const expirationTime = Date.now() + CACHE_TTL;
                localStorage.setItem(CACHE_KEYS.COMMUNITY_INFO, JSON.stringify({ data: data, timestamp: expirationTime }));
                localStorage.setItem(CACHE_KEYS.MEMBER_LIST, JSON.stringify({ data: member, timestamp: expirationTime }));
            }
        }
        
        if (!data) return;

        // Renderiza a informação da comunidade
        document.getElementById('community-name').textContent = data.title || data.name;
        document.getElementById('community-tagline').textContent = data.about || '';
        document.getElementById('community-website').href = data.url || '#';
        document.getElementById('community-website').textContent = data.url || '—';
        document.getElementById('community-desc').textContent = data.description || data.about || '';
        document.getElementById('stat-members').textContent = data.num_authors || '—';
        document.getElementById('stat-posts').textContent = data.num_pending || '—';
        document.getElementById('stat-subs').textContent = data.subscribers || '—';

        // 4. Renderiza a lista de membros
        if (member) {
            allCommunityMembers = member; 
            renderMembers(allCommunityMembers); 
        }

    } catch (error) { // *** TRATAMENTO DE ERROS FINALIZADO ***
        console.error("Erro ao carregar dados da Comunidade:", error);
        document.getElementById('community-name').textContent = 'Erro de Conexão';
        document.getElementById('community-desc').textContent = 'Não foi possível carregar os dados da API.';
    }
}

function renderMembers(memberList) {
    const membersDiv = document.getElementById('members');

    if (memberList.length === 0) {
        membersDiv.innerHTML = `<div class="p-2 text-muted text-center">Nenhum membro encontrado.</div>`;
        return;
    }
    
    membersDiv.innerHTML = memberList.map(u => `
      <div class='d-flex align-items-center mb-2'>
        <img class='member-avatar' src='https://imgp.blurt.world/profileimage/${u[0]}/avatar' alt='${u[0]}'>
        <span>@${u[0]}</span>
      </div>`).join('');
}

// *** NOVO: Função de Busca com Debouncing ***
function handleMemberSearch() {
    clearTimeout(searchTimeout); // Limpa o timer anterior
    
    // Novo timer: só executa a função se o usuário parar de digitar por 300ms
    searchTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('member-search').value.toLowerCase();
        const filteredMembers = allCommunityMembers.filter(u => u[0].toLowerCase().includes(searchTerm));
        renderMembers(filteredMembers);
    }, 300); 
}


// *** LÓGICA DE POSTS E INFINITE SCROLL ***

// Funções loadNextBatch e handleInfiniteScroll (inalteradas - já estavam ok)

function loadNextBatch() {
    if (isLoading || currentPostOffset >= allPostsCache.length) {
        return;
    }

    const postsTab = document.getElementById('posts');
    if (!postsTab.classList.contains('active')) {
        return; 
    }

    isLoading = true;
    const loadingIndicator = document.getElementById('infinite-scroll-loading');
    loadingIndicator.style.display = 'block'; 

    setTimeout(() => {
        const list = document.getElementById('posts-list');
        const nextBatch = allPostsCache.slice(currentPostOffset, currentPostOffset + PAGE_SIZE);
        
        nextBatch.forEach(post => list.appendChild(createPostItem(post)));
        
        currentPostOffset += PAGE_SIZE;
        
        isLoading = false;
        loadingIndicator.style.display = 'none'; 
        
        if (currentPostOffset >= allPostsCache.length) {
            window.removeEventListener('scroll', handleInfiniteScroll);
        }
    }, 500); 
}

function handleInfiniteScroll() {
    const postsTab = document.getElementById('posts');
    if (!postsTab || !postsTab.classList.contains('active')) {
        return; 
    }

    const threshold = 500; 
    const nearBottom = (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - threshold);

    if (nearBottom) {
        loadNextBatch();
    }
}


async function loadPostsByTag(tag, containerId) {

    const list = document.getElementById(containerId);
    let allPosts = [];
    const postsCacheString = localStorage.getItem(CACHE_KEYS.ALL_POSTS);
    
    // 1. UX: ESTADO DE CARREGAMENTO INICIAL
    const isMainTagAndNoCache = (tag === COMMUNITY_NAME && !postsCacheString);
    if (isMainTagAndNoCache) {
        list.innerHTML = `<div class="text-center p-4 text-muted" id="loading-spinner"><i class="bi bi-arrow-clockwise h4 spin"></i> Loading posts...</div>`;
    }
    
    try { // *** TRATAMENTO DE ERROS INICIADO ***
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
            allPosts = await rpcCall('bridge.get_ranked_posts', { sort: 'created', tag: COMMUNITY_NAME, limit: POSTS_LIMIT });
            
            if (allPosts && allPosts.length > 0) {
                const expirationTime = Date.now() + CACHE_TTL;
                localStorage.setItem(CACHE_KEYS.ALL_POSTS, JSON.stringify({ data: allPosts, timestamp: expirationTime }));
            }
        }

        // Armazena o cache completo para paginação e filtros secundários
        if (allPosts.length > 0) {
            allPostsCache = allPosts;
        }
        
        // 3. Renderiza/Filtra
        list.innerHTML = ''; 
        let postsToDisplay = [];
        
        if (tag === COMMUNITY_NAME) {
            // LÓGICA DE PAGINAÇÃO PARA A ABA PRINCIPAL
            
            currentPostOffset = 0; 
            postsToDisplay = allPostsCache.slice(0, PAGE_SIZE);
            currentPostOffset = PAGE_SIZE;

            postsToDisplay.forEach(post => list.appendChild(createPostItem(post)));
            
            document.getElementById('infinite-scroll-loading').style.display = 'none';
            
        } else {
            // LÓGICA DE FILTRO PARA ABAS SECUNDÁRIAS
            
            postsToDisplay = allPostsCache.filter(post => post.json_metadata?.tags?.includes(tag));
            
            if (postsToDisplay.length === 0) {
                let tagName = tag === COMMUNITY_NAME ? 'Posts' : `Posts com a tag "${tag}"`;
                list.innerHTML = `<div class="p-4 text-muted text-center">Nenhum ${tagName.toLowerCase()} encontrado.</div>`;
            } else {
                postsToDisplay.forEach(post => list.appendChild(createPostItem(post)));
            }
        }

    } catch (error) { // *** TRATAMENTO DE ERROS FINALIZADO ***
        console.error("Erro ao carregar posts:", error);
        // Exibe a mensagem de erro no container principal
        list.innerHTML = `
            <div class="alert alert-danger text-center">
                Não foi possível carregar os posts. Verifique a conexão com a API.
            </div>
        `;
        // Oculta o spinner se estiver visível
        document.getElementById('infinite-scroll-loading').style.display = 'none';
    }
}


// Função handleUrlChange (inalterada - já estava ok com Deep Linking)
function handleUrlChange() {
    let hash = window.location.hash || '#posts';
    const tabId = hash.substring(1); 
    
    const targetTabPane = document.getElementById(tabId);
    if (!targetTabPane) {
        hash = '#posts';
        window.location.hash = hash;
        return; 
    }
    
    // 1. Ativa o link de navegação
    document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        }
    });

    // 2. Ativa o painel de conteúdo
    document.querySelectorAll('.tab-content .tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    targetTabPane.classList.add('show', 'active');
    
    // 3. Carrega o conteúdo da aba (se a lista estiver vazia e não for a aba principal)
    if (tabId !== 'posts') {
        const tag = SECONDARY_TAGS[tabId];
        const containerId = tabId + '-list'; 
        
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
    await loadPostsByTag(COMMUNITY_NAME, 'posts-list');
    handleUrlChange();
    
    document.getElementById('member-search').addEventListener('keyup', handleMemberSearch);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('scroll', handleInfiniteScroll);

    // *** NOVO: Listener para abrir o Modal ***
    const postModalElement = document.getElementById('postModal');
    postModalElement.addEventListener('show.bs.modal', function (event) {
        // Pega o elemento que disparou o modal (o item do post clicado)
        const postItem = event.relatedTarget; 
        
        // Extrai os dados do post dos atributos 'data'
        const author = postItem.getAttribute('data-author');
        const permlink = postItem.getAttribute('data-permlink');

        if (author && permlink) {
            loadPostInModal(author, permlink);
        }
    });
})();