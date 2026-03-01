/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    spread?: number;
    [key: string]: unknown;
  }
  const confetti: (options?: Options) => void;
  export default confetti;
}
