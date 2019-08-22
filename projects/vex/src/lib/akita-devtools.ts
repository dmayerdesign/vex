/**
 * Adapted from https://github.com/datorama/akita/blob/master/akita/src/devtools.ts.
*/

export interface DevtoolsOptions {
  /** instance name visible in devtools */
  name: string
  /**  maximum allowed actions to be stored in the history tree */
  maxAge: number
  latency: number
  actionsBlacklist: string[]
  actionsWhitelist: string[]
  shouldCatchErrors: boolean
  logTrace: boolean
  predicate: (state: any, action: any) => boolean
  shallow: boolean
}

export const subs = []

export interface NgZoneLike { run: any }

// export function akitaDevtools(ngZone: NgZoneLike, options?: Partial<DevtoolsOptions>): void
// export function akitaDevtools(options?: Partial<DevtoolsOptions>): void
// export function akitaDevtools(ngZoneOrOptions?: NgZoneLike | Partial<DevtoolsOptions>, options: Partial<DevtoolsOptions> = {}): void {

// }
