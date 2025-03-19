const Configuration = {
  extends: ["@commitlint/config-conventional"],
  ignores: [(commit) => commit.includes("Version Packages")],
  defaultIgnores: true,
};

export default Configuration;
