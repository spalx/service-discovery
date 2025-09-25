import { DeregisterServiceDTO } from 'service-discovery-pkg';
import { CorrelatedMessage } from 'transport-pkg';

import BaseCommand from '@/commands/base.command';
import serviceDiscoveryController from '@/controllers/service-discovery.controller';

export default class DeregisterServiceCommand extends BaseCommand {
  async execute(req: CorrelatedMessage<DeregisterServiceDTO>): Promise<void> {
    await serviceDiscoveryController.deregisterService(req);
  }
}
