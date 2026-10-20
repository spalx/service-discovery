import { ServiceDTO } from '@spalx/service-discovery-pkg';
import { NotFoundError } from '@spalx/rest-pkg';

import { redis } from '@/config/db.config';
import serviceDiscoveryService from './service-discovery.service';

const RETRY_DELAY_MS = 2000;
const MAX_READS = 6;

function buildService(overrides: Partial<ServiceDTO> = {}): ServiceDTO {
  return { service_name: 'iam', host: 'iam', port: 3002, ...overrides };
}

describe('ServiceDiscoveryService - getService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(redis.get).mockReset().mockResolvedValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('should_return_the_registered_entry_when_the_service_is_registered', () => {
    it('should return the stored entry from the first read without waiting', async () => {
      // Arrange
      const service = buildService();
      jest.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(service));

      // Act
      const result = await serviceDiscoveryService.getService({ service_name: 'iam' });

      // Assert
      expect(result).toEqual(service);
      expect(redis.get).toHaveBeenCalledTimes(1);
      expect(redis.get).toHaveBeenCalledWith('service:iam');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should read the key built from the requested service name', async () => {
      jest.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(buildService({ service_name: 'audit-log' })));

      await serviceDiscoveryService.getService({ service_name: 'audit-log' });

      expect(redis.get).toHaveBeenCalledWith('service:audit-log');
    });
  });

  describe('should_wait_and_read_again_when_the_service_is_not_registered_yet', () => {
    it('should return the entry once it appears, after two seconds per miss', async () => {
      // Arrange
      const service = buildService();
      jest
        .mocked(redis.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(service));
      const onResult = jest.fn();

      // Act
      const pending = serviceDiscoveryService.getService({ service_name: 'iam' }).then(onResult);
      await jest.advanceTimersByTimeAsync(2 * RETRY_DELAY_MS - 1);

      // Assert
      expect(redis.get).toHaveBeenCalledTimes(2);
      expect(onResult).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await pending;
      expect(redis.get).toHaveBeenCalledTimes(3);
      expect(onResult).toHaveBeenCalledWith(service);
    });

    it('should return the entry found on the sixth and last read', async () => {
      const service = buildService();
      for (let read = 1; read < MAX_READS; read++) {
        jest.mocked(redis.get).mockResolvedValueOnce(null);
      }
      jest.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(service));

      const pending = serviceDiscoveryService.getService({ service_name: 'iam' });
      await jest.advanceTimersByTimeAsync((MAX_READS - 1) * RETRY_DELAY_MS);

      await expect(pending).resolves.toEqual(service);
      expect(redis.get).toHaveBeenCalledTimes(MAX_READS);
    });
  });

  describe('should_throw_not_found_when_every_read_misses', () => {
    it('should reject with NotFoundError after six reads and ten seconds', async () => {
      // Arrange
      const settled = jest.fn();

      // Act
      const pending = serviceDiscoveryService.getService({ service_name: 'iam' });
      pending.catch(() => undefined).finally(settled);
      await jest.advanceTimersByTimeAsync((MAX_READS - 1) * RETRY_DELAY_MS - 1);

      // Assert
      expect(settled).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      await expect(pending).rejects.toThrow(NotFoundError);
      await expect(pending).rejects.toThrow('Service not found');
      expect(redis.get).toHaveBeenCalledTimes(MAX_READS);
    });

    it('should not wait after the last read', async () => {
      const pending = serviceDiscoveryService.getService({ service_name: 'iam' });
      const outcome = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync((MAX_READS - 1) * RETRY_DELAY_MS);

      expect(await outcome).toBeInstanceOf(NotFoundError);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should treat an empty stored value as not registered', async () => {
      jest.mocked(redis.get).mockResolvedValue('');

      const outcome = serviceDiscoveryService.getService({ service_name: 'iam' }).catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync((MAX_READS - 1) * RETRY_DELAY_MS);

      expect(await outcome).toBeInstanceOf(NotFoundError);
      expect(redis.get).toHaveBeenCalledTimes(MAX_READS);
    });
  });

  describe('should_pass_errors_through_when_redis_fails', () => {
    it('should reject with the Redis error without retrying', async () => {
      const error = new Error('Connection is closed.');
      jest.mocked(redis.get).mockRejectedValueOnce(error);

      await expect(serviceDiscoveryService.getService({ service_name: 'iam' })).rejects.toBe(error);
      expect(redis.get).toHaveBeenCalledTimes(1);
    });

    it('should reject when the stored entry is not valid JSON', async () => {
      jest.mocked(redis.get).mockResolvedValueOnce('not json');

      await expect(serviceDiscoveryService.getService({ service_name: 'iam' })).rejects.toThrow(SyntaxError);
    });
  });
});

describe('ServiceDiscoveryService - registerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_store_the_entry_with_the_configured_expiry_when_a_service_registers', () => {
    it('should send one SET of the service key with the entry as JSON and a 35-second expiry', async () => {
      // Arrange
      const service = buildService();

      // Act
      await serviceDiscoveryService.registerService(service);

      // Assert
      expect(jest.mocked(redis.set).mock.calls).toEqual([['service:iam', JSON.stringify(service), 'EX', 35]]);
    });

    it('should store the entry exactly as it was received', async () => {
      const service = { ...buildService(), version: '1.0.4' } as ServiceDTO;

      await serviceDiscoveryService.registerService(service);

      expect(redis.set).toHaveBeenCalledWith('service:iam', JSON.stringify(service), 'EX', 35);
    });
  });

  it('should pass a Redis error through', async () => {
    const error = new Error('OOM command not allowed');
    jest.mocked(redis.set).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryService.registerService(buildService())).rejects.toBe(error);
  });
});

describe('ServiceDiscoveryService - serviceHeartbeat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should store the entry again with a fresh expiry', async () => {
    // Arrange
    const service = buildService({ host: 'iam-2', port: 3012 });

    // Act
    await serviceDiscoveryService.serviceHeartbeat(service);

    // Assert
    expect(jest.mocked(redis.set).mock.calls).toEqual([['service:iam', JSON.stringify(service), 'EX', 35]]);
  });

  it('should pass a Redis error through', async () => {
    const error = new Error('Connection is closed.');
    jest.mocked(redis.set).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryService.serviceHeartbeat(buildService())).rejects.toBe(error);
  });
});

describe('ServiceDiscoveryService - deregisterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send one DEL of the service key', async () => {
    // Act
    await serviceDiscoveryService.deregisterService({ service_name: 'iam' });

    // Assert
    expect(jest.mocked(redis.del).mock.calls).toEqual([['service:iam']]);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('should succeed when the service was not registered', async () => {
    jest.mocked(redis.del).mockResolvedValueOnce(0);

    await expect(serviceDiscoveryService.deregisterService({ service_name: 'iam' })).resolves.toBeUndefined();
  });

  it('should pass a Redis error through', async () => {
    const error = new Error('Connection is closed.');
    jest.mocked(redis.del).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryService.deregisterService({ service_name: 'iam' })).rejects.toBe(error);
  });
});
