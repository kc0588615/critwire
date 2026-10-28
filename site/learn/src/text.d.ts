// esbuild's text loader (scripts/build/learn/assets.ts): a .sql import is the file's text.
declare module "*.sql" {
  const text: string;
  export default text;
}
