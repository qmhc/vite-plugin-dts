module.exports = {
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['json', 'ts', 'js'],
  preset: 'ts-jest',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.spec.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '.*\\.tsx?': 'ts-jest'
  },
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.husky/',
    '/.git/',
    '/.yarn/',
    '/example/'
  ]
}
