module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:.*:4173',
      url: ['http://localhost:4173'],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};