/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string;
}

declare module "*.glb" {
  const src: string;
  export default src;
}
