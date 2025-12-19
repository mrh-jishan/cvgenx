declare module 'pdf-parse' {
  interface PDFInfo {
    numpages: number;
  }

  interface PDFResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: any;
    text: string;
    version: string;
  }

  function pdf(dataBuffer: Buffer): Promise<PDFResult>;

  export = pdf;
}
