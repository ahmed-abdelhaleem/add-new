import { getUser } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { lifetimeLevel, nextUnlock } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function LevelPage() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  const info = lifetimeLevel(user.total_lifetime_points);
  const next = nextUnlock(info.level);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Level {info.level}</h1>
        <p className="text-sm text-ink-300">Permanent. Doesn&apos;t reset month to month.</p>
      </header>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <span className="text-sm">{info.lifetimePoints.toLocaleString()} lifetime pts</span>
          <span className="text-xs text-ink-300">
            Next: {info.nextLevelAt.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-ink-700">
          <div className="h-full rounded-full bg-flame" style={{ width: `${info.pctToNext}%` }} />
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink-200">Unlocked</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {info.unlockedAt.map((u) => (
            <li key={u} className="text-mint">· {u}</li>
          ))}
        </ul>
      </section>

      {next && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Next unlock — Level {next.level}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-300">
            {next.items.map((u) => (
              <li key={u}>· {u}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
