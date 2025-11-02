/**
 * Statistics data structure returned by backend API
 * Used for histogram visualizations
 */
export interface VehicleStatistics {
  // Histogram 1: Total count per manufacturer
  // Example: { "Ford": 25000, "Chevrolet": 18000, "Toyota": 15000 }
  byManufacturer: { [manufacturer: string]: number };

  // Histogram 2: Models nested within each manufacturer
  // Example: { "Ford": { "F-150": 8500, "Mustang": 3200 }, "Chevrolet": { "Silverado": 7200 } }
  modelsByManufacturer: {
    [manufacturer: string]: {
      [model: string]: number
    }
  };

  // Histogram 3: Total count per year range
  // Example: { "1990-1999": 8500, "2000-2009": 15000, "2010-2019": 22000 }
  byYearRange: { [yearRange: string]: number };

  // Histogram 4: Total count per body class
  // Example: { "Pickup": 28000, "SUV": 22000, "Sedan": 18000 }
  byBodyClass: { [bodyClass: string]: number };

  // Total count matching current search filters
  totalCount: number;
}
