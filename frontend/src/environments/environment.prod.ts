export const environment = {
  production: true,
  apiUrl: 'http://autos.minilab/api/v1',

  /**
   * Feature flag: Use generic architecture
   *
   * When false: Uses legacy ApiService implementation (safe default)
   * When true: Uses new generic architecture (GenericDataService + adapters)
   *
   * This allows parallel testing and safe rollback during Phase 2.
   */
  useGenericArchitecture: false
};
