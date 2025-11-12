// render.js

// 1. Renderização de Informações da Comunidade (Membro e Estatísticas)
export function renderCommunityInfo(data) {
    document.getElementById('community-name').textContent = data.title || data.name;
    document.getElementById('community-tagline').textContent = data.about || '';
    document.getElementById('community-website').href = data.url || '#';
    document.getElementById('community-website').textContent = data.url || '—';
    document.getElementById('community-desc').textContent = data.description || data.about || '';
    document.getElementById('stat-members').textContent = data.num_authors || '—';
    document.getElementById('stat-posts').textContent = data.num_pending || '—';
    document.getElementById('stat-subs').textContent = data.subscribers || '—';
}
export function displayCommunityError(message) {
    document.getElementById('community-name').textContent = 'Erro de Conexão';
    document.getElementById('community-desc').textContent = message; 
    // Você pode limpar ou zerar outros stats aqui, se desejar.
}

// 2. Renderização da Lista de Membros (Usando Template Literals)
export function renderMembers(memberList) {
    const membersDiv = document.getElementById('members');

    if (memberList.length === 0) {
        membersDiv.innerHTML = `<div class="p-2 text-muted text-center">Nenhum membro encontrado.</div>`;
        return;
    }
    
    // Renderiza a lista de membros usando Template Literals
    membersDiv.innerHTML = memberList.map(u => `
      <div class='d-flex align-items-center mb-2'>
        <img class='member-avatar' src='https://imgp.blurt.world/profileimage/${u[0]}/avatar' alt='${u[0]}'>
        <span>@${u[0]}</span>
      </div>`).join('');
}

// 3. Funções de Manipulação do Modal de Post (Extraída de loadPostInModal)

export function resetModalContent() {
    const titleElement = document.getElementById('postModalLabel');
    const contentElement = document.getElementById('modal-post-content');
    const authorElement = document.getElementById('modal-post-author');
    const votesElement = document.getElementById('modal-post-votes');
    const commentsElement = document.getElementById('modal-post-comments');
    
    // Resetar o conteúdo do modal
    titleElement.textContent = 'Carregando...';
    contentElement.innerHTML = `<div class="text-center p-5 text-muted"><i class="bi bi-arrow-clockwise h4 spin"></i> Carregando conteúdo...</div>`;
    authorElement.textContent = '';
    votesElement.textContent = '0';
    commentsElement.textContent = '0';
}

export function updateModalContent(postData, htmlContent) {
    document.getElementById('postModalLabel').textContent = postData.title;
    document.getElementById('modal-post-author').textContent = `Publicado por @${postData.author}`;
    document.getElementById('modal-post-votes').textContent = postData.active_votes.length;
    document.getElementById('modal-post-comments').textContent = postData.children;
    document.getElementById('modal-post-content').innerHTML = htmlContent;
}

export function displayModalError(message) {
    document.getElementById('postModalLabel').textContent = 'Erro';
    document.getElementById('modal-post-content').innerHTML = `
        <div class="alert alert-danger text-center">Falha ao carregar o post: ${message}</div>
    `;
}

// 4. Manipulação da Navegação de Abas (Extraída de handleUrlChange)

export function toggleTabVisibility(hash, tabId) {
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
    const targetTabPane = document.getElementById(tabId);
    if (targetTabPane) {
        targetTabPane.classList.add('show', 'active');
    }
}

