// components/LessonFrame.tsx
//
// Renders a lesson's self-contained HTML (with its own <style>/<script>) inside a
// sandboxed iframe, so each lesson's tabs/quizzes/interactive bits work exactly as
// authored, without that script ever touching the parent app's DOM, cookies, or storage.

"use client";

type LessonFrameProps = {
  contentHtml: string;
  title: string;
};

export default function LessonFrame({ contentHtml, title }: LessonFrameProps) {
  return (
    <iframe
      title={title}
      srcDoc={contentHtml}
      sandbox="allow-scripts"
      // no "allow-same-origin" — keeps the iframe in a null origin, so its script
      // can't read/write the parent page, cookies, or localStorage
      style={{
        width: "100%",
        minHeight: "70vh",
        border: "none",
        borderRadius: "12px",
        background: "white",
      }}
    />
  );
}

// Usage in the lesson page (app/classroom/[id]/lesson/[lessonId]/page.tsx):
//
//   <LessonFrame contentHtml={lesson.contentHtml} title={lesson.title} />
//   <button onClick={markComplete}>Mark lesson as complete</button>
//
// "Mark as complete" stays a separate, explicit action in the parent app —
// it does not try to read state out of the sandboxed iframe, since that state
// is intentionally isolated. This keeps progress tracking reliable regardless
// of what each individual lesson file does internally.
