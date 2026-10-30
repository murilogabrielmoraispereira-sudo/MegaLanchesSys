const PRODUCTION_API_URL = "https://megalanches-cardapio.com.br";

export const API_URL = String(process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL).replace(/\/$/, "");

export function assertApiUrl() {
  if (!API_URL) {
    throw new Error("Configure EXPO_PUBLIC_API_URL no arquivo .env do aplicativo.");
  }
}
