// config.js

/**
 * Constantes de Configuração da Aplicação Blurt
 */
export const CONFIG = {
    // URL principal do Remote Procedure Call (RPC)
    RPC_URL: 'https://rpc.blurt.world',
    
    // Nome da comunidade principal que está sendo carregada
    COMMUNITY_NAME: 'blurt-143557',

    // Limite máximo de posts a serem carregados da API (mantido em 100 para o cache global)
    POSTS_LIMIT: 100, 
    
    // *** NOVO: Tamanho da página para exibição (15 posts por vez) ***
    PAGE_SIZE: 15,

    // Tempo de vida do cache (Time To Live): 1 hora em milissegundos
    CACHE_TTL: 60 * 60 * 1000, 

    CACHE_KEYS: {
        ALL_POSTS: 'allposts1',
        COMMUNITY_INFO: 'communityInfo',
        MEMBER_LIST: 'memberList'
    },

    // Lista de tags secundárias que serão filtradas em abas específicas
    SECONDARY_TAGS: {
        forum: 'discussion',
        poll: 'peace',
        shorts: 'ai'
    }
};