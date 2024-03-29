import { Err, Ok, Result } from "./result";

let fetch = globalThis.fetch;

export async function requestJSON(
  uri: string,
  init?: RequestInit | undefined
): Promise<Result<any, string>> {
  try {
    const res = await fetch(uri, init);

    if (res.status != 200) {
      return Err(await res.text());
    }

    return Ok(await res.json());
  } catch (err) {
    return Err(String(err));
  }
}

export async function requestVoid(
  uri: string,
  init?: RequestInit | undefined
): Promise<Result<void, string>> {
  try {
    const res = await fetch(uri, init);

    if (res.status != 200) {
      return Err(await res.text());
    }

    return Ok(undefined);
  } catch (err) {
    return Err(String(err));
  }
}
