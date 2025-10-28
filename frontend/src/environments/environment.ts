export const environment = {
  production: false,
  apiUrl: 'http://transportation.minilab/api/v1',

  /**
   * Feature flag: Use generic architecture
   *
   * When false: Uses legacy ApiService implementation
   * When true: Uses new generic architecture (GenericDataService + adapters)
   *
   * This allows parallel testing and safe rollback during Phase 2.
   */
  useGenericArchitecture: true
};
