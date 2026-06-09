"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import {
  createGoogleOAuthRedirectTo,
  getSupabaseBrowserClient,
} from "./authClient";

type AuthStatus = "anonymous" | "authenticated" | "error" | "loading";

export function AuthControls() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase 공개 환경변수가 필요해요.");
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setStatus(data.session ? "authenticated" : "anonymous");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
      setMessage(null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase 공개 환경변수가 필요해요.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: createGoogleOAuthRedirectTo(window.location.href),
      },
      provider: "google",
    });

    if (error) {
      setStatus("error");
      setMessage("Google 로그인을 시작하지 못했어요.");
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setStatus("loading");
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus("error");
      setMessage("로그아웃하지 못했어요.");
    }
  };

  if (status === "authenticated") {
    return (
      <div className="nado-auth-controls">
        <span className="nado-auth-controls__user">
          {session?.user.email ?? "로그인됨"}
        </span>
        <Button
          className="nado-sidebar-login"
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
        disabled={status === "loading"}
        onClick={handleSignIn}
        variant="secondary"
      >
        Google 로그인
      </Button>
      {message ? (
        <p className="nado-auth-controls__message">{message}</p>
      ) : null}
    </div>
  );
}
