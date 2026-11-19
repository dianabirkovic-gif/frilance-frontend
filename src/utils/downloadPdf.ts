import type { TDocumentDefinitions } from "pdfmake/interfaces";

/**
 * Renders a pdfmake document and hands the browser a download. pdfmake and its
 * embedded Roboto (the only font in it that covers Cyrillic) weigh well over a
 * megabyte, so they are imported here, on the first export, rather than at the
 * top of a file — the screens that offer an export never pay for them until it
 * is used.
 */
export async function downloadPdf(definition: TDocumentDefinitions, filename: string): Promise<void> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  await pdfMake.createPdf(definition).download(filename);
}
