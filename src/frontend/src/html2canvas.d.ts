declare module "html2canvas" {
  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string | null;
    logging?: boolean;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    scrollX?: number;
    scrollY?: number;
    windowWidth?: number;
    windowHeight?: number;
    foreignObjectRendering?: boolean;
    imageTimeout?: number;
    removeContainer?: boolean;
    ignoreElements?: (element: HTMLElement) => boolean;
    onclone?: (doc: Document) => void;
    proxy?: string;
  }

  function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions,
  ): Promise<HTMLCanvasElement>;

  export default html2canvas;
}
