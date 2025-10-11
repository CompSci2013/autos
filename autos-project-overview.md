# AUTOS Project Overview

## Project Information

**Project Name:** AUTOS  
**Target Audience:** Amateur Auto Enthusiasts (General Public to Hard-Core Restoration Community)  
**Date Created:** October 11, 2025  
**Version:** 1.0

---

## Abstract

The AUTOS application is designed for the amateur auto enthusiast community, providing a comprehensive platform to explore, research, and learn about automobiles from 1900 to present. The application enables users to discover vehicles through an intuitive search interface inspired by the Transportation Portal, with enhanced features tailored specifically for automotive enthusiasts.

### Core Objectives

- Provide accessible vehicle information for casual consumers through restoration experts
- Enable detailed technical research for restoration projects
- Offer educational content for learning enthusiasts
- Support investment and collecting decisions with rarity and value data
- Maintain an engaging, professional user experience without login barriers

---

## Target Audience & Persona Summary

The application serves multiple user personas through a unified "diamond with multiple facets" architecture - one core dataset presented through different lenses:

### Primary Personas

1. **General Consumer** - Casual car shoppers seeking basic specs and reliability info
2. **Motor Head (Hard-Core Enthusiast)** - Active restorers needing complete technical specifications
3. **Jr. Motor Head (Learner)** - Car show attendees and history buffs learning about classics
4. **Investor/Collector** - Buyers analyzing market trends and rarity
5. **Parts Supplier/Vendor** - Aftermarket professionals identifying demand
6. **Automotive Historian/Researcher** - Authors and curators requiring accurate historical data
7. **Hobbyist Mechanic/DIYer** - Weekend wrenchers looking for maintenance guidance
8. **Filmmaker/Creative Professional** - Production teams needing period-correct vehicles

**Initial Focus:** Phase 1 MVP targets Motor Head persona (hard-core enthusiasts) with expansion to other personas in subsequent phases.

---

## Technology Stack

### Frontend
- **Framework:** Angular 14
- **UI Components:** NG-ZORRO Ant Design
- **State Management:** Custom service-based architecture (reused from Transportation Portal)
- **Development:** Podman containers for minimal footprint

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **API Design:** RESTful with versioned endpoints

### Data Layer
- **Primary Store:** Elasticsearch
- **Index Strategy:** Dedicated `autos-unified` index or separate namespace

### Deployment
- **Orchestration:** Kubernetes
- **Namespace:** TBD - either new `autos` namespace or reuse `transportation`

### Rationale
This stack reuses proven patterns from the recently upgraded Transportation Portal, ensuring:
- Familiar development patterns
- Existing picker/table components can be adapted
- Proven Elasticsearch infrastructure
- Established state management services

---

## Architecture Overview

### Multi-API Design

**API 1: Picker Data Service**
- **Endpoint:** `/api/v1/vehicle-combinations`
- **Purpose:** Fetch manufacturer-model combinations for picker table
- **Returns:** Paginated list of unique manufacturer + model + attributes
- **Query Parameters:** pagination, search, filters

**API 2: Vehicle Details Service**
- **Endpoint:** `/api/v1/vehicles`
- **Purpose:** Fetch detailed vehicle records based on picker selections
- **Input:** Array of manufacturer + model combinations
- **Returns:** Complete vehicle specifications and metadata

**API 3: Vehicle History Service** (Future)
- **Endpoint:** `/api/v1/vehicles/{make}/{model}/history`
- **Purpose:** Detailed "About X" historical content
- **Returns:** Rich historical data, designer bios, cultural impact

### Frontend Structure

```
/autos
├── home-page/                    # Landing/introduction page
├── discover-page/                # Main search interface
│   ├── vehicle-picker/          # Table with checkboxes
│   ├── goggles-sidebar/         # View-switching controls
│   └── results-display/         # Detailed results based on selections
├── about-vehicle/                # "About the [Year] [Make] [Model]" pages
├── core/
│   ├── services/
│   │   ├── state-management.service.ts
│   │   ├── api.service.ts
│   │   └── persona.service.ts   # Manages view preferences
│   └── models/
│       ├── vehicle.model.ts
│       ├── picker-selection.model.ts
│       └── persona.model.ts
└── shared/
    └── components/
        └── goggles-control/     # Sidebar view switcher
```

---

## Key Features

### 1. Home Page
- Introduction to the application and available tools
- Quick navigation to Discover page
- Overview of data coverage (years, manufacturers, vehicle types)

### 2. Discover Page (Primary Feature)

