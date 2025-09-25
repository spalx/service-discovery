import {
  GetServiceDTO,
  GetServiceDTOSchema,
  ServiceDTO,
  ServiceDTOSchema,
  DeregisterServiceDTO,
  DeregisterServiceDTOSchema
} from 'service-discovery-pkg';
import { CorrelatedMessage, transportService } from 'transport-pkg';

import serviceDiscoveryService from '@/services/service-discovery.service';

class ServiceDiscoveryController {
  async getService(req: CorrelatedMessage<GetServiceDTO>): Promise<ServiceDTO> {
    GetServiceDTOSchema.parse(req.data);

    return await serviceDiscoveryService.getService(req.data);
  }

  async registerService(req: CorrelatedMessage<ServiceDTO>): Promise<void> {
    ServiceDTOSchema.parse(req.data);

    await serviceDiscoveryService.registerService(req.data);
  }

  async deregisterService(req: CorrelatedMessage<DeregisterServiceDTO>): Promise<void> {
    DeregisterServiceDTOSchema.parse(req.data);

    await serviceDiscoveryService.deregisterService(req.data);
  }

  async serviceHeartbeat(req: CorrelatedMessage<ServiceDTO>): Promise<void> {
    ServiceDTOSchema.parse(req.data);

    await serviceDiscoveryService.serviceHeartbeat(req.data);
  }
}

export default new ServiceDiscoveryController();
