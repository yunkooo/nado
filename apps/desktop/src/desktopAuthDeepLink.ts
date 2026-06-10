import { useEffect, useState } from "react";
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
    const unlistenCallbacks: Array<() => void> = [];

    const handleUrls = async (urls: string[] | null) => {
      if (!urls) {
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

    void import("@tauri-apps/plugin-deep-link")
      .then(async ({ getCurrent, onOpenUrl }) => {
        unlistenCallbacks.push(await onOpenUrl(handleUrls));

        try {
          await handleUrls(await getCurrent());
        } catch {
          if (isMounted) {
            setMessage("데스크탑 로그인 콜백을 확인하지 못했어요.");
            setStatus("error");
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("데스크탑 로그인 콜백을 준비하지 못했어요.");
          setStatus("error");
        }
      });

    void import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        const unlisten = await listen<string>(
          "desktop-oauth-callback",
          ({ payload }) => {
            void handleUrls([payload]);
          },
        );

        unlistenCallbacks.push(unlisten);
      })
      .catch(() => {
        if (isMounted) {
          setMessage("데스크탑 로그인 콜백을 준비하지 못했어요.");
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
      unlistenCallbacks.forEach((unlisten) => unlisten());
    };
  }, []);

  return { message, status };
}
