const Configuration = {
  extends: [
    '@commitlint/config-conventional',
    '@commitlint/config-pnpm-scopes',
  ],
  ignores: [(commit) => commit === ''],
  defaultIgnores: true,
};

export default Configuration;
