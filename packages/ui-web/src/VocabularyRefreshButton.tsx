export type VocabularyRefreshButtonProps = {
  isDisabled: boolean;
  isRefreshing: boolean;
  message: string | null;
  onRefresh: () => void;
};

export function VocabularyRefreshButton({
  isDisabled,
  isRefreshing,
  message,
  onRefresh,
}: VocabularyRefreshButtonProps) {
  return (
    <div className="nado-vocabulary-refresh">
      <button
        aria-busy={isRefreshing ? "true" : undefined}
        aria-label="단어장 새로고침"
        className="nado-vocabulary-refresh__button"
        disabled={isDisabled || isRefreshing}
        onClick={onRefresh}
        type="button"
      >
        <RefreshIcon />
      </button>
      {message ? (
        <p className="nado-vocabulary-refresh__message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className="nado-vocabulary-refresh__icon"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M20 6v5h-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M4 18v-5h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5.5 9a7 7 0 0 1 11.8-2.8L20 11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M18.5 15a7 7 0 0 1-11.8 2.8L4 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
