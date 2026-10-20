import { DeregisterServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage, TransportAdapterName } from '@spalx/transport-pkg';

import serviceDiscoveryController from '@/controllers/service-discovery.controller';
import DeregisterServiceCommand from './deregister-service.command';

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
  (method) => method !== 'deregisterService'
);

function buildRequest(): CorrelatedMessage<DeregisterServiceDTO> {
  return CorrelatedMessage.create(
    'c0ffee00-0000-4000-8000-000000000001',
    'deregisterService',
    TransportAdapterName.HTTP,
    { service_name: 'iam' }
  );
}

describe('DeregisterServiceCommand - execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the whole request to the controller', async () => {
    // Arrange
    const req = buildRequest();

    // Act
    await new DeregisterServiceCommand().execute(req);

    // Assert
    expect(jest.mocked(serviceDiscoveryController.deregisterService).mock.calls).toEqual([[req]]);
    for (const method of OTHER_METHODS) {
      expect(serviceDiscoveryController[method]).not.toHaveBeenCalled();
    }
  });

  it('should resolve with nothing', async () => {
    const req = buildRequest();

    await expect(new DeregisterServiceCommand().execute(req)).resolves.toBeUndefined();
  });

  it('should pass a controller error through', async () => {
    const error = new Error('service_name cannot be empty');
    jest.mocked(serviceDiscoveryController.deregisterService).mockRejectedValueOnce(error);
    const req = buildRequest();

    await expect(new DeregisterServiceCommand().execute(req)).rejects.toBe(error);
  });
});
