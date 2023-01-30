const signals = [
  'SIGNIT',
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGBREAK',
  'SIGWINCH',
  'uncaughtException',
  'exit'
] as const;

export { signals };
