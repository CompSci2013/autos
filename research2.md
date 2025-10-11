Excellent direction! Let me research what vintage automobile and restoration enthusiasts actually care about.Now let me search for what specific attributes car shows and specialty shops focus on:Let me search for what restoration enthusiasts value in vintage trucks and automobiles:Excellent research! Now let me compile all these findings into a comprehensive recommendation document.

---

## **🔧 AUTOS Project - Refined Data Requirements for Restoration Enthusiasts**

### **Target Audience Refined:**
**Amateur Auto Enthusiasts + Vintage Restoration Community (1900-Present)**

Based on extensive research of classic car shows, restoration shops, and enthusiast communities, here's what "motorheads" actually care about:

---

## **📋 BODY STYLE / "KIND" - What Enthusiasts Really Want**

Instead of "Sport/Utility/Industrial", use **authentic body style classifications**:

### **Primary Categories (from research):**

**By Era:**
- **Horseless Carriage** (pre-1916)
- **Brass Era** (1896-1915)
- **Vintage** (1919-1930)
- **Pre-War** (1931-1941)
- **Post-War** (1945-1960)
- **Classic** (1960-1980)
- **Modern Classic** (1980-2000)
- **Youngtimer** (2000-present)

**By Body Style** (what shows actually judge):
- Roadster / Convertible
- Coupe (2-door)
- Sedan (4-door)
- Station Wagon / Woody
- Pickup Truck
- Panel Truck / Delivery
- Hot Rod / Street Rod
- Rat Rod
- Resto-Mod

**By Vehicle Type** (for trucks):
- Light Duty Pickup
- Heavy Duty / Commercial
- 4x4 / Off-Road
- Panel / Delivery Van
- Flatbed / Stake Bed

---

## **🎯 CRITICAL ATTRIBUTES Enthusiasts Care About**

Based on car show judging criteria and restoration shop priorities:

### **1. Engine & Powertrain** ⭐ HIGHEST PRIORITY
- Engine Type (Flathead, OHV, DOHC, etc.)
- Cylinder Configuration (Inline-4, Inline-6, V6, V8, etc.)
- Displacement (Cubic Inches AND Liters)
- Horsepower Rating (factory)
- **Original vs Modified** status
- Carburetor vs Fuel Injection
- **Matching Numbers** indicator (huge for value!)

### **2. Transmission & Drivetrain**
- Transmission Type (3-speed manual, 4-speed, automatic, overdrive)
- Column vs Floor Shift
- Drive Type (RWD, FWD, 4WD, AWD)
- Rear Axle Ratio (for trucks/muscle cars)

### **3. Frame & Chassis**
- Body-on-Frame vs Unibody
- Frame Type (ladder, perimeter, etc.)
- Wheelbase length
- **Rust Susceptibility Rating** (critical for buyers!)

### **4. Electrical System**
- Voltage (6-volt vs 12-volt) - Major consideration for restor

ation difficulty
- Ignition Type (points, electronic)

### **5. Production Numbers & Rarity**
- Total Production Run
- Year-specific Production
- **Survival Rate** estimate (if available)
- Special Editions / Trim Levels

### **6. Restoration Classification** (100-point judging system)
- Parts Availability Rating (Easy / Moderate / Difficult)
- Restoration Cost Tier (Budget / Mid / Premium)
- **Skill Level Required** (Beginner / Intermediate / Expert)

### **7. Historical Significance**
- First Year / Last Year Produced
- Major Design Changes by Year
- Notable Features / Innovations
- Factory Options Available

### **8. Physical Specifications**
- Weight (Curb Weight)
- Length / Width / Height
- Bed Length (for trucks)
- Fuel Tank Capacity

---

## **🔍 SPECIALIZED CATEGORIES FOR PICKER**

Instead of just Manufacturer + Model + Kind, consider:

```
| [✓] Manufacturer | [✓] Model | Body Style | Era | Engine Type | Drivetrain | Production Years |
```

**Selection Behavior:**
- Manufacturer checkboxes (like Transportation)
- Model checkboxes (like Transportation states)
- **Add filters for**: Era, Body Style, Engine Type
- Show "Matching Numbers" badge where applicable
- Display "Parts Availability" indicator

---

## **📊 DATA SOURCES - MAPPED TO ATTRIBUTES**

### **NHTSA vPIC** (Primary):
✅ Make/Manufacturer
✅ Model
✅ Year Range
✅ Body Style
✅ Engine Type & Specs
✅ Transmission Type
✅ Drive Type
❌ Production Numbers (limited)
❌ Restoration Info (not available)

### **EPA Fuel Economy** (Supplementary):
✅ Engine Displacement
✅ Cylinders
✅ Fuel Type
✅ Transmission details
✅ Drive Type
✅ Vehicle Class
❌ Pre-1984 data sparse

### **Need to Source Separately:**
- Production numbers by year
- Restoration difficulty ratings
- Parts availability ratings
- Rarity/survival rates
- Matching numbers significance

---

## **💡 RECOMMENDATIONS FOR AUTOS**

### **Phase 1 - MVP Data Model:**
```
Vehicle Core:
- manufacturer
- model  
- year_first
- year_last
- body_style (Roadster, Coupe, Sedan, Pickup, etc.)
- era_classification (Brass Era, Vintage, Classic, etc.)

Engine:
- engine_type (Flathead I6, Small Block V8, etc.)
- cylinders
- displacement_ci
- displacement_l
- horsepower
- fuel_type

Drivetrain:
- transmission_type (3-speed manual, 4-speed auto, etc.)
- shift_type (column, floor)
- drive_type (RWD, FWD, 4WD)

Electrical:
- voltage_system (6V, 12V)

Enthusiast Metadata:
- production_total (if known)
- rarity_rating (Common, Uncommon, Rare, Very Rare)
- parts_availability (Easy, Moderate, Difficult)
- restoration_difficulty (Beginner, Intermediate, Expert)
- matching_numbers_importance (boolean)
```

### **Picker Table Design:**
```
| [✓] Manufacturer | [✓] Model | Body Style | Era | Engine | Years | Parts Avail | Rarity |
| [✓] Ford         | [✓] F-100 | Pickup     | Classic | V8 | 1953-1956 | Easy | Common |
```

---

## **🎯 NEXT STEPS:**

1. **Refine the data model** based on this research
2. **Design ETL strategy** - Annual refresh from NHTSA + manual curation for enthusiast metadata
3. **Plan UI/UX** - Show-quality presentation for vintage vehicles
4. **Consider community features** - User-submitted restoration stories, photo galleries

**Does this align with your vision for restoration enthusiasts? Should we proceed with designing the data model and ETL architecture?** 🚗🔧
