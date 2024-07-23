const Configuration = {
  extends: [
    '@commitlint/config-conventional',
    '@commitlint/config-pnpm-scopes',
  ],
  ignores: [(commit) => commit === 'Version Packages'],
  defaultIgnores: true,
};

export default Configuration;
