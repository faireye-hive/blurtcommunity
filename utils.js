// utils.js

/**
 * Cria e retorna um elemento <a> para um post individual.
 * @param {object} post - O objeto post retornado da API.
 * @returns {HTMLElement} O elemento 'a' completo.
 */
export function createPostItem(post) {
    const image = post.json_metadata?.image?.[0] || 'https://blurt.blog/images/placeholder.png';

    const html = `
        <a class="list-group-item list-group-item-action d-flex gap-3 align-items-center"
           data-bs-toggle="modal"
           data-bs-target="#postModal"
           data-author="${post.author}"
           data-permlink="${post.permlink}">

            <img src="${image}" width="80" height="60" class="rounded" alt="Capa do post: ${post.title}">
            
            <div>
                <h6 class="mb-1">${post.title}</h6>
                <small class="text-muted">by @${post.author}</small>
            </div>
        </a>
    `;

    // Converte a string HTML em um nó DOM real
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    
    // Retorna o primeiro filho (o elemento <a>)
    return tempDiv.firstChild;
}

export function convertMarkdownToHtml(markdownText) {
    // A função marked.parse() faz o trabalho pesado de conversão de Markdown para HTML.
    // O `marked.js` deve ser carregado no index.html antes deste script.
    return marked.parse(markdownText || '', { sanitize: true }); 
}