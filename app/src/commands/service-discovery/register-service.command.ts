import { ServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage } from '@spalx/transport-pkg';

import BaseCommand from '@/commands/base.command';
import serviceDiscoveryController from '@/controllers/service-discovery.controller';

export default class RegisterServiceCommand extends BaseCommand {
  async execute(req: CorrelatedMessage<ServiceDTO>): Promise<void> {
    await serviceDiscoveryController.registerService(req);
  }
}
