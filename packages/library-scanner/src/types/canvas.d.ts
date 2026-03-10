declare module "canvas" {
  export interface Canvas {
    width: number;
    height: number;
    getContext(type: "2d"): CanvasRenderingContext2D;
    toBuffer(mimeType: "image/png" | "image/jpeg"): Buffer;
    toDataURL(mimeType?: string): string;
  }

  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(
    src: string | Buffer,
  ): Promise<{ width: number; height: number }>;
}
