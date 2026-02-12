/// <reference types="vite/client" />

declare const __TBO_DEV__: boolean;

interface ImportMetaEnv {
  readonly VITE_EARLY_ACCESS_API_MODE?: 'mock' | 'http';
}

declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module '*.vert.glsl' {
  const value: string;
  export default value;
}

declare module '*.frag.glsl' {
  const value: string;
  export default value;
}
