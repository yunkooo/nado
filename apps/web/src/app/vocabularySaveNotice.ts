export type VocabularySaveNotice = {
  tone: "error" | "success";
  text: string;
};

export function createVocabularyLoginRequiredNotice(): VocabularySaveNotice {
  return {
    text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
    tone: "error",
  };
}

export function createVocabularySaveSuccessNotice(
  term: string,
): VocabularySaveNotice {
  return {
    text: `${term}을 단어장에 저장했어요.`,
    tone: "success",
  };
}
