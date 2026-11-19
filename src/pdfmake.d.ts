// pdfmake's bundler-friendly browser build has no typings of its own; the
// shapes are the same as the package root's, which @types/pdfmake covers.
declare module "pdfmake/build/pdfmake" {
  import type * as PdfMake from "pdfmake";
  const pdfMake: typeof PdfMake;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
