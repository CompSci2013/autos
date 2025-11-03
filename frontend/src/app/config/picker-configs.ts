/**
 * Picker Configurations
 *
 * Central location for all picker configurations.
 * These configurations are registered with PickerConfigService at app startup.
 */

import { PickerConfig } from '../shared/models/picker-config.model';

/**
 * Manufacturer-Model Picker Row Interface
 */
export interface ManufacturerModelPickerRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string; // "Manufacturer|Model"
}

/**
 * VIN Picker Row Interface
 */
export interface VinPickerRow {
  vin: string;
  manufacturer?: string; // NEW: For VIN browser
  model?: string; // NEW: For VIN browser
  year?: number; // NEW: For VIN browser
  body_class?: string; // NEW: For VIN browser
  vehicle_id?: string; // NEW: Link to vehicle spec
  condition_rating: number;
  condition_description: string;
  mileage: number;
  mileage_verified: boolean;
  registered_state: string;
  registration_status: string;
  title_status: string;
  exterior_color: string;
  factory_options: string[];
  estimated_value: number;
  matching_numbers: boolean;
  last_service_date: string;
  key: string; // VIN
}

/**
 * Manufacturer-Model Picker Configuration
 *
 * Features:
 * - Client-side pagination (loads all ~200 combinations at once)
 * - Client-side filtering and sorting
 * - Data caching enabled (rarely changes)
 * - URL param: modelCombos
 */
