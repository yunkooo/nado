"use client";

import { useState } from "react";
import { Button } from "@nado/ui";
import {
  createGoogleOAuthRedirectTo,
  getSupabaseBrowserClient,
} from "../features/auth/authClient";
import {
  useAuthState,
  type AuthStateErrorCode,
} from "../features/auth/authState";

const authErrorMessages: Record<AuthStateErrorCode, string> = {
  configuration: "Supabase 공개 환경변수가 필요해요.",
  oauth_callback: "Google 로그인 완료 처리에 실패했어요.",
  session: "로그인 세션을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

type AuthActionState = {
  isSubmitting: boolean;
  message: string | null;
  scope: string;
};

export function AuthControls() {
  const authState = useAuthState();
  const authScope = `${authState.status}:${authState.accessToken ?? "none"}`;
  const [actionState, setActionState] = useState<AuthActionState>({
    isSubmitting: false,
    message: null,
    scope: "",
  });
  const isCurrentAction = actionState.scope === authScope;
  const isSubmitting = isCurrentAction && actionState.isSubmitting;
  const message = isCurrentAction ? actionState.message : null;

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setActionState({
        isSubmitting: false,
        message: "Supabase 공개 환경변수가 필요해요.",
        scope: authScope,
      });
      return;
    }

    setActionState({ isSubmitting: true, message: null, scope: authScope });

    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: createGoogleOAuthRedirectTo(window.location.href),
      },
      provider: "google",
    });

    if (error) {
      setActionState({
        isSubmitting: false,
        message: "Google 로그인을 시작하지 못했어요.",
        scope: authScope,
      });
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setActionState({ isSubmitting: true, message: null, scope: authScope });

    const { error } = await supabase.auth.signOut();

    if (error) {
      setActionState({
        isSubmitting: false,
        message: "로그아웃하지 못했어요.",
        scope: authScope,
      });
    }
  };

  const visibleMessage =
    authState.status === "error"
      ? authErrorMessages[authState.errorCode ?? "session"]
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
