module.exports = {
  ci: {
    collect: {
      startServerCommand: 'HOST=127.0.0.1 PORT=4173 node dist/server/entry.mjs',
      startServerReadyPattern: 'Listening.*4173',
      url: ['http://localhost:4173'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
