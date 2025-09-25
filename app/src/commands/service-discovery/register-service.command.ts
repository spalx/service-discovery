import { ServiceDTO } from 'service-discovery-pkg';
import { CorrelatedMessage } from 'transport-pkg';

import BaseCommand from '@/commands/base.command';
import serviceDiscoveryController from '@/controllers/service-discovery.controller';

export default class RegisterServiceCommand extends BaseCommand {
  async execute(req: CorrelatedMessage<ServiceDTO>): Promise<void> {
    await serviceDiscoveryController.registerService(req);
  }
}
