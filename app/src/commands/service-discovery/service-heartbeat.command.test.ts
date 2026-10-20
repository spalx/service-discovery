import { ServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage, TransportAdapterName } from '@spalx/transport-pkg';

import serviceDiscoveryController from '@/controllers/service-discovery.controller';
import ServiceHeartbeatCommand from './service-heartbeat.command';

jest.mock('@/controllers/service-discovery.controller', () => ({
  __esModule: true,
  default: {
    getService: jest.fn(),
    registerService: jest.fn(),
    deregisterService: jest.fn(),
    serviceHeartbeat: jest.fn(),
  },
}));

const OTHER_METHODS = (['getService', 'registerService', 'deregisterService', 'serviceHeartbeat'] as const).filter(
  (method) => method !== 'serviceHeartbeat'
);

function buildRequest(): CorrelatedMessage<ServiceDTO> {
  return CorrelatedMessage.create(
    'c0ffee00-0000-4000-8000-000000000001',
    'serviceHeartbeat',
    TransportAdapterName.HTTP,
    { service_name: 'iam', host: 'iam', port: 3002 }
  );
}

describe('ServiceHeartbeatCommand - execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the whole request to the controller', async () => {
    // Arrange
    const req = buildRequest();

    // Act
    await new ServiceHeartbeatCommand().execute(req);

    // Assert
    expect(jest.mocked(serviceDiscoveryController.serviceHeartbeat).mock.calls).toEqual([[req]]);
    for (const method of OTHER_METHODS) {
      expect(serviceDiscoveryController[method]).not.toHaveBeenCalled();
    }
  });

  it('should resolve with nothing', async () => {
    const req = buildRequest();

    await expect(new ServiceHeartbeatCommand().execute(req)).resolves.toBeUndefined();
  });

  it('should pass a controller error through', async () => {
    const error = new Error('service_name cannot be empty');
    jest.mocked(serviceDiscoveryController.serviceHeartbeat).mockRejectedValueOnce(error);
    const req = buildRequest();

    await expect(new ServiceHeartbeatCommand().execute(req)).rejects.toBe(error);
  });
});
