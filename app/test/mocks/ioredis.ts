// Replaces ioredis in tests. The real client opens a socket as soon as it is constructed and keeps
// reconnecting, so no test can reach a Redis server. A command the fake doesn't define is not a function.
export default class Redis {
  readonly url: string | undefined;

  get = jest.fn<Promise<string | null>, [string]>().mockResolvedValue(null);
  set = jest.fn<Promise<'OK'>, unknown[]>().mockResolvedValue('OK');
  del = jest.fn<Promise<number>, string[]>().mockResolvedValue(1);

  constructor(url?: string) {
    this.url = url;
  }
}
