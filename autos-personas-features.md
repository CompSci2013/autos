# AUTOS User Personas and Features

## Document Information

**Project:** AUTOS  
**Document Type:** Product Requirements & UX Specification  
**Date Created:** October 11, 2025  
**Version:** 1.0  
**Target Audience:** Product Managers, UX Designers, Frontend Developers

---

## Table of Contents

1. [User Personas](#user-personas)
2. [Feature Specifications](#feature-specifications)
3. [UI/UX Principles](#uiux-principles)
4. [Goggles System Design](#goggles-system-design)
5. [Research Questions](#research-questions)

---

## User Personas

### Overview: The Diamond Analogy

**Core Concept:** AUTOS presents a single comprehensive dataset through multiple persona-specific "facets" or views. Like a diamond cut to reveal different aspects from different angles, the same vehicle data is presented in ways optimized for each user type's needs and expertise level.

**Architecture Pattern:**
```
        Core Vehicle Data (The Diamond)
                    ↓
        Presentation Layer (The Facets)
                    ↓
    ┌───────┬───────┬───────┬───────┬───────┐
    ↓       ↓       ↓       ↓       ↓       ↓
Consumer Motor Jr.Motor Investor Parts  Historian
         Head    Head            Supplier
```

---

### Persona 1: General Consumer 🚗

**Profile:**
- **Who:** Casual car shopper, used vehicle buyer
- **Age Range:** 25-65
- **Technical Knowledge:** Basic (understands MPG, knows common makes/models)
- **Primary Goal:** "I need a reliable car for daily use"
- **Shopping Mode:** Budget-conscious, practical

**Motivations:**
- Find reliable transportation within budget
- Understand common issues before buying
- Compare fuel economy and maintenance costs
- Identify good value vehicles

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| High | Year, Make, Model | Basic identification |
| High | Reliability ratings | Avoid problem vehicles |
| High | Fuel economy (MPG) | Operating cost |
| Medium | Common issues | Pre-purchase awareness |
| Medium | Market value ranges | Budget planning |
| Low | Detailed engine specs | Too technical for this persona |

**UI Preferences:**
- Clean, uncluttered interface
- Mobile-friendly (shopping on-the-go)
- Simple comparison tools (side-by-side)
- Visual indicators (★★★★☆ ratings)
- Plain language (avoid jargon)

**Key Features:**
- Quick search by budget/year
- "Best for..." recommendations (commuting, families, first car)
- Reliability scores
- Cost of ownership estimates
- Buyer's guide checklists ("What to look for when inspecting...")

**Example Use Case:**
> "I have $8,000 and need something reliable for my 40-mile daily commute. What should I consider?"

---

### Persona 2: Motor Head (Hard-Core Enthusiast) 🔧

**Profile:**
- **Who:** Active restorer, show participant, parts collector
- **Age Range:** 35-75
- **Technical Knowledge:** Expert (can rebuild engines, knows RPO codes)
- **Primary Goal:** "I need complete specs for my restoration project"
- **Engagement Mode:** Deep research, detail-oriented

**Motivations:**
- Verify authenticity of potential purchases
- Source correct parts and options
- Understand production numbers and rarity
- Decode VIN and option codes
- Prepare for show judging criteria

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| Critical | Complete engine specs | Matching numbers verification |
| Critical | Production numbers | Rarity assessment |
| Critical | Factory options/RPO codes | Authenticity verification |
| Critical | Parts interchange | Finding replacement parts |
| High | Original paint/interior codes | Restoration accuracy |
| High | Frame/VIN decoding | Authentication |
| High | Known weak points | Restoration planning |
| Medium | Show judging criteria | Competition preparation |

**UI Preferences:**
- Data-dense tables (more info on screen)
- Expandable technical sections
- Copy-paste friendly (spec sheets)
- Cross-reference tools
- Forum integration
- Print/export to PDF

**Key Features:**
- Advanced filtering (engine code, axle ratio, transmission type)
- Parts availability indicators with vendor links
- Interchange compatibility charts
- Restoration difficulty ratings
- Community forums and build threads
- Matching numbers significance indicators
- Factory option decoder
- Show judging point system reference

**Example Use Case:**
> "I'm restoring a 1965 Ford F-100. What rear axle ratios were available with the 352 V8 and 4-speed manual transmission? Where can I source a correct carb?"

---

### Persona 3: Jr. Motor Head (Enthusiast/Learner) 🎓

**Profile:**
- **Who:** Car show attendee, YouTube learner, future restorer
- **Age Range:** 16-45
- **Technical Knowledge:** Intermediate (understands basics, learning advanced)
- **Primary Goal:** "I love classic cars and want to learn everything about them"
- **Engagement Mode:** Browsing, discovering, planning for future

**Motivations:**
- Learn automotive history and evolution
- Identify entry-level restoration candidates
- Understand what to look for at car shows
- Build knowledge before making first purchase
- Connect with enthusiast community

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| High | Historical significance | Cultural context |
| High | Model evolution timeline | Understanding changes |
| High | Entry-level project recommendations | Accessible starting point |
| High | "What to look for" guides | Education |
| Medium | Famous examples | Inspiration |
| Medium | Cost estimates | Future planning |
| Medium | Skill level required | Self-assessment |
| Low | Detailed option codes | Too advanced at this stage |

**UI Preferences:**
- Visual storytelling (timelines, photos)
- Engaging, educational tone
- Video integration (YouTube embeds)
- Progressive disclosure (start simple, dive deeper)
- Gamification (badges, achievements)
- Social sharing features

**Key Features:**
- Timeline views showing model evolution
- Photo galleries (factory photos, brochures, period ads)
- "Start here" beginner guides
- Entry-level project recommendations
- Cost estimator tools
- Famous vehicle stories ("hero cars")
- Virtual car show browsing
- Designer/engineer spotlights
- Glossary of terms (hover definitions)

**Example Use Case:**
> "I went to a car show and saw a gorgeous 1957 Chevy Bel Air. What makes this year special? Could I restore one as my first project?"

---

### Persona 4: Investor/Collector 💰

**Profile:**
- **Who:** Vehicle investor, collection builder, auction participant
- **Age Range:** 40-70
- **Technical Knowledge:** Moderate to High (knows market, may not be hands-on)
- **Primary Goal:** "Which vehicles are appreciating? What's a good investment?"
- **Engagement Mode:** Analytical, trend-focused, portfolio management

**Motivations:**
- Identify undervalued vehicles before market recognition
- Track portfolio values over time
- Understand rarity and provenance importance
- Make data-driven acquisition decisions
- Predict future classics

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| Critical | Market value trends | Investment timing |
| Critical | Production numbers | Supply constraint |
| Critical | Survival rates | Actual rarity |
| Critical | Auction results | Comparable sales |
| High | Investment potential rating | Decision support |
| High | Provenance significance | Value multipliers |
| High | Special editions | Limited run identification |
| Medium | Restoration costs | ROI calculation |

**UI Preferences:**
- Professional, business intelligence style
- Charts and graphs (value over time)
- Data export (Excel, CSV)
- Portfolio tracking dashboard
- Alert system (price movements)
- Clean, minimal design

**Key Features:**
- Value tracking over time (historical charts)
- Rarity scores with algorithmic calculation
- "Future classics" predictions (AI/ML analysis)
- ROI calculators
- Collection portfolio tracker ("My Garage")
- Auction results database
- Comparable sales analysis
- Market trend reports
- Price alerts and notifications

**Example Use Case:**
> "I'm considering a 1970 Plymouth Barracuda convertible. What's the price trend over the last 10 years? How rare is this configuration?"

---

### Persona 5: Parts Supplier/Vendor 🏪

**Profile:**
- **Who:** Aftermarket parts manufacturer, restoration shop owner
- **Age Range:** 30-65
- **Technical Knowledge:** High (understands parts, manufacturing)
- **Primary Goal:** "Which vehicles need parts? What's in demand?"
- **Engagement Mode:** Market research, business intelligence

**Motivations:**
- Identify market opportunities (high demand, low supply)
- Understand parts commonality across models
- Size addressable market by vehicle
- Track popular restoration candidates
- Plan inventory and manufacturing

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| Critical | Production numbers | Market size |
| Critical | Parts commonality | Manufacturing efficiency |
| Critical | Popular restoration models | Demand forecasting |
| High | Known failure points | Opportunity identification |
| High | Interchangeability charts | Cross-selling |
| Medium | Current restoration trends | Market timing |

**UI Preferences:**
- Business dashboard style
- Sortable data tables
- Export functionality (reports)
- API access (integration)
- Filtering by year range
- Market segment analysis

**Key Features:**
- Demand analytics dashboard
- Cross-reference tools (part interchangeability)
- Market sizing by year/model
- Parts compatibility matrices
- Popular vehicle tracking
- Failure point database
- Vendor directory (for partnership opportunities)
- API access for integration with inventory systems

**Example Use Case:**
> "We manufacture brake components. Which 1960s pickup trucks share the same front brake assembly? What's the total production across these models?"

---

### Persona 6: Automotive Historian/Researcher 📚

**Profile:**
- **Who:** Author, museum curator, documentary filmmaker, academic
- **Age Range:** 30-70
- **Technical Knowledge:** High (context and history focus)
- **Primary Goal:** "I need accurate historical information with citations"
- **Engagement Mode:** Deep research, verification, citation

**Motivations:**
- Ensure historical accuracy for publications
- Document automotive heritage
- Understand design and engineering context
- Preserve cultural significance
- Create educational content

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| Critical | Accurate dates and facts | Publication credibility |
| Critical | Source citations | Academic standards |
| Critical | Designer/engineer bios | Historical context |
| High | Factory locations | Geographic history |
| High | Development timeline | Story narrative |
| High | Period advertisements | Cultural context |
| Medium | Patent information | Innovation documentation |

**UI Preferences:**
- Academic, archival style
- Citation-friendly (export to BibTeX, APA)
- Source transparency
- Document viewer for period materials
- Print-friendly layouts
- Clean typography for readability

**Key Features:**
- Comprehensive timeline views
- Designer/engineer profiles with career highlights
- Source citations (books, magazines, patents)
- Export to bibliography formats
- Image archives (ads, brochures, patents)
- Factory history and locations
- Development stories and narratives
- Period review compilation
- Cultural context documentation

**Example Use Case:**
> "I'm writing a book chapter on the development of the muscle car era. Who designed the 1964 Pontiac GTO and what was the design philosophy behind it?"

---

### Persona 7: Hobbyist Mechanic/DIYer 🛠️

**Profile:**
- **Who:** Weekend wrencher, garage tinkerer, shade-tree mechanic
- **Age Range:** 25-60
- **Technical Knowledge:** Intermediate to High (practical, hands-on)
- **Primary Goal:** "Can I fix/maintain this myself?"
- **Engagement Mode:** Problem-solving, practical guidance

**Motivations:**
- Assess repair difficulty before buying
- Find common problem solutions
- Understand tool requirements
- Learn from others' experiences
- Save money on professional repairs

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| High | Common maintenance issues | Preparation |
| High | Repair difficulty ratings | Skill assessment |
| High | Parts availability & cost | Budget planning |
| High | Tool requirements | Workshop preparation |
| Medium | Forum wisdom | Community knowledge |
| Medium | "What breaks first" guides | Prevention |
| Medium | Maintenance schedules | Routine care |

**UI Preferences:**
- Practical, how-to focused
- Video integration (repair tutorials)
- Step-by-step guides
- Community Q&A integration
- Mobile-friendly (shop/garage access)
- Printable checklists

**Key Features:**
- Common problem databases ("Known Issues")
- Difficulty ratings for repairs
- Tool lists (required and recommended)
- Cost estimators (parts + labor)
- "Buyer beware" warnings
- Maintenance schedule generator
- Forum integration (community wisdom)
- Video tutorial links (YouTube, etc.)
- DIY repair guides
- Parts cross-reference (OEM vs aftermarket)

**Example Use Case:**
> "I'm thinking about buying a 1985 Chevy C10. What are the common problems I should expect? Can I do most repairs myself?"

---

### Persona 8: Filmmaker/Creative Professional 🎬

**Profile:**
- **Who:** Period film production, advertising agency, media professional
- **Age Range:** 25-55
- **Technical Knowledge:** Low to Moderate (visual/authenticity focus)
- **Primary Goal:** "I need a period-correct vehicle for my project"
- **Engagement Mode:** Visual research, authenticity verification

**Motivations:**
- Ensure period accuracy for productions
- Find specific year/model for authenticity
- Understand what was common vs rare in era
- Identify cultural associations
- Source rental vehicles or picture cars

**Data Needs:**
| Priority | Attribute | Why It Matters |
|----------|-----------|----------------|
| Critical | Year-specific styling details | Visual accuracy |
| Critical | Period-correct options | Authenticity |
| High | Color availability by year | Period accuracy |
| High | What was common vs rare | Context realism |
| High | Cultural associations | Character development |
| Medium | Movie/TV appearances | Reference material |
| Low | Technical specifications | Not production-relevant |

**UI Preferences:**
- Visual, image-heavy interface
- Year-by-year comparison views
- Color palette displays
- Reference image galleries
- Quick filters (year, body style, color)
- Share/export images

**Key Features:**
- Year-by-year styling change galleries
- Period photo archives (factory, ads, lifestyle)
- "Hero car" database (famous movie/TV vehicles)
- Color availability charts (paint codes by year)
- Common vs rare configurations
- Cultural context ("What would a teacher drive in 1965?")
- Rental availability indicators
- Production company directory
- Location scout integration

**Example Use Case:**
> "I'm shooting a film set in 1962. What colors was the Ford Galaxie available in? What would be a realistic car for a suburban family?"

---

## Feature Specifications

### 1. Home Page

**Purpose:** Welcome users, explain the application, provide navigation

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  AUTOS Logo                    [Login/Register] │
├─────────────────────────────────────────────────┤
│                                                 │
│     Welcome to AUTOS                           │
│     Explore American Automobiles 1900-Present  │
│                                                 │
│     [Discover Vehicles] [Learn More]           │
│                                                 │
├─────────────────────────────────────────────────┤
│  Quick Stats:                                   │
│  • 50,000+ Vehicles                            │
│  • 200+ Manufacturers                          │
│  • 1900-2026 Coverage                          │
├─────────────────────────────────────────────────┤
│  Featured Content:                              │
│  [Classic Pickups] [Muscle Cars] [Hot Rods]   │
└─────────────────────────────────────────────────┘
```

**Content Sections:**

1. **Hero Section**
   - Large, impactful image (rotating classic vehicles)
   - Tagline: "Explore the History and Heritage of American Automobiles"
   - Primary CTA: "Discover Vehicles"
   - Secondary CTA: "Learn More"

2. **Quick Stats**
   - Total vehicles in database
   - Number of manufacturers
   - Year range coverage
   - Last updated date

3. **Featured Collections**
   - Curated categories (Classic Pickups, Muscle Cars, Vintage Roadsters)
   - Visual cards with representative images
   - Click to filter Discover page

4. **How It Works**
   - Brief explanation (3-4 sentences)
   - "No login required to explore"
   - "Create account to save preferences"

5. **Recently Added**
   - Carousel of newest "About X" pages
   - Thumbnail + title + snippet

**Technical Requirements:**
- Responsive design (mobile, tablet, desktop)
- Fast load time (< 2 seconds)
- Minimal dependencies (fast initial render)
- SEO optimized (meta tags, structured data)

---

### 2. Discover Page (Primary Feature)

**Purpose:** Main vehicle search and selection interface

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  [Home] > Discover                      [My Selections: 3] │
├──────┬──────────────────────────────────────────────────┤
│      │  Global Search: [___________________] [🔍]       │
│      │                                                  │
│ GOG  │  Filters: [Era ▼] [Body Style ▼] [Rarity ▼]   │
│ GLES │                                                  │
│      │  ┌─────────────────────────────────────────┐   │
│ [👓] │  │ Manufacturer ▲ │ Model     │ Body │ Era │   │
│ Stan │  ├─────────────────┼───────────┼──────┼─────┤   │
│ dard │  │ [✓] Ford       │ [✓] F-100 │ Pick │Clas│   │
│      │  │ [ ] Chevrolet  │ [ ] Bel Air│ Coup│Vin │   │
│ [🔧] │  │ [✓] Dodge      │ [✓] Power  │ Pick│Clas│   │
│ Tech │  │                │    Wagon   │     │     │   │
│ Spec │  └─────────────────────────────────────────┘   │
│      │                                                  │
│ [📚] │  Showing 1-50 of 1,247    [< 1 2 3 ... 25 >]   │
│ Hist │  Per page: [50 ▼]                              │
│ ory  │                                                  │
│      │  [Show Results (3 selected)]                    │
│ [💰] │                                                  │
│ Inve │                                                  │
│ stor │                                                  │
└──────┴──────────────────────────────────────────────────┘
```

**Components:**

#### A. Goggles Sidebar (Left)
- Persistent across all pages
- Icon-based navigation
- Active goggle highlighted
- Tooltip on hover with name
- Collapsible on mobile

#### B. Global Search Bar
- Searches all columns and rows
- Real-time suggestions (autocomplete)
- Partial match highlighting
- Fuzzy search (handles typos)
- Search history (dropdown)

#### C. Filter Controls
- Dropdown filters above table
- Multi-select capability
- Visual indicators for active filters
- "Clear all filters" button
- Filter count badge

#### D. Vehicle Picker Table

**Column Structure:**

| Column | Type | Behavior | Width |
|--------|------|----------|-------|
| Manufacturer | Checkbox + Text | Select all manufacturers | 20% |
| Model | Checkbox + Text | Select models within manufacturer | 25% |
| Body Style | Text | Display only | 15% |
| Era | Badge | Color-coded era classification | 12% |
| Engine | Text | Primary engine type | 15% |
| Years | Range | "1953-1956" or "1965" | 13% |

**Checkbox Behavior:**
- Manufacturer checkbox: Selects ALL models for that manufacturer
- Model checkbox: Selects specific model
- Selection count badge in header
- "Select all" / "Deselect all" buttons
- Visual feedback (row highlight on selection)

**Sorting:**
- Click column header to sort
- Ascending/descending toggle
- Visual indicator (▲▼)
- Default sort: Manufacturer (A-Z), then Model (A-Z)

**Pagination:**
- Configurable rows per page: 10, 25, 50, 100
- Page numbers with ellipsis (...) for large result sets
- "Previous" / "Next" buttons
- Keyboard navigation (arrow keys)

#### E. Results Button
- Fixed to bottom of viewport (mobile) or below table (desktop)
- Shows selection count
- Disabled if no selections
- Animates on selection change

**Technical Requirements:**
- Virtual scrolling for large datasets (performance)
- Debounced search (avoid excessive API calls)
- Local storage for selections (persist across page reload)
- Responsive table (mobile: cards instead of table)

---

### 3. Results Display

**Purpose:** Show detailed vehicle information based on picker selections

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  [Home] > [Discover] > Results          [Export ▼]      │
├──────┬──────────────────────────────────────────────────┤
│ GOG  │  Your Selections (3):                            │
│ GLES │  • Ford F-100 (1953-1956)                        │
│      │  • Dodge Power Wagon (1946-1968)                 │
│ [👓] │  • Chevrolet C10 (1960-1966)                     │
│      │                                                   │
│      │  ┌──────────────────────────────────────────┐   │
│      │  │ 🚗 Ford F-100 (1953-1956)                │   │
│      │  │                                           │   │
│      │  │ Production: 1953-1956 (1st Generation)   │   │
│      │  │ Body Style: Pickup Truck                 │   │
│      │  │ Era: Classic                             │   │
│      │  │                                           │   │
│      │  │ [View Full History] [Compare] [Add to ❤️]│   │
│      │  │                                           │   │
│      │  │ ▼ Specifications                         │   │
│      │  │   Engine Options:                        │   │
│      │  │   • 215 ci Inline-6 (101 hp)            │   │
│      │  │   • 239 ci Flathead V8 (110 hp)         │   │
│      │  │   • 256 ci Inline-6 (115 hp)            │   │
│      │  │                                           │   │
│      │  │   Transmission Options:                  │   │
│      │  │   • 3-speed manual (column shift)       │   │
│      │  │   • 3-speed manual (floor shift)        │   │
│      │  │   • 4-speed manual (optional 1955+)     │   │
│      │  └──────────────────────────────────────────┘   │
│      │                                                   │
│      │  [More results below...]                         │
└──────┴──────────────────────────────────────────────────┘
```

**Content Presentation (varies by active Goggle):**

**Standard View:**
- Basic specifications (year, body, engine)
- Production numbers
- Brief historical note
- Links to full history page

**Tech Specs View (Motor Head):**
- Complete engine specifications
- All transmission options
- Drivetrain details
- Factory option codes
- Parts availability indicators
- Known issues and common mods

**History View (Jr. Motor Head):**
- Timeline of model evolution
- Cultural significance
- Famous examples
- Design highlights
- Educational context

**Investor View:**
- Rarity score and rating
- Production numbers vs survival rate
- Market value trends (chart)
- Investment potential rating
- Comparable sales

**Interactive Elements:**
- Expandable sections (accordion pattern)
- "View Full History" button → goes to "About X" page
- "Compare" button → side-by-side comparison view
- "Add to Favorites" (requires login)
- Export options (PDF, print, share link)

---

### 4. "About X" Vehicle History Pages

**Purpose:** Comprehensive, Wikipedia-style pages for specific vehicles

**URL Pattern:** `/vehicles/[make]/[model]/[generation]`
- Example: `/vehicles/ford/f-100/1953-1956`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  [Home] > [Ford] > [F-100] > 1953-1956                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│      Ford F-100 (First Generation: 1953-1956)          │
│      ═══════════════════════════════════════            │
│                                                          │
│  [Image Gallery]                                        │
│                                                          │
│  Table of Contents:                                     │
│  1. Overview                                            │
│  2. Historical Context                                  │
│  3. Design & Development                                │
│  4. Production History                                  │
│  5. Cultural Impact                                     │
│  6. Technical Specifications                            │
│  7. Legacy & Collectibility                             │
│  8. Notable Examples                                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  1. OVERVIEW                                            │
│                                                          │
│  The first-generation Ford F-Series pickup, intro-      │
│  duced in 1948 and redesigned for 1953, marked a       │
│  revolution in truck design...                          │
│                                                          │
│  Production Years: 1953-1956                           │
│  Total Production: ~750,000 units                      │
│  Body Styles: Pickup, Panel, Platform                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  3. DESIGN & DEVELOPMENT                               │
│                                                          │
│  👤 Designer: Bob Gregorie                             │
│     Lead Designer, Ford Motor Company                   │
│     [View Full Biography]                               │
│                                                          │
│  The F-100's design philosophy centered on...          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Content Sections:**

#### 1. Overview
- Production years and generation
- Total units produced
- Market position (economy, luxury, utility)
- Legacy summary (2-3 paragraphs)
- Key statistics box

#### 2. Historical Context
- Automotive industry landscape at time
- Competitive environment
- Economic/cultural factors
- Company situation

#### 3. Design & Development ⭐
- **Designer Biographies** (detailed profiles)
  - Name, role, background
  - Career highlights
  - Other notable designs
  - Design philosophy
  - Portrait photo (if available)
- Chief Engineer profile
- Development timeline
- Technical innovations
- Design challenges overcome

#### 4. Production History
- Factory locations (with maps)
- Production numbers by year (chart)
- Special editions and variants
- Running changes (year-by-year updates)
- End of production story

#### 5. Cultural Impact
- Movie appearances (with screenshots)
- TV show appearances
- Celebrity owners
- Racing heritage
- Advertising campaigns (with period ads)
- Magazine reviews (period and retrospective)

#### 6. Technical Specifications
- Available engines (detailed specs)
- Transmission options
- Chassis/platform details
- Notable factory options
- RPO/option codes

#### 7. Legacy & Collectibility
- Current collector market status
- Rarity assessment
- Restoration scene overview
- Club/organization links
- Market value trends

#### 8. Notable Examples
- Famous individual vehicles
- Record holders
- Museum pieces
- Survivor stories
- "Barn finds"

**Sources & Citations:**
- Footer with complete bibliography
- Inline citations [1], [2]
- Export to BibTeX/APA formats
- "Last updated" timestamp
- "Suggest an edit" link (for registered users)

**Interactive Features:**
- Image lightbox gallery
- Timeline visualizations (model evolution)
- Interactive comparison tool (vs competitors)
- Share buttons (social media)
- Print-friendly view
- "Add to reading list" (requires login)

---

## UI/UX Principles

### 1. No Login Required Philosophy

**Principle:** Maximum accessibility without barriers. Users can explore all core features anonymously.

**Implementation:**
- All vehicle data accessible without authentication
- Search and picker fully functional
- Results display available to all
- "About X" pages publicly readable

**Registration Benefits** (opt-in):
- Save goggles preferences
- Build "My Garage" collection
- Save search filters
- Contribute community content
- Receive notifications/alerts

**Technical Approach:**
- Use session storage for anonymous users
- Gentle prompts (not nags) for registration
- "Continue as guest" always available
- No "preview" limitations or feature teasing

---

### 2. Intuitive, Professional UX

**Guiding Principle:** *"Enjoyable without being silly"*

**What This Means:**
- ✅ Clean, modern design
- ✅ Purposeful animations (feedback, transitions)
- ✅ Professional color palette
- ✅ Clear typography hierarchy
- ✅ Thoughtful whitespace
- ❌ No excessive animations or gimmicks
- ❌ No cartoon mascots or childish imagery
- ❌ No forced humor or memes
- ❌ Nothing that makes users roll their eyes

**Tone Guidelines:**
- Enthusiastic but not breathless
- Knowledgeable but not condescending
- Welcoming but not overly casual
- Technical when appropriate but accessible

**Example Good Copy:**
> "The 1965 Mustang introduced the 'pony car' segment and captured American imagination with its long hood, short deck proportions."

**Example Bad Copy (too silly):**
> "OMG! The '65 'Stang was EPIC! 🔥🔥🔥 This bad boy literally INVENTED cool cars!"

---

### 3. Performance & Responsiveness

**Performance Targets:**
- Initial page load: < 2 seconds
- API response: < 500ms (95th percentile)
- Time to interactive: < 3 seconds
- Smooth scrolling: 60 FPS
- Table updates: < 100ms (debounced)

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 320px, 768px, 1024px, 1440px
- Touch-friendly targets (minimum 44x44px)
- Swipe gestures on mobile
- Adaptive layouts (table → cards on mobile)

---

### 4. Accessibility (A11y)

**Standards:** WCAG 2.1 Level AA compliance

**Requirements:**
- Semantic HTML5 elements
- ARIA labels and roles
- Keyboard navigation (all features)
- Focus indicators (visible)
- Color contrast ratios (4.5:1 minimum)
- Screen reader compatibility
- Alt text for all images
- Skip to content link

**Testing:**
- Automated: Lighthouse, axe DevTools
- Manual: Keyboard-only navigation
- Screen reader: NVDA, JAWS, VoiceOver

---

### 5. Typography & Visual Hierarchy

**Font Stack:**
- Headings: `'Roboto Condensed', 'Arial Narrow', sans-serif`
- Body: `'Open Sans', 'Helvetica Neue', sans-serif`
- Monospace (specs): `'Roboto Mono', 'Courier New', monospace`

**Scale:**
- H1: 2.5rem (40px)
- H2: 2rem (32px)
- H3: 1.5rem (24px)
- Body: 1rem (16px)
- Small: 0.875rem (14px)

**Color Palette:**
```
Primary:   #2C5F8D (Deep Blue)
Secondary: #C8102E (Classic Red)
Accent:    #F4A300 (Amber)
Success:   #4A7C59 (Forest Green)
Warning:   #E89D2A (Gold)
Danger:    #C8102E (Red)

Neutral:
- Text:    #1A1A1A (Almost Black)
- Gray-1:  #333333
- Gray-2:  #666666
- Gray-3:  #999999
- Gray-4:  #CCCCCC
- Gray-5:  #E5E5E5
- BG:      #F8F8F8 (Light Gray)
```

---

## Goggles System Design

### Concept Overview

**Metaphor:** "Goggles" represent different lenses through which to view the same vehicle data, adapting presentation to user needs without requiring explicit persona selection or login.

**Design Philosophy:**
- Visual, icon-based (not text-heavy)
- Fun but not silly
- Self-explanatory through design
- Instant switching (no page reload)
- Persistent sidebar placement

---

### Goggle Types (Phase 1 MVP)

#### 1. 👓 Standard View (Default)
**Icon:** Regular eyeglasses
**Target:** General Consumer
**Presentation:**
- Balanced information density
- Basic specs emphasized
- Reliability and value focus
- Simple language
- Moderate detail level

---

#### 2. 🔧 Tech Specs View
**Icon:** Wrench/Tools
**Target:** Motor Head
**Presentation:**
- Maximum information density
- Complete technical specifications
- Option codes and RPO details
- Parts availability indicators
- Matching numbers significance
- Forum links

---

#### 3. 📚 History Buff View
**Icon:** Book
**Target:** Jr. Motor Head / Historian
**Presentation:**
- Timeline emphasis
- Cultural context highlighted
- Designer/engineer profiles
- Period advertisements
- Evolution narratives
- Educational tone

---

#### 4. 💰 Investor View
**Icon:** Money bag / Dollar sign
**Target:** Investor/Collector
**Presentation:**
- Market value charts
- Rarity scores prominent
- ROI calculators
- Auction results
- Investment potential ratings
- Portfolio tracking

---

### Goggle Types (Future Phases)

#### 5. 🍺 Beer Goggles
**Icon:** Beer mug (or stylized goggles)
**Target:** All personas (fun discovery mode)
**Presentation:**
- Filters to "polarizing" vehicles
- "So ugly it's beautiful" category
- Unconventional design choices
- Cult classics
- Vehicles that defy conventional taste

**Criteria for inclusion:**
- Low general popularity scores
- High enthusiast devotion scores
- Distinctive/unusual styling
- "Acquired taste" characteristics

**Example Vehicles:**
- AMC Pacer
- Pontiac Aztek
- Subaru Baja
- Chrysler PT Cruiser
- Chevrolet SSR

**Tone:** Celebratory, not mocking
- "Unconventional Beauty"
- "Polarizing Classics"
- "Love It or Hate It"

---

#### 6. 🛠️ DIY View
**Icon:** Toolbox
**Target:** Hobbyist Mechanic
**Presentation:**
- Common problems highlighted
- Repair difficulty ratings
- Tool requirements
- DIY guides and videos
- Cost estimates

---

#### 7. 🎬 Period Correct View
**Icon:** Film camera
**Target:** Filmmaker/Creative
**Presentation:**
- Year-specific styling photos
- Color availability charts
- "What was common" context
- Period references
- Cultural associations

---

### Goggles Sidebar Implementation

**Visual Design:**

```
┌──────┐
│      │  ← Logo/Home
├──────┤
│  👓  │  ← Standard (active - highlighted)
├──────┤
│  🔧  │  ← Tech Specs (hover tooltip: "Motor Head View")
├──────┤
│  📚  │  ← History Buff
├──────┤
│  💰  │  ← Investor
├──────┤
│  🍺  │  ← Beer Goggles (fun easter egg placement)
├──────┤
│      │
│  ⚙️  │  ← Settings (collapsed by default)
└──────┘
```

**Behavior:**
- Fixed position (left side on desktop)
- Bottom nav bar on mobile
- Active goggle highlighted (background color + border)
- Hover shows tooltip with name
- Click switches view instantly
- Smooth CSS transitions (200ms)
- Keyboard accessible (Tab + Enter)

**State Persistence:**
- Anonymous users: Session storage (lost on tab close)
- Registered users: Saved to profile (restored on login)
- URL parameter optional: `?view=motorhead`

**Analytics Tracking:**
- Which goggles are most used
- Time spent in each view
- Switching patterns (Standard → Tech Specs, etc.)
- Conversion from anonymous → registered (per goggle)

---

## Research Questions

### 1. Terminology & Lexicon Study

**Research Goal:** Compile comprehensive glossary of enthusiast terminology to ensure AUTOS speaks the language of its users appropriately.

**Research Methods:**
- Forum analysis (top 10 classic car forums)
- YouTube comment mining (restoration channels)
- Car show interviews (attendee conversations)
- Magazine/blog content analysis

**Categories to Research:**

#### Complementary Terms (Positive)
*Expected findings:*
- "Numbers matching" - Original engine/trans in vehicle
- "Survivor" - Unrestored original condition vehicle
- "Resto-mod" - Restored with modern upgrades
- "Frame-off" - Complete disassembly restoration
- "Barn find" - Long-stored vehicle discovered
- "Trailer queen" - Show-only, never driven (can be negative)
- "Driver" - Usable daily, not show quality
- "Patina" - Original weathered finish (valued)

#### Pejorative Terms (Negative)
*Expected findings:*
- "Bondo bucket" - Excessive body filler
- "Rust bucket" - Severe corrosion
- "Trailer queen" - Over-restored, never driven (negative context)
- "Clone" - Replica of rare model
- "Tribute" - Modified to resemble different model
- "Hack job" - Poor quality work
- "Franken-[car]" - Mismatched parts

#### Technical Jargon (Assumed Knowledge)
*What Motor Heads expect others to know:*
- RPO codes
- Matching numbers
- VIN decoding
- Casting numbers
- Date codes
- Trim tags
- Build sheets

**Deliverable:** Glossary with:
- Term
- Definition (technical)
- Context (when used)
- Connotation (positive/negative/neutral)
- Example usage

---

### 2. "Goggles" Metaphor Validation

**Research Goal:** Determine if "goggles" resonates with users or if alternative terminology is clearer.

**Research Methods:**
- User testing with mockups (n=20)
- A/B testing of terminology
- Survey of car enthusiast communities

**Alternative Terms to Test:**
- Views
- Modes
- Filters
- Lenses
- Perspectives
- Facets

**Test Questions:**
- "What do you think clicking this icon does?"
- "How would you describe this feature to a friend?"
- "Does this make sense without explanation?"
- "Is this terminology appropriate for a car site?"

**Success Criteria:**
- >70% of users understand concept without explanation
- <20% find terminology "silly" or "eye-rolling"
- >60% find it "clever" or "intuitive"

---

### 3. "Beer Goggles" Feature Viability

**Research Goal:** Assess whether "Beer Goggles" feature provides genuine value or is just a clever idea.

**Key Questions:**
- Will enthusiasts actually use this?
- Does it risk offending owners of featured vehicles?
- Is there genuine demand for discovering "ugly" classics?

**Research Methods:**
- Survey: "Would you use a feature that shows polarizing vehicles?"
- Forum threads: "What are the ugliest cars you love?"
- Interview collectors of unconventional vehicles

**Value Proposition to Validate:**
- Surfaces hidden gems
- Challenges conventional beauty standards
- Provides entertainment/discovery
- Helps budget buyers find unloved bargains

**Risk Assessment:**
- Could be seen as mocking vehicles
- May alienate owners of featured vehicles
- Might be seen as unprofessional

**Mitigation Strategies:**
- Positive framing: "Unconventional Classics"
- Include owner testimonials: "Why I Love My [Ugly Car]"
- Celebrate uniqueness vs mocking appearance
- Opt-in for vehicle owners (community submission)

**Go/No-Go Decision Criteria:**
- If >50% positive reception → implement
- If 30-50% positive → refine concept
- If <30% positive → abandon feature

---

### 4. Additional Features Research

**Areas for Future Investigation:**

#### A. Community Features
- User-submitted restoration stories
- Photo galleries (before/after)
- Build threads (ongoing projects)
- Q&A forums
- Marketplace (parts, vehicles, services)

**Research:** Survey users on desired community features

#### B. Advanced Tools
- VIN decoder (comprehensive)
- Parts compatibility matrix
- Virtual garage builder (3D)
- Restoration cost calculator
- Market value trend forecaster

**Research:** Competitive analysis of existing tools, user wish lists

#### C. Mobile App
- Native iOS/Android apps vs PWA
- Camera-based VIN scanning
- Offline mode (save vehicles for reference)
- Car show companion mode

**Research:** Mobile usage analytics, user interviews

---

### 5. Monetization Research (If Required)

**Note:** MVP assumes no monetization, but future phases may require revenue.

**Potential Models to Research:**
- Freemium (basic free, premium features paid)
- Parts vendor advertising
- Affiliate partnerships (restoration suppliers)
- API licensing (commercial users)
- Sponsored content (ethically disclosed)

**User Sensitivity Research:**
- "How would you feel about ads on this site?"
- "Would you pay $X/month for premium features?"
- "What features would justify a subscription?"

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-11 | 1.0 | Initial consolidated document | Planning Session |

---

## Appendix: Persona Quick Reference

| Persona | Priority Level | Key Features | Active Goggle |
|---------|---------------|--------------|---------------|
| General Consumer | Medium | Reliability, Value, Simple Search | 👓 Standard |
| Motor Head | High (MVP) | Complete Specs, Parts, Forums | 🔧 Tech Specs |
| Jr. Motor Head | High (Phase 2) | History, Learning, Timelines | 📚 History Buff |
| Investor | Medium (Phase 2) | Values, Trends, Rarity | 💰 Investor |
| Parts Supplier | Low (Phase 3) | Market Data, Compatibility | Custom API |
| Historian | Medium (Phase 2) | Citations, Designers, Context | 📚 History Buff |
| Hobbyist Mechanic | Medium (Phase 3) | DIY Guides, Problems, Costs | 🛠️ DIY |
| Filmmaker | Low (Phase 3) | Period Accuracy, Photos, Culture | 🎬 Period Correct |

---

**Next Steps:**
1. Review and approve consolidated personas and features
2. Create UI mockups based on specifications
3. Conduct initial user research (terminology, goggles metaphor)
4. Begin frontend component development (picker table, goggles sidebar)