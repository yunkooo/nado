import { useEffect, useState } from "react";
import { completeAuthFromCallbackUrl, isTauriRuntime } from "./authClient";

type DesktopAuthDeepLinkState = {
  message: string | null;
};

export function useDesktopAuthDeepLink(): DesktopAuthDeepLinkState {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let isMounted = true;
    let unlisten: (() => void) | null = null;

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
          return;
        }

        if (result === "error") {
          setMessage("Google 로그인 완료 처리에 실패했어요.");
          return;
        }
      }
    };

    void import("@tauri-apps/plugin-deep-link")
      .then(async ({ getCurrent, onOpenUrl }) => {
        await handleUrls(await getCurrent());
        unlisten = await onOpenUrl(handleUrls);
      })
      .catch(() => {
        if (isMounted) {
          setMessage("데스크탑 로그인 콜백을 준비하지 못했어요.");
        }
      });

    return () => {
      isMounted = false;
      unlisten?.();
    };
  }, []);

  return { message };
}
