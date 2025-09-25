import { GetServiceDTO, ServiceDTO, DeregisterServiceDTO } from 'service-discovery-pkg';
import { NotFoundError } from 'rest-pkg';
import { logger } from 'common-loggers-pkg';

import { redis } from '@/config/db.config';
import appConfig from '@/config/app.config';

class ServiceDiscoveryService {
  async getService(data: GetServiceDTO): Promise<ServiceDTO> {
    const maxRetries = 6;
    const retryDelay = 2000; // ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const raw = await redis.get(this.serviceKey(data.service_name));

      if (raw) {
        return JSON.parse(raw) as ServiceDTO;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new NotFoundError('Service not found');
  }

  async registerService(data: ServiceDTO): Promise<void> {
    await redis.set(this.serviceKey(data.service_name), JSON.stringify(data), 'EX', appConfig.service.expiration_ttl);
  }

  async deregisterService(data: DeregisterServiceDTO): Promise<void> {
    await redis.del(this.serviceKey(data.service_name));
  }

  async serviceHeartbeat(data: ServiceDTO): Promise<void> {
    await this.registerService(data);
  }

  private serviceKey(name: string): string {
    return `service:${name}`;
  }
}

export default new ServiceDiscoveryService();