export const MANUFACTURER_MODEL_PICKER_CONFIG: PickerConfig<ManufacturerModelPickerRow> = {
  id: 'manufacturer-model',
  displayName: 'Manufacturer & Model Picker',

  columns: [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '50%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
    {
      key: 'model',
      label: 'Model',
      width: '35%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
    {
      key: 'count',
      label: 'Count',
      width: '15%',
      sortable: true,
      filterable: false,
      hideable: false,
    },
  ],

  api: {
    method: 'getManufacturerModelCombinations',
    paramMapper: () => ({
      page: 1,
      size: 100, // Load all at once for client-side filtering
    }),
    responseTransformer: (response: any) => {
      // Transform hierarchical API response to flat rows
      console.log('[PICKER CONFIG] responseTransformer called with:', response);

      // Defensive check
      if (!response || !response.data) {
        console.error('[PICKER CONFIG] Invalid response structure:', response);
        return { results: [], total: 0, page: 1, size: 0, totalPages: 0 };
      }

      const flatRows: ManufacturerModelPickerRow[] = [];
      response.data.forEach((mfr: any) => {
        mfr.models.forEach((model: any) => {
          flatRows.push({
            manufacturer: mfr.manufacturer,
            model: model.model,
            count: model.count,
            key: `${mfr.manufacturer}|${model.model}`,
          });
        });
      });

      // Sort by manufacturer, then model
      flatRows.sort((a, b) => {
        const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
        return mfrCompare !== 0 ? mfrCompare : a.model.localeCompare(b.model);
      });

      return {
        results: flatRows,
        total: flatRows.length,
        page: 1,
        size: flatRows.length,
        totalPages: 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => {
      if (!row || !row.manufacturer || !row.model) {
        console.warn('[PICKER CONFIG] keyGenerator called with invalid row:', row);
        return 'invalid-key';
      }
      return `${row.manufacturer}|${row.model}`;
    },
    keyParser: (key) => {
      const [manufacturer, model] = key.split('|');
      return { manufacturer, model, key } as Partial<ManufacturerModelPickerRow>;
    },
  },

  selection: {
    urlParam: 'modelCombos',
    serializer: (selections) => {
      return selections
        .map((s) => `${s.manufacturer}:${s.model}`)
        .join(',');
    },
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue
        .split(',')
        .filter((combo) => combo && combo.includes(':')) // Filter out empty/invalid combos
        .map((combo) => {
          const [manufacturer, model] = combo.split(':');
          // Skip if either is missing
          if (!manufacturer || !model) {
            console.warn('[PICKER CONFIG] Invalid combo in URL:', combo);
            return null;
          }
          return {
            manufacturer,
            model,
            count: 0,
            key: `${manufacturer}|${model}`,
          } as ManufacturerModelPickerRow;
        })
        .filter((item) => item !== null) as ManufacturerModelPickerRow[]; // Remove nulls
    },
  },

  filtering: {
    filters: {
      manufacturer: (row, value) =>
        row.manufacturer.toLowerCase().includes(String(value).toLowerCase()),
      model: (row, value) =>
        row.model.toLowerCase().includes(String(value).toLowerCase()),
    },
  },

  sorting: {
    comparators: {
      manufacturer: (a, b) => a.manufacturer.localeCompare(b.manufacturer),
      model: (a, b) => a.model.localeCompare(b.model),
      count: (a, b) => a.count - b.count,
    },
  },

  caching: {
    enabled: true,
    ttl: 0, // Cache forever (manufacturer-model data rarely changes)
  },

  pagination: {
    mode: 'client', // ✅ Client-side: Load all ~200 combinations once
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};

/**
 * VIN Picker Configuration
 *
 * Features:
 * - Server-side pagination (could be 10,000+ VINs per vehicle)
 * - Context-aware (requires vehicleId in context)
 * - No caching (data is context-specific)
 * - URL param: selectedVins
 */
export const VIN_PICKER_CONFIG: PickerConfig<VinPickerRow> = {
  id: 'vin-picker',
  displayName: 'VIN Instance Picker',

  columns: [
    {
      key: 'vin',
      label: 'VIN',
      width: '18%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'vin',
    },
    {
      key: 'registered_state',
      label: 'State',
      width: '8%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'registered_state',
    },
    {
      key: 'exterior_color',
      label: 'Color',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'exterior_color',
    },
    {
      key: 'mileage',
      label: 'Mileage',
      width: '10%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'mileage',
    },
    {
      key: 'condition_description',
      label: 'Condition',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'condition_description',
    },
    {
      key: 'title_status',
      label: 'Title',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'title_status',
    },
    {
      key: 'estimated_value',
      label: 'Est. Value',
      width: '12%',
      sortable: true,
      filterable: false,
      hideable: true,
      valuePath: 'estimated_value',
    },
  ],

  api: {
    method: 'getVehicleInstances',
    paramMapper: (params) => {
      // VIN picker requires vehicleId from context
      // Server-side pagination: pass page and size to API
      const vehicleId = params.filters?.['vehicleId'];
      if (!vehicleId) {
        throw new Error('[VIN Picker] vehicleId is required in context');
      }

      return {
        vehicleId,
        count: params.size, // Request specific page size
        // Note: Current API doesn't support page offset, loads all instances
        // Future enhancement: Add page parameter when API supports it
      };
    },
    responseTransformer: (response: any) => {
      // API returns VehicleInstancesResponse with instances array
      const rows: VinPickerRow[] = response.instances.map((instance: any) => ({
        vin: instance.vin,
        condition_rating: instance.condition_rating,
        condition_description: instance.condition_description,
        mileage: instance.mileage,
        mileage_verified: instance.mileage_verified,
        registered_state: instance.registered_state,
        registration_status: instance.registration_status,
        title_status: instance.title_status,
        exterior_color: instance.exterior_color,
        factory_options: instance.factory_options,
        estimated_value: instance.estimated_value,
        matching_numbers: instance.matching_numbers,
        last_service_date: instance.last_service_date,
        key: instance.vin,
      }));

      return {
        results: rows,
        total: response.instance_count, // Total VINs for this vehicle
        page: 1, // API doesn't support pagination yet
        size: rows.length,
        totalPages: 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key, key } as Partial<VinPickerRow>),
  },

  selection: {
    urlParam: 'selectedVins',
    serializer: (selections) => selections.map((s) => s.vin).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map((vin) => ({
        vin,
        key: vin,
      }) as VinPickerRow);
    },
  },

  // No filtering/sorting config (server-side mode)
  // Future enhancement: Add when API supports server-side filtering

  caching: {
    enabled: false, // VIN instances are context-specific, don't cache
    ttl: 0,
  },

  pagination: {
    mode: 'server', // ✅ Server-side: Could be thousands of VINs
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};

/**
 * VIN Browser Configuration (NEW)
 *
 * Features:
 * - Browse ALL VINs (not context-specific)
 * - Server-side pagination (~1,835 total VINs)
 * - Filtering by manufacturer, model, year, body class, mileage, value
 * - No caching (data updates frequently)
 * - URL param: selectedVinsBrowser
 */
export const VIN_BROWSER_CONFIG: PickerConfig<VinPickerRow> = {
  id: 'vin-browser',
  displayName: 'VIN Browser',

  columns: [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'manufacturer',
    },
    {
      key: 'model',
      label: 'Model',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'model',
    },
    {
      key: 'year',
      label: 'Year',
      width: '8%',
      sortable: true,
      filterable: true,
      filterType: 'number',
      hideable: false,
      valuePath: 'year',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'body_class',
    },
    {
      key: 'vin',
      label: 'VIN',
      width: '14%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'vin',
    },
    {
      key: 'mileage',
      label: 'Mileage',
      width: '8%',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'mileage',
      formatter: (value) => value?.toLocaleString() || '-',
      rangeConfig: {
        min: 0,
        max: 300000,
        step: 5000,
        marks: {
          0: '0',
          75000: '75K',
          150000: '150K',
          225000: '225K',
          300000: '300K'
        }
      }
    },
    {
      key: 'estimated_value',
      label: 'Est. Value',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'number-range',
      hideable: true,
      valuePath: 'estimated_value',
      formatter: (value) => value ? `$${value.toLocaleString()}` : '-',
      rangeConfig: {
        min: 0,
        max: 200000,
        step: 5000,
        marks: {
          0: '$0',
          50000: '$50K',
          100000: '$100K',
          150000: '$150K',
          200000: '$200K'
        }
      }
    },
    {
      key: 'condition_description',
      label: 'Condition',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'condition_description',
    },
    {
      key: 'registered_state',
      label: 'State',
      width: '6%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'registered_state',
    },
    {
      key: 'exterior_color',
      label: 'Color',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
      valuePath: 'exterior_color',
    },
  ],

  api: {
    method: 'getAllVins',
    paramMapper: (params) => {
      // Map column filter keys (snake_case) to API parameters (camelCase)
      const mappedFilters: any = {};
      if (params.filters) {
        // Direct mappings
        if (params.filters['manufacturer']) mappedFilters.manufacturer = params.filters['manufacturer'];
        if (params.filters['model']) mappedFilters.model = params.filters['model'];
        if (params.filters['year']) mappedFilters.yearMin = mappedFilters.yearMax = params.filters['year'];
        if (params.filters['vin']) mappedFilters.vin = params.filters['vin'];

        // Range filters: Use individual min/max values
        if (params.filters['mileageMin'] !== undefined) mappedFilters.mileageMin = params.filters['mileageMin'];
        if (params.filters['mileageMax'] !== undefined) mappedFilters.mileageMax = params.filters['mileageMax'];
        if (params.filters['estimated_valueMin'] !== undefined) mappedFilters.valueMin = params.filters['estimated_valueMin'];
        if (params.filters['estimated_valueMax'] !== undefined) mappedFilters.valueMax = params.filters['estimated_valueMax'];

        // Snake_case to camelCase mappings
        if (params.filters['body_class']) mappedFilters.bodyClass = params.filters['body_class'];
        if (params.filters['condition_description']) mappedFilters.conditionDescription = params.filters['condition_description'];
        if (params.filters['registered_state']) mappedFilters.registeredState = params.filters['registered_state'];
        if (params.filters['exterior_color']) mappedFilters.exteriorColor = params.filters['exterior_color'];
      }

      return {
        page: params.page || 1,
        size: params.size || 20,
        filters: mappedFilters,
        sortBy: params.sortBy || 'vin',
        sortOrder: params.sortOrder || 'asc',
      };
    },
    responseTransformer: (response: any) => {
      // API returns { total, instances, pagination }
      const rows: VinPickerRow[] = response.instances.map((instance: any) => ({
        vin: instance.vin,
        manufacturer: instance.manufacturer,
        model: instance.model,
        year: instance.year,
        body_class: instance.body_class,
        vehicle_id: instance.vehicle_id,
        condition_rating: instance.condition_rating,
        condition_description: instance.condition_description,
        mileage: instance.mileage,
        mileage_verified: instance.mileage_verified,
        registered_state: instance.registered_state,
        registration_status: instance.registration_status,
        title_status: instance.title_status,
        exterior_color: instance.exterior_color,
        factory_options: instance.factory_options,
        estimated_value: instance.estimated_value,
        matching_numbers: instance.matching_numbers,
        last_service_date: instance.last_service_date,
        key: instance.vin,
      }));

      return {
        results: rows,
        total: response.total, // Total VINs across all pages
        page: response.pagination.page,
        size: response.pagination.size,
        totalPages: response.pagination.totalPages,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key, key } as Partial<VinPickerRow>),
  },

  selection: {
    urlParam: 'selectedVinsBrowser',
    serializer: (selections) => selections.map((s) => s.vin).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map((vin) => ({
        vin,
        key: vin,
      }) as VinPickerRow);
    },
  },

  filtering: {
    filters: {
      manufacturer: (row, value) =>
        row.manufacturer?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      model: (row, value) =>
        row.model?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      year: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.year === numValue;
      },
      body_class: (row, value) =>
        row.body_class?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      vin: (row, value) =>
        row.vin?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      mileage: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.mileage === numValue;
      },
      estimated_value: (row, value) => {
        const numValue = Number(value);
        return isNaN(numValue) ? true : row.estimated_value === numValue;
      },
      condition_description: (row, value) =>
        row.condition_description?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      registered_state: (row, value) =>
        row.registered_state?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
      exterior_color: (row, value) =>
        row.exterior_color?.toLowerCase().includes(String(value).toLowerCase()) ?? false,
    },
  },

  sorting: {
    comparators: {
      manufacturer: (a, b) => (a.manufacturer ?? '').localeCompare(b.manufacturer ?? ''),
      model: (a, b) => (a.model ?? '').localeCompare(b.model ?? ''),
      year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
      body_class: (a, b) => (a.body_class ?? '').localeCompare(b.body_class ?? ''),
      vin: (a, b) => a.vin.localeCompare(b.vin),
      mileage: (a, b) => a.mileage - b.mileage,
      estimated_value: (a, b) => a.estimated_value - b.estimated_value,
      condition_description: (a, b) => a.condition_description.localeCompare(b.condition_description),
      registered_state: (a, b) => a.registered_state.localeCompare(b.registered_state),
      exterior_color: (a, b) => a.exterior_color.localeCompare(b.exterior_color),
    },
  },

  caching: {
    enabled: false, // VIN data updates frequently, don't cache
    ttl: 0,
  },

  pagination: {
    mode: 'server', // ✅ Server-side: ~1,835 VINs total
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};

/**
 * All picker configurations
 * Export as array for bulk registration
 */
export const ALL_PICKER_CONFIGS: PickerConfig<any>[] = [
  MANUFACTURER_MODEL_PICKER_CONFIG,
  VIN_PICKER_CONFIG,
  VIN_BROWSER_CONFIG,
];
