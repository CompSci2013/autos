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
    keyGenerator: (row) => `${row.manufacturer}|${row.model}`,
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
      return urlValue.split(',').map((combo) => {
        const [manufacturer, model] = combo.split(':');
        return {
          manufacturer,
          model,
          count: 0,
          key: `${manufacturer}|${model}`,
        } as ManufacturerModelPickerRow;
      });
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
 * All picker configurations
 * Export as array for bulk registration
 */
export const ALL_PICKER_CONFIGS: PickerConfig<any>[] = [
  MANUFACTURER_MODEL_PICKER_CONFIG,
  VIN_PICKER_CONFIG,
];
