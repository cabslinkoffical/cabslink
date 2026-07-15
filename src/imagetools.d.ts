// vite-imagetools query-string imports. TypeScript wildcard module patterns
// accept a single `*`, so declare one per query suffix we actually use.
declare module "*&as=srcset" {
  const src: string;
  export default src;
}
declare module "*&format=webp" {
  const src: string;
  export default src;
}
