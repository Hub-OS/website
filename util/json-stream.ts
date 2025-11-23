export async function* streamJson(source: AsyncGenerator<any>) {
  let next;

  for await (const chunk of source) {
    if (next) {
      yield next + ",";
    } else {
      yield "[";
    }

    next = JSON.stringify(chunk);
  }

  if (!next) {
    next = "[";
  }

  yield next + "]";
}
