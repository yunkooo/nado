import { useAuthState } from "../auth/authState";
import { useSyncAnalysisUserScope } from "../features/analysis/analysisState";
import {
  useRefreshVocabularyForActiveStudySurface,
  useSyncVocabularyForAuth,
  useSyncVocabularyRealtimeForAuth,
} from "../features/vocabulary/vocabularyState";

type AppDataSyncProps = {
  activeItem: "analysis" | "review" | "vocabulary";
};

export function AppDataSync({ activeItem }: AppDataSyncProps) {
  const authState = useAuthState();
  const isStudySurfaceActive =
    activeItem === "vocabulary" || activeItem === "review";

  useSyncAnalysisUserScope(
    authState.session?.user.id ?? null,
    authState.status === "loading",
  );
  useSyncVocabularyForAuth(authState);
  useSyncVocabularyRealtimeForAuth(authState);
  useRefreshVocabularyForActiveStudySurface(
    authState,
    isStudySurfaceActive,
    activeItem,
  );

  return null;
}
