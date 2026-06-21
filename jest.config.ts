import type { Config } from 'jest'

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'unit-components',
      testMatch: ['<rootDir>/tests/unit/**/*.test.tsx'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json', diagnostics: { ignoreCodes: ['TS2305', 'TS2307'] } }] },
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/unit/helpers/jest-dom-setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@prisma/client$': '<rootDir>/node_modules/.pnpm/@prisma+client@7.8.0_prisma@7.8.0_@types+react-dom@19.2.3_@types+react@19.2.17__@types+_e57e47c4932d27473d2230e0491d4260/node_modules/@prisma/client',
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
      testEnvironment: 'node',
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/tests/integration/helpers/jest-setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
}

export default config
