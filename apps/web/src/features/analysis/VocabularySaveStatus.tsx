import type { VocabularySaveNotice } from "./vocabularySaveNotice";

type VocabularySaveStatusProps = {
  message: VocabularySaveNotice | null;
};

export function VocabularySaveStatus({ message }: VocabularySaveStatusProps) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={[
        "nado-save-status",
        message.tone === "error" ? "nado-save-status--error" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      role={message.tone === "error" ? "alert" : "status"}
    >
      {message.text}
    </section>
  );
}
