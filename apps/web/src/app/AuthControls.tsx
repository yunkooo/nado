"use client";

import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import {
  createGoogleOAuthRedirectTo,
  getSupabaseBrowserClient,
} from "./authClient";
import { useAuthState } from "./authState";

export function AuthControls() {
  const authState = useAuthState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSubmitting(false);
    setMessage(null);
  }, [authState.status]);

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Supabase 공개 환경변수가 필요해요.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: createGoogleOAuthRedirectTo(window.location.href),
      },
      provider: "google",
    });

    if (error) {
      setIsSubmitting(false);
      setMessage("Google 로그인을 시작하지 못했어요.");
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setIsSubmitting(false);
      setMessage("로그아웃하지 못했어요.");
    }
  };

  const visibleMessage =
    authState.status === "error"
      ? "Supabase 공개 환경변수가 필요해요."
      : message;
  const isBusy = authState.status === "loading" || isSubmitting;

  if (authState.status === "authenticated") {
    return (
      <div className="nado-auth-controls">
        <span className="nado-auth-controls__user">
          {authState.session?.user.email ?? "로그인됨"}
        </span>
        <Button
          className="nado-sidebar-login"
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
    <div className="nado-auth-controls">
      <Button
        className="nado-sidebar-login"
        disabled={isBusy}
        onClick={handleSignIn}
        variant="secondary"
      >
        Google 로그인
      </Button>
      {visibleMessage ? (
        <p className="nado-auth-controls__message">{visibleMessage}</p>
      ) : null}
    </div>
  );
}
