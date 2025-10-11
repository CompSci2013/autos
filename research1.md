## **Searching for Public Automobile Datasets**

Let me search for freely available automobile data sources that don't require authentication.Great findings! Let me search for more specific government data sources:Excellent! Now let me search for EPA fuel economy data:Perfect! Now let me compile all the findings into a comprehensive summary for your planning document.

---

## **📊 Public Automobile Data Sources - Research Findings**

### **🏛️ GOVERNMENT SOURCES (Free, No Login Required)**

#### **1. NHTSA vPIC (Vehicle Product Information Catalog)** ⭐ **RECOMMENDED PRIMARY SOURCE**
- **URL:** https://vpic.nhtsa.dot.gov/
- **API:** https://vpic.nhtsa.dot.gov/api/
- **Coverage:** Model years 1981-present (VIN standard era)
- **Data Available:**
  - Make, Model, Year
  - Manufacturer information
  - Body style, engine type
  - VIN decoding
  - 25+ API endpoints for developers
- **Format:** JSON, XML, CSV
- **Cost:** Free, no registration required, 24/7 availability
- **Database Download:** Standalone vPIC database available as MS SQL Server 2019 backup file

**Key APIs for AUTOS Project:**
- `/vehicles/GetAllManufacturers` - All manufacturers
- `/vehicles/GetMakesForManufacturer/{manufacturer}` - Makes by manufacturer
- `/vehicles/GetModelsForMake/{make}` - Models by make
- `/vehicles/GetModelsForMakeYear/{make}/{year}` - Models by make and year

#### **2. EPA Fuel Economy Data** ⭐ **RECOMMENDED SUPPLEMENTARY SOURCE**
- **URL:** https://www.fueleconomy.gov/feg/download.shtml
- **Coverage:** 1978-present (1984-present for most detailed data)
- **Data Available:**
  - MPG ratings (city/highway/combined)
  - Engine specifications
  - Transmission type
  - Drive type (FWD/RWD/AWD)
  - Fuel type
  - Vehicle class
- **Format:** CSV, Excel (.xls, .xlsx), XML
- **API:** REST API available at /ws/rest/vehicle/
- **Cost:** Free, public domain

---

### **📚 ACADEMIC/RESEARCH SOURCES**

#### **3. UCI Machine Learning Repository - Automobile Dataset**
- **URL:** https://archive.ics.uci.edu/dataset/10/automobile
- **Size:** 8.3 KB
- **Coverage:** Historic dataset with 205 instances
- **Data Available:**
  - Make (alfa-romero, audi, bmw, chevrolet, dodge, honda, etc.)
  - Body style (hardtop, wagon, sedan, hatchback, convertible)
  - Engine specifications
  - Insurance risk rating
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Use Case:** Good for testing/development, but limited scope

---

### **🌐 COMMUNITY/OPEN SOURCE**

#### **4. GitHub - US Car Models Data**
- **URL:** https://github.com/abhionlyone/us-car-models-data
- **Coverage:** 15,000+ entries, model years 1992-2026
- **Format:** CSV/JSON
- **Cost:** Free, open source
- **Use Case:** Good supplementary data for recent vehicles

#### **5. Kaggle Automobile Datasets**
- **URL:** https://www.kaggle.com/datasets/toramky/automobile-dataset
- Multiple datasets available
- **Limitation:** Requires Kaggle account (free)
- **Use Case:** Additional data points, used car pricing

---

### **⚠️ COMMERCIAL APIs (Require Payment)**

#### **6. CarAPI**
- **URL:** https://carapi.app/
- **Coverage:** 90,000+ vehicles from 1900 to today
- **Features:** Engine, transmission, mileage, color specs; VIN decoding; license plate lookup
- **Cost:** Free for development, pay when going live
- **Format:** REST + JSON API, CSV download

---

## **💡 RECOMMENDATION FOR AUTOS PROJECT**

### **Recommended Data Strategy:**

**Phase 1 - MVP (Use Free Government Data):**
1. **Primary:** NHTSA vPIC API
   - Manufacturer-Model combinations
   - Vehicle specifications
   - Year ranges
   - Body types

2. **Secondary:** EPA Fuel Economy Data
   - Performance specifications
   - Engine details
   - Fuel efficiency ratings

**Data Model for Picker Table:**
```
| [✓] Manufacturer | [✓] Model | Kind | Year Introduced | Last Year |
```

**Mapping to Available Data:**
- **Manufacturer** ← NHTSA Make/Manufacturer
- **Model** ← NHTSA Model
- **Kind** ← Derive from EPA Vehicle Class or NHTSA Body Style
  - Map to: Sport / Utility / Industrial
- **Year Introduced** ← First year in NHTSA data
- **Last Year** ← Last year in NHTSA data (or "Present")

---

## **🎯 Next Steps for Planning:**

1. **Decide on data refresh strategy** - One-time ETL or periodic updates?
2. **Define "Kind" mapping** - How to categorize vehicles into Sport/Utility/Industrial?
3. **Scope year range** - All years (1981+) or focus on modern vehicles (2000+)?
4. **Additional attributes** - What other fields do enthusiasts want to see?

**Would you like me to help you design the data model and ETL strategy based on these sources?**
