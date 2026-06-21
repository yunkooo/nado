type VocabularyRefreshButtonProps = {
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
        {isRefreshing ? "새로고침 중" : "새로고침"}
      </button>
      {message ? (
        <p className="nado-vocabulary-refresh__message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
