/// <reference types="vite/client" />

declare const __TBO_DEV__: boolean;

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
