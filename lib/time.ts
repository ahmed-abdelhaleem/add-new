export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isBefore11am(d: Date = new Date()): boolean {
  return d.getHours() < 11;
}
