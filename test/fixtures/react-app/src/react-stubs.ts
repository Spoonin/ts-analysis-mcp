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

// React hook stubs
export declare function useState<T>(initial: T): [T, (v: T) => void];
export declare function useEffect(effect: () => void | (() => void), deps?: any[]): void;
export declare function useContext<T>(context: any): T;
export declare function useMemo<T>(factory: () => T, deps: any[]): T;
export declare function useCallback<T extends (...args: any[]) => any>(cb: T, deps: any[]): T;
export declare function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void];

// Redux-like stubs
export declare function useSelector<T>(selector: (state: any) => T): T;
export declare function useDispatch(): (action: any) => void;
