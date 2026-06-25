import type { ReactNode } from "react";
import { countVisibleTextCharacters } from "./text";
import type { TranslationNote } from "./analysisTypes";

export interface InputSampleProps {
  count?: number;
  label?: string;
  maxLength: number;
  text: string;
}

export function InputSample({
  count,
  label = "입력한 문장",
  maxLength,
  text,
}: InputSampleProps) {
  const visibleCount = count ?? countVisibleTextCharacters(text);

  return (
    <section className="nado-input-sample" aria-label={label}>
      <p className="nado-input-sample__text">{text}</p>
      <span className="nado-input-sample__count">
        {visibleCount} / {maxLength}
      </span>
    </section>
  );
}

export interface ResultCardProps {
  children: ReactNode;
  description?: string;
  meta?: string;
  title: string;
}

export function ResultCard({
  children,
  description,
  meta,
  title,
}: ResultCardProps) {
  return (
    <article className="nado-result-card">
      <header className="nado-result-card__header">
        <div className="nado-result-card__title-group">
          <h2 className="nado-result-card__title">{title}</h2>
          {description ? (
            <p className="nado-result-card__description">{description}</p>
          ) : null}
        </div>
        {meta ? <span className="nado-result-card__meta">{meta}</span> : null}
      </header>
      <div className="nado-result-card__body">{children}</div>
    </article>
  );
}

export interface SectionProps {
  children: ReactNode;
  title: string;
}

export function Section({ children, title }: SectionProps) {
  return (
    <section className="nado-section">
      <h3 className="nado-section__title">{title}</h3>
      <div className="nado-section__body">{children}</div>
    </section>
  );
}

export interface TranslationBlockProps {
  paragraphs: string[];
}

export function TranslationBlock({ paragraphs }: TranslationBlockProps) {
  return (
    <div className="nado-translation-block">
      {paragraphs.map((paragraph) => (
        <p className="nado-translation-block__paragraph" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export interface TranslationNotesProps {
  notes: TranslationNote[];
}

export function TranslationNotes({ notes }: TranslationNotesProps) {
  return (
    <ul className="nado-note-list">
      {notes.map((note) => {
        const display = getVisibleTranslationNoteParts(note);

        if (!display.term && !display.note) {
          return null;
        }

        return (
          <li
            className="nado-note-list__item"
            key={`${note.term}-${note.note}`}
          >
            {display.term ? (
              <strong className="nado-note-list__term">{display.term}</strong>
            ) : null}
            {display.note ? (
              <span className="nado-note-list__text">{display.note}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const TRANSLATION_POINT_SECTION_TITLE = "번역 포인트";

function getVisibleTranslationNoteParts(note: TranslationNote) {
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
