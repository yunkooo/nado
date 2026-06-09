import { AppShell } from "../AppShell";
import { ReviewFlow } from "./ReviewFlow";

export default function ReviewPage() {
  return (
    <AppShell activeItem="review" workspaceLabel="복습 화면">
      <section className="nado-content-workspace">
        <div className="nado-page">
          <header className="nado-page-header">
            <div>
              <p className="nado-eyebrow">Review</p>
              <h1 className="nado-page-title">복습</h1>
            </div>
          </header>

          <ReviewFlow />
        </div>
      </section>
    </AppShell>
  );
}
