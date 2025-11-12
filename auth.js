// auth.js

// Usaremos a função de login padrão (sign-in) que é robusta para Hive/Blurt Keychain.
// Ela usa o 'posting authority' para provar a identidade do usuário.
const APP_ID = "my_community_app"; // Altere para o nome
import { CONFIG } from "./config.js";
const { CACHE_KEYS } = CONFIG;

/**
 * Verifica se o Keychain está instalado.
 * @returns {boolean}
 */
export function isKeychainInstalled() {
  // Verifica a variável global injetada pela extensão
  return typeof window.hive_keychain !== "undefined";
}

/**
 * Solicita o login do usuário usando Hive Keychain.
 * @param {string} username - Opcional: nome de usuário pré-preenchido.
 * @returns {Promise<string|null>} O nome de usuário logado ou null em caso de falha.
 */
export async function loginWithKeychain(username = "") {
  if (!isKeychainInstalled()) {
    alert("Hive Keychain não encontrado. Por favor, instale a extensão.");
    return null;
  }

  try {
    const chain = "HIVE"; // Estou usando hive agora

    // 1. Gera uma mensagem (timestamp) que o usuário assinará para provar a posse da conta.
    const message = JSON.stringify({
      ts: Date.now(),
      app: APP_ID,
    });


    // 2. Solicita a assinatura da mensagem com a chave Posting
    // O Hive Keychain usa a função requestSigniture para login seguro.
    const result = await new Promise((resolve, reject) => {
      window.hive_keychain.requestSignBuffer(
        username,
        "Login commonity",
        "Posting",
        (res) => {
          if (res.success) {
            resolve(res);
          } else {
            reject(
              new Error(
                resolve.message || "Login cancelado ou falha na assinatura."
              )
            );
          }
        }
      );
    });
    return result.data.username;
  } catch (error) {
    console.error("Erro no login via Hive Keychain:", error);
    alert(`Falha no login: ${error.message}`);
    return null;
  }
}

export function logout() {
    localStorage.removeItem(CACHE_KEYS.CURRENT_USER);
    // Note: Não há necessidade de chamar o Hive Keychain para logout.
}