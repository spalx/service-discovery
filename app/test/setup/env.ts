// Runs before any module loads, because the config files read process.env on import. Values already
// set are kept.
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3099',
  HOST: 'service-discovery',
  REDIS_HOST: 'redis.invalid',
  REDIS_PORT: '6379',
  SERVICE_EXPIRATION_TTL: '35',
};

for (const [name, value] of Object.entries(TEST_ENV)) {
  process.env[name] ??= value;
}
