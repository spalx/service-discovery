import { IAppConfig } from '@/interfaces/app-config.interface';

const appConfig: IAppConfig = {
  app: {
    port: Number(process.env.PORT),
    host: process.env.HOST || 'service-discovery',
  },
  redis: {
    host: process.env.REDIS_HOST || 'service-discovery-redis',
    port: Number(process.env.REDIS_PORT),
  },
  service: {
    expiration_ttl: Number(process.env.SERVICE_EXPIRATION_TTL),
  },
};

export default Object.freeze(appConfig);
