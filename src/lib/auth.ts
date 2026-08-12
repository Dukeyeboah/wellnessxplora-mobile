/**
 * TypeScript fallback for `@/lib/auth` imports.
 * At runtime Metro uses auth.native.ts or auth.web.ts instead.
 */
export { auth } from '@/lib/auth.web';
