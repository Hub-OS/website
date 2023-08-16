import { Err, Ok, Result } from "./result";

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
