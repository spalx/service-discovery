import { IAppConfig } from '@/interfaces/app-config.interface';

const CONFIG_VARIABLES = ['PORT', 'HOST', 'REDIS_HOST', 'REDIS_PORT', 'SERVICE_EXPIRATION_TTL'] as const;

type ConfigEnv = Partial<Record<(typeof CONFIG_VARIABLES)[number], string>>;

function setConfigEnv(env: ConfigEnv): void {
  for (const name of CONFIG_VARIABLES) {
    Reflect.deleteProperty(process.env, name);
  }
  Object.assign(process.env, env);
}

// Loads a fresh copy of the config with exactly these variables set, since it reads process.env on import.
async function loadConfig(env: ConfigEnv): Promise<IAppConfig> {
  setConfigEnv(env);

  let config: IAppConfig | undefined;
  await jest.isolateModulesAsync(async () => {
    config = (await import('./app.config')).default;
  });
  if (!config) {
    throw new Error('app.config did not load');
  }
  return config;
}

describe('appConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    setConfigEnv(originalEnv);
  });

  describe('should_read_every_value_from_the_environment_when_it_is_set', () => {
    it('should take each value from its variable, with numbers converted', async () => {
      // Arrange
      const env: ConfigEnv = {
        PORT: '4099',
        HOST: 'registry',
        REDIS_HOST: 'registry-redis',
        REDIS_PORT: '6380',
        SERVICE_EXPIRATION_TTL: '60',
      };

      // Act
      const config = await loadConfig(env);

      // Assert
      expect(config).toEqual({
        app: { port: 4099, host: 'registry' },
        redis: { host: 'registry-redis', port: 6380 },
        service: { expiration_ttl: 60 },
      });
    });
  });

  describe('should_fall_back_to_the_default_hosts_when_they_are_not_set', () => {
    it('should use the default hosts when HOST and REDIS_HOST are unset', async () => {
      const config = await loadConfig({ PORT: '3099', REDIS_PORT: '6379', SERVICE_EXPIRATION_TTL: '35' });

      expect(config.app.host).toBe('service-discovery');
      expect(config.redis.host).toBe('service-discovery-redis');
    });

    it('should use the default hosts when HOST and REDIS_HOST are empty', async () => {
      const config = await loadConfig({ HOST: '', REDIS_HOST: '' });

      expect(config.app.host).toBe('service-discovery');
      expect(config.redis.host).toBe('service-discovery-redis');
    });
  });

  describe('should_read_a_missing_number_as_not_a_number_when_its_variable_is_unset', () => {
    it('should have no default for the ports or the expiry', async () => {
      const config = await loadConfig({});

      expect(config.app.port).toBeNaN();
      expect(config.redis.port).toBeNaN();
      expect(config.service.expiration_ttl).toBeNaN();
    });
  });

  it('should be frozen', async () => {
    const config = await loadConfig({ PORT: '3099' });

    expect(Object.isFrozen(config)).toBe(true);
  });
});
