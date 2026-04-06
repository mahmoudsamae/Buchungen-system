import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "out/**", "node_modules/**"]
  },
  {
    rules: {
      // React Compiler lint: valid patterns (sync from props / fetch on mount) still use setState in effects across this codebase.
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
