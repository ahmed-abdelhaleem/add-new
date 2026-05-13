import { listMemoryCards } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const userId = await getUserId();
  const cards = listMemoryCards(userId);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Memory Gallery</h1>
        <p className="text-sm text-ink-300">What your consistency produced.</p>
      </header>

      {cards.length === 0 ? (
        <p className="text-sm text-ink-400">
          Empty. Redeem an experience from the Vault — the card lands here automatically.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {cards.map((c) => (
            <li key={c.id} className="card">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-gold/30 to-amber/10 mb-3 flex items-center justify-center">
                <span className="text-3xl">✦</span>
              </div>
              <h3 className="text-base font-semibold">{c.title}</h3>
              <p className="text-xs text-ink-400">{c.caption}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
