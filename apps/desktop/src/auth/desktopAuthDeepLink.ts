import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { completeAuthFromCallbackUrl, isTauriRuntime } from "./authClient";

type DesktopAuthDeepLinkState = {
  message: string | null;
  status: "error" | "handled" | "idle";
};

export function useDesktopAuthDeepLink(): DesktopAuthDeepLinkState {
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] =
    useState<DesktopAuthDeepLinkState["status"]>("idle");

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let isMounted = true;
    const listenerRegistrations: Array<Promise<() => void>> = [];
    const showLoopbackError = () => {
      if (isMounted) {
        setMessage(
          "데스크탑 로그인 콜백 서버를 시작하지 못했어요. nado 앱을 모두 종료한 뒤 다시 열어 주세요.",
        );
        setStatus("error");
      }
    };

    const handleUrls = async (urls: string[] | null) => {
      if (!isMounted || !urls) {
        return;
      }

      for (const url of urls) {
        const result = await completeAuthFromCallbackUrl(url);

        if (!isMounted) {
          return;
        }

        if (result === "handled") {
          setMessage(null);
          setStatus("handled");
          return;
        }

        if (result === "error") {
          setMessage("Google 로그인 완료 처리에 실패했어요.");
          setStatus("error");
          return;
        }
      }
    };

    const deepLinkRegistration = import("@tauri-apps/plugin-deep-link")
      .then(async ({ getCurrent, onOpenUrl }) => {
        const unlisten = await onOpenUrl(handleUrls);

        try {
          await handleUrls(await getCurrent());
        } catch {
          if (isMounted) {
            setMessage("데스크탑 로그인 콜백을 확인하지 못했어요.");
            setStatus("error");
          }
        }

        return unlisten;
      })
      .catch(() => {
        if (isMounted) {
          setMessage("데스크탑 로그인 콜백을 준비하지 못했어요.");
          setStatus("error");
        }

        return () => undefined;
      });
    listenerRegistrations.push(deepLinkRegistration);

    const appEventRegistration = import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        const unlistenCallbacks: Array<() => void> = [];

        try {
          unlistenCallbacks.push(
            await listen<string>("desktop-oauth-callback", ({ payload }) => {
              void handleUrls([payload]);
            }),
          );
          unlistenCallbacks.push(
            await listen<string>("desktop-oauth-loopback-error", () => {
              showLoopbackError();
            }),
          );

          try {
            const loopbackError = await invoke<string | null>(
              "get_oauth_loopback_error",
            );

            if (loopbackError) {
              showLoopbackError();
            }
          } catch {
            if (isMounted) {
              setMessage("데스크탑 로그인 콜백 상태를 확인하지 못했어요.");
              setStatus("error");
            }
          }

          return () => {
            unlistenCallbacks.forEach((unlisten) => unlisten());
          };
        } catch (error) {
          unlistenCallbacks.forEach((unlisten) => unlisten());
          throw error;
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("데스크탑 로그인 콜백을 준비하지 못했어요.");
          setStatus("error");
        }

        return () => undefined;
      });
    listenerRegistrations.push(appEventRegistration);

    return () => {
      isMounted = false;
      listenerRegistrations.forEach((registration) => {
        void registration.then((unlisten) => unlisten());
      });
    };
  }, []);

  return { message, status };
}
