/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTANGLE_USER_CLIENT_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
