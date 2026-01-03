declare module "pdf-parse" {
  interface PdfParseResult {
    text?: string;
    numpages?: number;
    numPages?: number;
    info?: unknown;
    metadata?: unknown;
  }

  type PdfParse = (data: Buffer | Uint8Array | ArrayBuffer) => Promise<PdfParseResult>;

  const pdfParse: PdfParse;
  export default pdfParse;
}

