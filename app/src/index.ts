import { logger } from 'common-loggers-pkg';
import { appService } from 'app-life-cycle-pkg';

import app from './app';

async function startServer(): Promise<void> {
  try {
    logger.info('Starting service-discovery service');

    await appService.run(app);

    logger.info('service-discovery service running');
  } catch (error) {
    logger.error('Failed to start service-discovery service', error);
    process.exit(1);
  }
}

startServer();
