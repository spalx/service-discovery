import { GetServiceDTO, ServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage } from '@spalx/transport-pkg';

import BaseCommand from '@/commands/base.command';
import serviceDiscoveryController from '@/controllers/service-discovery.controller';

export default class GetServiceCommand extends BaseCommand {
  async execute(req: CorrelatedMessage<GetServiceDTO>): Promise<ServiceDTO> {
    return await serviceDiscoveryController.getService(req);
  }
}
