module.exports = {
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{json,ico,html,png,jpg,svg,js,css}'
  ],
  swDest: 'build/service-worker.js',
  swSrc: 'src/service-worker.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
};
