/**
 * VIN Generator - Creates realistic synthetic VIN data
 * Deterministic based on vehicle_id for consistency
 */

class VINGenerator {
  constructor(seed) {
    this.seed = seed;
    this.random = this.seededRandom(seed);
  }

  // Seeded random number generator for consistency
  seededRandom(seed) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  // Generate hash from string for seed
  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Generate pre-1981 VIN (manufacturer-specific format)
  generatePre1981VIN(manufacturer, year, index) {
    const yearCode = year.toString().slice(-1);
    const plants = ['R', 'F', 'T', 'D', 'A'];
    const plant = plants[Math.floor(this.random() * plants.length)];
    const serial = String(100000 + index).padStart(6, '0');
    
    // Ford format: 7R01C123456
    return `${yearCode}${plant}01C${serial}`;
  }

  // Generate post-1981 VIN (ISO standard 17 chars)
  generatePost1981VIN(manufacturer, year, index) {
    const country = '1'; // USA
    const mfrCode = manufacturer.substring(0, 2).toUpperCase();
    const yearCodes = 'ABCDEFGHJKLMNPRSTVWXY123456789';
    const yearIndex = (year - 1980) % yearCodes.length;
    const yearCode = yearCodes[yearIndex];
    const plant = 'F';
    const serial = String(100000 + index).padStart(6, '0');
    
    return `${country}${mfrCode}BP40E9${yearCode}${plant}${serial}`;
  }

  // Generate realistic mileage based on age
  generateMileage(year) {
    const age = 2025 - year;
    const avgMilesPerYear = 5000 + (this.random() * 7000); // 5k-12k/year
    const baseMileage = age * avgMilesPerYear;
    
    // Distribution: 20% low, 50% medium, 25% high, 5% very high
    const roll = this.random();
    if (roll < 0.20) return Math.floor(baseMileage * 0.3); // Low
    if (roll < 0.70) return Math.floor(baseMileage * 0.8); // Medium
    if (roll < 0.95) return Math.floor(baseMileage * 1.5); // High
    return Math.floor(baseMileage * 2.5); // Very high
  }

  // Generate condition rating with realistic distribution
  generateCondition() {
    const roll = this.random();
    if (roll < 0.05) return { rating: 5, description: 'Concours' };
    if (roll < 0.20) return { rating: 4, description: 'Excellent' };
    if (roll < 0.55) return { rating: 3, description: 'Good' };
    if (roll < 0.85) return { rating: 2, description: 'Fair' };
    return { rating: 1, description: 'Project' };
  }

  // Generate registered state with geographic weighting
  generateState() {
    const states = [
      { code: 'CA', weight: 15 },
      { code: 'TX', weight: 8 },
      { code: 'FL', weight: 7 },
      { code: 'AZ', weight: 5 },
      { code: 'OH', weight: 4 },
      { code: 'MI', weight: 4 },
      { code: 'NY', weight: 3 },
      { code: 'PA', weight: 3 }
    ];
    
    const totalWeight = states.reduce((sum, s) => sum + s.weight, 0);
    let roll = this.random() * totalWeight;
    
    for (const state of states) {
      roll -= state.weight;
      if (roll <= 0) return state.code;
    }
    return 'CA';
  }

  // Generate exterior color (period-appropriate)
  generateColor(year) {
    const pre1970Colors = [
      'Wimbledon White', 'Candy Apple Red', 'Springtime Yellow',
      'Arcadian Blue', 'Ivy Gold', 'Silver Smoke Gray'
    ];
    const post1970Colors = [
      'Bright Red', 'Black', 'White', 'Silver Metallic',
      'Dark Blue Metallic', 'Green Metallic'
    ];
    
    const colors = year < 1970 ? pre1970Colors : post1970Colors;
    return colors[Math.floor(this.random() * colors.length)];
  }

  // Generate factory options
  generateOptions(conditionRating) {
    const allOptions = [
      'Power Steering',
      'Power Disc Brakes',
      'Air Conditioning',
      'GT Equipment Group',
      'Interior Decor Group',
      'Rally Pac Gauges',
      'AM/FM Radio',
      'Tinted Glass'
    ];
    
    // Better condition = more original options preserved
    const optionCount = Math.floor(conditionRating * this.random() * 3);
    const selectedOptions = [];
    
    for (let i = 0; i < optionCount && i < allOptions.length; i++) {
      const index = Math.floor(this.random() * allOptions.length);
      if (!selectedOptions.includes(allOptions[index])) {
        selectedOptions.push(allOptions[index]);
      }
    }
    
    return selectedOptions;
  }

  // Calculate value based on condition, mileage, options
  calculateValue(conditionRating, mileage, options) {
    const baseValues = {
      5: 100000,
      4: 65000,
      3: 40000,
      2: 25000,
      1: 15000
    };
    
    let value = baseValues[conditionRating];
    
    // Mileage adjustment
    if (mileage < 50000) value *= 1.2;
    else if (mileage > 150000) value *= 0.8;
    
    // Options bonus
    value += options.length * 2000;
    
    // Random variance ±10%
    value *= (0.9 + (this.random() * 0.2));
    
    return Math.floor(value);
  }

  // Generate single VIN instance
  generateInstance(vehicleData, index) {
    const { manufacturer, model, year, vehicle_id } = vehicleData;
    
    // Generate VIN
    const vin = year <= 1980 
      ? this.generatePre1981VIN(manufacturer, year, index)
      : this.generatePost1981VIN(manufacturer, year, index);
    
    // Generate correlated attributes
    const condition = this.generateCondition();
    const mileage = this.generateMileage(year);
    const state = this.generateState();
    const color = this.generateColor(year);
    const options = this.generateOptions(condition.rating);
    const value = this.calculateValue(condition.rating, mileage, options);
    
    return {
      vin,
      condition_rating: condition.rating,
      condition_description: condition.description,
      mileage,
      mileage_verified: this.random() > 0.2, // 80% verified
      registered_state: state,
      registration_status: this.random() > 0.55 ? 'Active' : 'Historic',
      title_status: this.random() > 0.1 ? 'Clean' : 'Rebuilt',
      exterior_color: color,
      factory_options: options,
      estimated_value: value,
      matching_numbers: this.random() > 0.4, // 60% matching
      last_service_date: new Date(Date.now() - (this.random() * 180 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    };
  }

  // Generate multiple instances for a vehicle
  static generateInstances(vehicleData, count = 8) {
    const seed = VINGenerator.hashString(vehicleData.vehicle_id);
    const generator = new VINGenerator(seed);
    
    const instances = [];
    for (let i = 0; i < count; i++) {
      instances.push(generator.generateInstance(vehicleData, i));
    }
    
    return instances;
  }
}

module.exports = VINGenerator;
