import Redis from 'ioredis';

import appConfig from '@/config/app.config';

const redis = new Redis(`redis://${appConfig.redis.host}:${appConfig.redis.port}`);

export { redis };
