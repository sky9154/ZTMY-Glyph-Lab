import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";


const importSpacing = {
  meta: {
    type: "layout",
    schema: [],
    messages: {
      spacing: "Leave two blank lines after the final import."
    }
  },
  create(context) {
    return {
      Program(node) {
        const imports = node.body.filter((statement) => statement.type === "ImportDeclaration");
        const firstDeclaration = node.body.find((statement) => statement.type !== "ImportDeclaration");

        if (imports.length === 0 || !firstDeclaration) {
          return;
        }

        const finalImport = imports[imports.length - 1];
        const blankLines = firstDeclaration.loc.start.line - finalImport.loc.end.line - 1;

        if (blankLines < 2) {
          context.report({ node: firstDeclaration, messageId: "spacing" });
        }
      }
    };
  }
};


export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      local: { rules: { "import-spacing": importSpacing } }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "local/import-spacing": "error",
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      indent: ["error", 2, { SwitchCase: 1 }]
    }
  }
);