**Vehicle Picker Component:**
- Data table with filterable columns
- Pagination controls
- Configurable rows per page selector
- Global search bar (searches all columns/rows, displays partial matches)

**Initial Table Structure:**
```
| [✓] Manufacturer | [✓] Model | Body Style | Era | Engine Type | Years | Parts Avail | Rarity |
```

**Checkbox Behavior:**
- Manufacturer column: checkboxes for selecting makes
- Model column: checkboxes for selecting specific models
- Multi-select capability with selection count badges
- Similar UX to Transportation Portal's manufacturer-state picker

**Filtering Options:**
- Era (Brass Era, Vintage, Classic, Modern, etc.)
- Body Style (Roadster, Coupe, Sedan, Pickup, etc.)
- Engine Type (Flathead, V8, Inline-6, etc.)
- Drivetrain (RWD, FWD, 4WD, AWD)
- Rarity (Common, Uncommon, Rare, Very Rare)
- Parts Availability (Easy, Moderate, Difficult)

### 3. "About X" Vehicle History Pages

Detailed pages for each vehicle providing:
- **Overview:** Production years, significance, legacy
- **Historical Context:** Industry landscape, competitive environment
- **Design & Development:** Designer biographies, engineering team, development timeline
- **Production History:** Factory locations, production numbers, special editions
- **Cultural Impact:** Movie/TV appearances, celebrity owners, advertising campaigns
- **Technical Deep Dive:** Available powertrains, chassis info, notable options
- **Legacy & Collectibility:** Current collector status, market values, restoration scene
- **Notable Examples:** Famous individual vehicles, record holders, museum pieces

### 4. "Goggles" View-Switching System

**Concept:** Sidebar with clickable "goggles" icons that adapt the site's presentation to different user needs without requiring login or explicit persona selection.

**Example Goggles:**
- **Standard View:** Balanced presentation for general audience
- **Tech Specs:** Data-dense view for Motor Heads (complete specifications)
- **History Buff:** Timeline and cultural context emphasis
- **Investment:** Market values, rarity scores, ROI data
- **Beer Goggles:** Polarizing/unconventional vehicles ("so ugly it's beautiful")
- **Beginner:** Simplified educational content for Jr. Motor Heads

**Implementation:**
- Sidebar remains persistent across pages
- Visual icons represent each goggle type
- Clicking switches view instantly (no page reload)
- Registered users: preferences saved and restored on return
- Anonymous users: preferences stored in session only

### 5. Results Display
- Detailed vehicle information based on picker selections
- Presentation adapts to active "goggles" view
- Export capabilities (print, PDF, share link)

---

## Development Phases

### Phase 1 - MVP (Motor Head Focus)
**Timeline:** TBD  
**Scope:**
- Home page with project introduction
- Discover page with vehicle picker (manufacturer + model checkboxes)
- Basic "About X" pages with available data
- Standard and Tech Specs goggles views
- Integration with NHTSA vPIC and EPA data sources
- Elasticsearch index setup
- Responsive design (desktop + mobile)

**Success Criteria:**
- 1,000+ vehicle combinations searchable
- Picker table performs with < 2 second load time
- Basic technical specifications display correctly
- User can select vehicles and view detailed results

### Phase 2 - Enhanced Content & Learning
**Scope:**
- Jr. Motor Head persona features (educational focus)
- Enhanced "About X" pages with designer biographies
- Timeline visualizations (model evolution over years)
- History Buff and Beginner goggles views
- Photo galleries (period ads, brochures)
- "Start here" restoration guides

**Success Criteria:**
- 50+ detailed vehicle history pages
- Designer biography database established
- Timeline views functional for major models

### Phase 3 - Community & Advanced Features
**Scope:**
- User registration and preference saving
- Additional persona views (Investor, Parts Supplier, Historian)
- Community features (forums, user-submitted stories)
- Photo upload capability
- "My Garage" portfolio tracking
- Advanced search with saved queries
- Parts vendor directory integration

**Success Criteria:**
- 100+ registered users
- Community content submissions active
- Multi-persona architecture fully implemented

---

## Key Design Decisions

### 1. No Login Required for General Use
- **Principle:** Maximum accessibility without barriers
- **Implementation:** All core features available to anonymous users
- **Registration Benefits:** Save preferences, track "My Garage", contribute content
- **User Control:** Goggles view persists for registered users across sessions

### 2. Intuitive, Professional UX
- **Principle:** Enjoyable without being silly ("no eye-rolling")
- **Tone:** Professional yet approachable for enthusiasts
- **Navigation:** Self-explanatory without tutorials or tooltips
- **Performance:** Fast, responsive, minimal loading states

