import { createGoogleOAuthRedirectTo, isTauriRuntime } from "./authClient";

type OAuthClient = {
  auth: {
    signInWithOAuth(options: {
      options: {
        redirectTo: string;
        skipBrowserRedirect: boolean;
      };
      provider: "google";
    }): Promise<{
      data: {
        url?: string | null;
      };
      error: unknown;
    }>;
  };
};

type SignOutClient = {
  auth: {
    signOut(): Promise<{ error: unknown }>;
  };
};

type AuthActionResult =
  | { status: "success" }
  | { message: string; status: "error" | "message" };

export async function startGoogleOAuthSignIn({
  currentHref,
  isTauri = isTauriRuntime(),
  openUrl,
  supabase,
}: {
  currentHref: string;
  isTauri?: boolean;
  openUrl: (url: string) => Promise<unknown>;
  supabase: OAuthClient;
}): Promise<AuthActionResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: createGoogleOAuthRedirectTo(currentHref, { isTauri }),
        skipBrowserRedirect: isTauri,
      },
      provider: "google",
    });

    if (error) {
      return {
        message: "Google 로그인을 시작하지 못했어요.",
        status: "error",
      };
    }

    if (!isTauri) {
      return { status: "success" };
    }

    if (!data.url) {
      return {
        message: "Google 로그인 URL을 받지 못했어요.",
        status: "error",
      };
    }

    try {
      await openUrl(data.url);
    } catch {
      return {
        message: "Google 로그인 페이지를 열지 못했어요.",
        status: "error",
      };
    }

    return {
      message: "브라우저에서 Google 로그인을 완료해 주세요.",
      status: "message",
    };
  } catch {
    return {
      message: "Google 로그인을 시작하지 못했어요.",
      status: "error",
    };
  }
}

export async function signOutFromSupabase(
  supabase: SignOutClient,
): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        message: "로그아웃하지 못했어요.",
        status: "error",
      };
    }

    return { status: "success" };
  } catch {
    return {
      message: "로그아웃하지 못했어요.",
      status: "error",
    };
  }
}
