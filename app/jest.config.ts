import type { Config } from 'jest';

// Modules held to the coverage threshold. A module is added in the same change that adds its tests.
const COVERED_MODULES = [
  'src/app.ts',
  'src/config/app.config.ts',
  'src/services/service-discovery.service.ts',
  'src/controllers/service-discovery.controller.ts',
  'src/commands/service-discovery/get-service.command.ts',
  'src/commands/service-discovery/register-service.command.ts',
  'src/commands/service-discovery/deregister-service.command.ts',
  'src/commands/service-discovery/service-heartbeat.command.ts',
];

// Compiles each file on its own, as tsc would emit it, without type-checking (pnpm typecheck does that).
// Not SWC: its CommonJS exports break the decorator metadata of entities that import each other.
const tsTransform: Config['transform'] = {
  '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
};

const SRC_ALIAS = { '^@/(.*)$': '<rootDir>/src/$1' };

const config: Config = {
  collectCoverageFrom: COVERED_MODULES,
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
  projects: [
    {
      displayName: 'unit',
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.ts'],
      testEnvironment: 'node',
      transform: tsTransform,
      moduleNameMapper: {
        '^ioredis$': '<rootDir>/test/mocks/ioredis.ts',
        '^@spalx/common-loggers-pkg$': '<rootDir>/test/mocks/common-loggers.ts',
        ...SRC_ALIAS,
      },
      setupFiles: ['<rootDir>/test/setup/env.ts'],
      clearMocks: true,
    },
  ],
};

export default config;
