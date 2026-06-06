/**
 * Minimal JSX type stubs so ts-morph can resolve JSX syntax without
 * a real React dependency. Only needed for test fixtures.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      div: any;
      span: any;
      button: any;
      h2: any;
      h3: any;
      ul: any;
      li: any;
      p: any;
    }
  }
}

export declare function jsx(type: any, props: any, key?: any): JSX.Element;
export declare function jsxs(type: any, props: any, key?: any): JSX.Element;
