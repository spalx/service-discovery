import { GetServiceDTO, ServiceDTO } from 'service-discovery-pkg';
import { CorrelatedMessage } from 'transport-pkg';

import BaseCommand from '@/commands/base.command';
import serviceDiscoveryController from '@/controllers/service-discovery.controller';

export default class GetServiceCommand extends BaseCommand {
  async execute(req: CorrelatedMessage<GetServiceDTO>): Promise<ServiceDTO> {
    return await serviceDiscoveryController.getService(req);
  }
}
