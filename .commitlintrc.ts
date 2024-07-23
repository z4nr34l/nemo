const Configuration = {
  extends: [
    '@commitlint/config-conventional',
    '@commitlint/config-pnpm-scopes',
  ],
  ignores: [(commit) => commit.includes('Version Packages')],
  defaultIgnores: true,
};

export default Configuration;
