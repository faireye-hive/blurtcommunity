// utils.js

/**
 * Cria e retorna um elemento <a> para um post individual.
 * @param {object} post - O objeto post retornado da API.
 * @returns {HTMLElement} O elemento 'a' completo.
 */
export function createPostItem(post) {
    const item = document.createElement('a');
    item.className = 'list-group-item list-group-item-action d-flex gap-3 align-items-center';

    // *** NOVO: Configuração de link externo seguro ***
    item.href = `https://blurt.blog/${post.category}/@${post.author}/${post.permlink}`; 
    item.target = "_blank";
    item.rel = "noopener noreferrer"; // Boa prática de segurança e performance
    
    // Garantia de segurança (XSS)
    const image = post.json_metadata?.image?.[0] || 'https://blurt.blog/images/placeholder.png';

    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.width = 80;
    imgElement.height = 60;
    imgElement.className = 'rounded';
    
    const contentDiv = document.createElement('div');
    
    const title = document.createElement('h6');
    title.className = 'mb-1';
    title.textContent = post.title; // Seguro contra XSS
    
    const author = document.createElement('small');
    author.className = 'text-muted';
    author.textContent = `by @${post.author}`; // Seguro contra XSS
    
    contentDiv.appendChild(title);
    contentDiv.appendChild(author);
    
    item.appendChild(imgElement);
    item.appendChild(contentDiv);

    return item;
}