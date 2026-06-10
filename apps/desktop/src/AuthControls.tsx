import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import { signOutFromSupabase, startGoogleOAuthSignIn } from "./authActions";
import { getSupabaseBrowserClient } from "./authClient";
import { useDesktopAuthDeepLink } from "./desktopAuthDeepLink";
import { useAuthState } from "./authState";

export function AuthControls() {
  const authState = useAuthState();
  const deepLinkState = useDesktopAuthDeepLink();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSubmitting(false);
    setMessage(null);
  }, [authState.status]);

  useEffect(() => {
    if (deepLinkState.status !== "idle") {
      setIsSubmitting(false);
    }
  }, [deepLinkState.status]);

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Supabase 공개 환경변수가 필요해요.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await startGoogleOAuthSignIn({
      currentHref: window.location.href,
      openUrl: async (url) => {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(url);
      },
      supabase,
    });

    if (result.status !== "success") {
      setIsSubmitting(false);
      setMessage(result.message);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await signOutFromSupabase(supabase);

    if (result.status !== "success") {
      setIsSubmitting(false);
      setMessage(result.message);
    }
  };

  const visibleMessage =
    authState.status === "error"
      ? "Supabase 공개 환경변수가 필요해요."
      : (message ?? deepLinkState.message);
  const isBusy = authState.status === "loading" || isSubmitting;

  if (authState.status === "authenticated") {
    return (
      <div className="desktop-auth-controls">
        <span className="desktop-auth-controls__user">
          {authState.session?.user.email ?? "로그인됨"}
        </span>
        <Button
          className="desktop-sidebar-login"
          disabled={isBusy}
          onClick={handleSignOut}
          variant="secondary"
        >
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className="desktop-auth-controls">
      <Button
        className="desktop-sidebar-login"
        disabled={isBusy}
        onClick={handleSignIn}
        variant="secondary"
      >
        Google 로그인
      </Button>
      {visibleMessage ? (
        <p className="desktop-auth-controls__message">{visibleMessage}</p>
      ) : null}
    </div>
  );
}
