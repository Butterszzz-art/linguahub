// Server component — no interactivity needed, so it renders straight from
// the data the classroom page already fetched.
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDuration } from "@/lib/formatDuration";

type Lesson = { id: string; status: string; timeSpentSec: number };
type Unit = { id: string; title: string; lessons: Lesson[] };

export function ProgressTab({ streakCount, units }: { streakCount: number; units: Unit[] }) {
  const allLessons = units.flatMap((u) => u.lessons);
  const completedCount = allLessons.filter((l) => l.status === "completed").length;
  const totalSeconds = allLessons.reduce((sum, l) => sum + l.timeSpentSec, 0);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="font-display text-3xl font-bold text-ink">
            {streakCount > 0 ? "🔥 " : ""}
            {streakCount}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            Day streak{streakCount === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5 text-center">
          <p className="font-display text-3xl font-bold text-ink">{completedCount}</p>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            Lesson{completedCount === 1 ? "" : "s"} completed
          </p>
        </Card>
        <Card className="p-5 text-center">
          <p className="font-display text-3xl font-bold text-ink">{formatDuration(totalSeconds)}</p>
          <p className="mt-1 text-sm font-semibold text-ink-muted">Time studied</p>
        </Card>
      </div>

      <div>
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
          Per-unit progress
        </h2>
        {units.length === 0 ? (
          <Card className="mt-2.5 border-dashed p-6 text-center text-sm text-ink-muted">
            No units yet.
          </Card>
        ) : (
          <div className="mt-2.5 space-y-3">
            {units.map((unit) => {
              const unitCompleted = unit.lessons.filter((l) => l.status === "completed").length;
              return (
                <Card key={unit.id} className="p-4">
                  <ProgressBar
                    value={unitCompleted}
                    max={unit.lessons.length}
                    label={unit.title}
                    size="sm"
                  />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
