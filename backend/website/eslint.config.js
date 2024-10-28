// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
    {
        files: ["**/*.ts"],
        ignores: ["schema-gen/", "dist"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
        ],
        rules: {
            "@/quotes": [
                "warn",
                "double",
                {
                    "avoidEscape": true,
                    "allowTemplateLiterals": true
                }
            ],
            "@/indent": ["error", 4]
        },
    }
);
