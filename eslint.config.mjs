import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * `pnpm lint` CHUA BAO GIO xanh, va do la ly do phai sua no o day.
 *
 * Do duoc o F-1c: 113 van de, trong do 79 la loi. Nhung 68/79 la `no-undef`
 * bao `console`/`process` khong ton tai trong cac tep `.mjs` — vi cau hinh
 * khong khai bao bien toan cuc cua Node. Tuc la 68 loi GIA.
 *
 * Cai gia that: 68 loi gia dang CHE 11 loi that (`consistent-type-imports`,
 * `no-unused-vars`, `no-unused-expressions`). Khong ai doc qua duoc 68 dong vo
 * nghia de thay 11 dong co nghia, nen ket qua thuc te la khong ai chay lint,
 * va mot cong cu khong ai chay thi khong bao ve gi.
 *
 * Mot cong bao dong lien tuc thi giong nhu khong co cong.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      // Bang chung cua spike P0 — giu lai de doi chieu, khong phai ma san pham.
      'implementation/evidence/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /**
     * Tep `.mjs`/`.js` la kich ban Node: `console`, `process`, `fetch`, `URL`...
     * deu co that. Khong khai bao thi `no-undef` bao dong o moi dong.
     */
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    /**
     * `no-undef` TAT cho TypeScript — day la khuyen nghi cua chinh
     * typescript-eslint.
     *
     * Luat nay khong hieu he thong kieu: no bao dong voi ten kieu, voi
     * `namespace`, voi khai bao `declare`. Va no khong can thiet, vi `tsc`
     * bat dinh danh khong ton tai chinh xac hon — `pnpm -r typecheck` da la
     * cong do.
     */
    files: ['**/*.{ts,tsx,mts}'],
    rules: { 'no-undef': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    /**
     * Kich ban chay tay (`scripts/`, `backend/scripts/`) IN ra man hinh — do la
     * viec cua chung. `no-console` o day chi tao ra tieng on phai bo qua, va
     * tieng on phai bo qua la thu lam nguoi ta bo qua ca nhung canh bao that.
     */
    files: ['scripts/**', '*/scripts/**', '**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
);
