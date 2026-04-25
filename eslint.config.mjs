import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".entangle/**",
      ".turbo/**",
      "coverage/**",
      "resources/**"
    ]
  },
  {
    files: ["apps/**/*.{ts,tsx}", "services/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "apps/cli/src/*.test.ts",
            "packages/host-client/src/*.test.ts",
            "packages/package-scaffold/src/*.test.ts",
            "packages/types/src/*.test.ts",
            "packages/validator/src/*.test.ts",
            "services/host/src/*.test.ts",
            "services/runner/src/*.test.ts",
            "services/runner/src/test-fixtures.ts"
          ],
          defaultProject: "tsconfig.eslint.json",
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 32
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports"
        }
      ],
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        {
          ignoreArrowShorthand: true
        }
      ]
    }
  },
  {
    files: ["apps/studio/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true
        }
      ]
    }
  }
);
