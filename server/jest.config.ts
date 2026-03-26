const sharedTransform = {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      types: ['jest', 'node'],
    },
  }],
};

export default {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: [
        '<rootDir>/tests/*.test.ts',
        '<rootDir>/tests/unit/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 10000,
      transform: sharedTransform,
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 60000,
      maxWorkers: 1,
      transform: sharedTransform,
    },
  ],
};
