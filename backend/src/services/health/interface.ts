export const HEALTH_SERVICE = Symbol('HEALTH_SERVICE');

export type ReadinessState = 'ok' | 'unavailable';

export interface CoreReadiness {
  readonly status: ReadinessState;
  readonly checks: { readonly config: boolean; readonly database: boolean };
}

/** Hop dong RA NGOAI cua module health. Tang api chi cham interface nay. */
export interface HealthService {
  live(): { status: 'ok' };
  ready(): Promise<CoreReadiness>;
}
