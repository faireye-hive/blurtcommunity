import { CONFIG } from './config.js'; 
const { RPC_URL } = CONFIG;

// Função para chamadas de API (permanece a mesma)
export async function rpcCall(method, params = {}, id = 1) {
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