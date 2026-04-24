/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTANGLE_HOST_TOKEN?: string;
  readonly VITE_ENTANGLE_HOST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
