import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/.next/**', '**/dist/**', '**/dist-test/**', '**/next-env.d.ts', '**/playwright-report/**', 'apps/backend/src/generated/**'] },
  ...nextVitals.map((config) => config.ignores ? config : { ...config, files: ['apps/frontend/**/*.{ts,tsx}'] }),
  ...tseslint.configs.recommended,
  { files: ['apps/frontend/**/*.{ts,tsx}'], settings: { next: { rootDir: 'apps/frontend/' } } },
];
