export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function Ok<E>(value: E): { ok: true; value: E } {
  return { ok: true, value };
}

export function Err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
