declare module 'plotly.js-dist-min' {
  export = Plotly;
}

declare namespace Plotly {
  export interface Config {
    responsive?: boolean;
    displayModeBar?: boolean;
    displaylogo?: boolean;
    modeBarButtonsToRemove?: string[];
    [key: string]: any;
  }

  export interface Layout {
    title?: string;
    xaxis?: Partial<Axis>;
    yaxis?: Partial<Axis>;
    height?: number;
    width?: number;
    margin?: Partial<Margin>;
    [key: string]: any;
  }

  export interface Axis {
    title?: string;
    tickangle?: number;
    [key: string]: any;
  }

  export interface Margin {
    t?: number;
    r?: number;
    b?: number;
    l?: number;
  }

  export interface Data {
    x?: any[];
    y?: any[];
    type?: string;
    marker?: Partial<Marker>;
    hovertemplate?: string;
    [key: string]: any;
  }

  export interface Marker {
    color?: any;
    line?: Partial<MarkerLine>;
    [key: string]: any;
  }

  export interface MarkerLine {
    color?: any;
    width?: number;
  }

  export function newPlot(
    root: HTMLElement,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
  ): Promise<HTMLElement>;

  export function react(
    root: HTMLElement,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
  ): Promise<HTMLElement>;

  export function purge(root: HTMLElement): void;

  export namespace Plots {
    export function resize(root: HTMLElement): void;
  }
}
