import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import "./reactActEnvironment";

type HookResult<Result> = {
  readonly current: Result;
};

export function renderHook<Result, Props>(
  useHook: (props: Props) => Result,
  initialProps: Props,
) {
  const container = document.createElement("div");
  const root = createRoot(container);
  let currentResult: Result | undefined;

  const HookHarness = ({ props }: { props: Props }) => {
    currentResult = useHook(props);
    return null;
  };
  const render = (props: Props) => {
    act(() => {
      root.render(createElement(HookHarness, { props }));
    });
  };

  render(initialProps);

  return {
    result: {
      get current() {
        if (currentResult === undefined) {
          throw new Error("Hook result is not available.");
        }

        return currentResult;
      },
    } as HookResult<Result>,
    rerender: render,
    unmount() {
      act(() => root.unmount());
    },
  };
}
