export interface MobileTranslationNote {
  note: string;
  term: string;
}

const TRANSLATION_POINT_SECTION_TITLE = "번역 포인트";

export function getVisibleMobileTranslationNoteParts(
  note: MobileTranslationNote,
) {
  const trimmedTerm = note.term.trim();
  const trimmedNote = note.note.trim();

  return {
    note:
      trimmedNote.length > 0 && trimmedNote !== trimmedTerm ? note.note : null,
    term:
      trimmedTerm.length > 0 && trimmedTerm !== TRANSLATION_POINT_SECTION_TITLE
        ? note.term
        : null,
  };
}
