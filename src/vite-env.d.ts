/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_AI_CHAT: string;
  readonly VITE_ENABLE_3D_VIEWER: string;
  readonly VITE_ENABLE_SIMULATION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}