### 3. Multi-Persona Architecture (Diamond Analogy)
- **Concept:** One core dataset, multiple presentation facets
- **Implementation:** Goggles system provides instant view switching
- **Scalability:** Easy to add new personas/views without restructuring data
- **Flexibility:** Users can explore different perspectives on same vehicle

### 4. Data Quality & Authenticity
- **Primary Sources:** Government APIs (NHTSA, EPA) for verified data
- **Enthusiast Metadata:** Curated separately (rarity, restoration difficulty)
- **Historical Accuracy:** Citations and sources for "About X" content
- **Community Input:** User contributions moderated before publishing

### 5. Scope: Era Coverage
- **Years:** 1900-Present (NHTSA reliable from 1981+)
- **Geographic:** Initial focus on US-market vehicles
- **Expansion:** International vehicles in future phases

---

## Open Questions & Research Needed

### 1. Terminology & Lexicon
- **Question:** What technical jargon is expected common knowledge vs. needs explanation?
- **Need:** Compile glossary of enthusiast terms
- **Examples:** 
  - Complementary: "numbers matching", "survivor", "resto-mod"
  - Pejorative: "bondo bucket", "rust bucket", "trailer queen"
- **Action:** Research enthusiast forums, YouTube channels, car show conversations

### 2. "Google Types" Concept Validation
- **Question:** Does the "goggles" metaphor resonate with users?
- **Alternative Terms:** Filters? Views? Modes? Lenses?
- **User Testing:** Needed to validate terminology
- **Action:** Create mockups and test with 5-10 enthusiasts

### 3. "Beer Goggles" Feature Viability
- **Concept:** Highlight polarizing/unconventional vehicles
- **Question:** Is this genuinely useful or just clever?
- **Potential Value:** Surfaces hidden gems, challenges conventional beauty standards
- **Risk:** Could be seen as mocking vehicles
- **Action:** Survey enthusiast community for interest

### 4. Namespace Strategy
- **Question:** New `autos` namespace or reuse `transportation`?
- **Considerations:** Resource isolation, shared infrastructure, future projects
- **Action:** Discuss with DevOps team

### 5. Authentication Requirements
- **Question:** Any features that MUST require login?
- **Considerations:** Community moderation, user-generated content, GDPR compliance
- **Action:** Define minimum viable auth system

---

## Success Metrics (Phase 1 MVP)

### User Engagement
- 1,000+ unique visitors in first month
- 50+ returning users
- Average session duration > 5 minutes
- Bounce rate < 40%

### Technical Performance
- Page load time < 2 seconds (95th percentile)
- API response time < 500ms (95th percentile)
- Zero downtime during business hours
- Mobile responsive (passes Lighthouse audit)

### Data Coverage
- 1,000+ vehicle combinations available
- 100% of NHTSA data successfully imported
- 90%+ of EPA data matched to vehicles

### Feature Adoption
- Picker table used by 80%+ of visitors
- At least 2 goggles views tried per session
- "About X" pages accessed by 30%+ of users

---

## Future Considerations

### Advanced Features (Post-Phase 3)
- VIN decoder tool
- Parts compatibility matrix
- Virtual garage builder (3D visualization)
- Restoration cost calculator
- Market value trend charts
- Auction results database
- Community marketplace (parts, vehicles, services)

### Monetization (If Needed)
- Premium membership (advanced features, ad-free)
- Parts vendor advertising/directory
- Affiliate links to restoration suppliers
- Sponsored content (ethically disclosed)
- API access for commercial users

### Partnerships
- Classic car clubs and organizations
- Restoration shops and suppliers
- Automotive museums
- YouTube restoration channels
- Car show organizers

---

## References & Inspiration

- **Transportation Portal:** Existing application providing pattern for picker/table interface
- **NHTSA vPIC:** Primary data source for vehicle specifications
- **Classic Car Community:** Car shows, restoration forums, YouTube channels
- **Bring a Trailer:** Inspiration for "About X" storytelling approach
- **Hagerty Valuation Tools:** Inspiration for collector/investor features

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-11 | 1.0 | Initial consolidated document | Planning Session |

---

**Next Steps:**
1. Review and approve consolidated project overview
2. Finalize data model and sources (see DATA_SOURCES_AND_MODEL.md)
3. Detail user personas and feature specs (see USER_PERSONAS_AND_FEATURES.md)
4. Begin Phase 1 MVP development planning