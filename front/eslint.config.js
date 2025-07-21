import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    rules: {
      // ===== RÈGLES DE QUALITÉ GÉNÉRALE =====
      "no-console": "warn",                    // Warn pour console.log (mais pas error)
      "no-debugger": "error",                  // Pas de debugger en prod
      "no-unused-vars": "off",                 // Désactivé car redondant avec TS
      "prefer-const": "error",                 // Utiliser const quand possible
      "no-var": "error",                       // Pas de var, utiliser let/const

      // ===== RÈGLES TYPESCRIPT SPÉCIFIQUES =====
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { 
          "argsIgnorePattern": "^_",           // Ignorer les args commençant par _
          "varsIgnorePattern": "^_"            // Ignorer les vars commençant par _
        }
      ],
      "@typescript-eslint/explicit-function-return-type": "warn", // Types de retour explicites
      "@typescript-eslint/no-explicit-any": "warn",               // Limiter l'usage de any
      "@typescript-eslint/no-inferrable-types": "off",            // Permettre les types explicites
      "@typescript-eslint/prefer-nullish-coalescing": "error",    // Utiliser ?? au lieu de ||
      "@typescript-eslint/prefer-optional-chain": "error",        // Utiliser ?. quand possible

      // ===== RÈGLES POUR STRUCTURES DE DONNÉES =====
      "no-magic-numbers": [
        "warn", 
        { 
          "ignore": [-1, 0, 1, 2],            // Ignorer les nombres courants
          "ignoreArrayIndexes": true,          // OK pour les index de tableau
          "ignoreDefaultValues": true          // OK pour les valeurs par défaut
        }
      ],
      "complexity": ["warn", 10],             // Limiter la complexité cyclomatique
      "max-depth": ["warn", 4],               // Limiter l'imbrication
      "max-lines-per-function": ["warn", 50], // Fonctions pas trop longues

      // ===== RÈGLES DE STYLE ET LISIBILITÉ =====
      "camelcase": ["error", { "properties": "always" }],
      "prefer-template": "error",              // Utiliser template literals
      "object-shorthand": "error",             // Propriétés courtes d'objets
      "arrow-spacing": "error",                // Espaces autour des flèches
      "comma-dangle": ["error", "never"],      // Pas de virgules traînantes
      "semi": ["error", "always"],             // Points-virgules obligatoires
      "quotes": ["error", "single"],           // Guillemets simples

      // ===== RÈGLES POUR ALGORITHMES CRDT =====
      "no-param-reassign": "error",            // Pas de mutation des paramètres
      "no-return-assign": "error",             // Pas d'assignation dans return
      "eqeqeq": "error",                       // === au lieu de ==
      "no-implicit-coercion": "error",         // Conversions explicites

      // ===== RÈGLES SPÉCIFIQUES AUX TESTS =====
      "@typescript-eslint/no-empty-function": [
        "error",
        { "allow": ["arrowFunctions", "methods"] }
      ]
    }
  },
  {
    // Configuration spéciale pour les fichiers de test
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "no-magic-numbers": "off",               // OK dans les tests
      "max-lines-per-function": "off",         // Tests peuvent être longs
      "@typescript-eslint/no-explicit-any": "off", // any OK dans les tests
      "no-console": "off"                      // console.log OK dans les tests
    }
  }
];
