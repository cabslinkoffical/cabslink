// vite-imagetools query-string imports for jpg/png sources.
declare module "*.jpg?*" {
  const src: string;
  export default src;
}
declare module "*.jpeg?*" {
  const src: string;
  export default src;
}
declare module "*.png?*" {
  const src: string;
  export default src;
}
