import { IAppPkg, AppRunPriority } from 'app-life-cycle-pkg';
import { transportService, TransportAdapterName, CorrelatedMessage } from 'transport-pkg';
import { HTTPTransportAdapter } from 'http-transport-adapter';
import { ServiceDiscoveryAction } from 'service-discovery-pkg';

import appConfig from '@/config/app.config';
import BaseCommand from '@/commands/base.command';
import { GetServiceCommand, RegisterServiceCommand, DeregisterServiceCommand, ServiceHeartbeatCommand } from '@/commands/service-discovery';
import serviceDiscoveryService from '@/services/service-discovery.service';

class App implements IAppPkg {
  private httpTransportAdapter: HTTPTransportAdapter;

  constructor() {
    this.httpTransportAdapter = new HTTPTransportAdapter(appConfig.app.port);

    transportService.registerTransport(TransportAdapterName.HTTP, this.httpTransportAdapter);

    this.setActionHandlers();
  }

  getPriority(): number {
    return AppRunPriority.High;
  }

  getName(): string {
    return 'service-discovery';
  }

  getDependencies(): IAppPkg[] {
    return [
      transportService,
      this.httpTransportAdapter
    ];
  }

  private setActionHandlers() {
    this.setActionHandler(ServiceDiscoveryAction.GetService, new GetServiceCommand());
    this.setActionHandler(ServiceDiscoveryAction.RegisterService, new RegisterServiceCommand(), false);
    this.setActionHandler(ServiceDiscoveryAction.DeregisterService, new DeregisterServiceCommand(), false);
    this.setActionHandler(ServiceDiscoveryAction.ServiceHeartbeat, new ServiceHeartbeatCommand(), false);
  }

  private setActionHandler(action: string, cmd: BaseCommand, returns = true): void {
    transportService.setActionHandler(action, async (req: CorrelatedMessage) => {
      const res = await cmd.execute(req);
      return returns ? res as object : {};
    });
  }
}

export default new App();
