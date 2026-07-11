declare module "subset-font" {
  interface SubsetFontOptions {
    targetFormat: "sfnt" | "truetype" | "woff" | "woff2";
    preserveNameIds?: number[];
    variationAxes?: Record<string, number | { min?: number; max?: number; default?: number }>;
    noLayoutClosure?: boolean;
  }

  export default function subsetFont(
    buffer: Buffer,
    text: string,
    options: SubsetFontOptions
  ): Promise<Buffer>;
}
