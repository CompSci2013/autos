"""
Body Class Classifier for AUTOS Application
Classifies vehicles by body class using rule-based patterns and historical data
Supports vehicles from 1908-2024
"""

import json
import re
from typing import Dict, List, Optional, Tuple


class BodyClassClassifier:
    """
    Classifies vehicles by body class using:
    1. Historical overrides (exact make/model/year matches)
    2. Exact model name matches
    3. Regex pattern matching
    4. Manufacturer-specific defaults
    5. Fallback heuristics
    """

    def __init__(
        self,
        patterns_file: str = 'body_class_patterns.json',
        overrides_file: str = 'historical_overrides.json',
        taxonomy_file: str = 'body_class_taxonomy.json'
    ):
        """Initialize classifier with pattern and override data"""
        self.patterns = self._load_json(patterns_file)
        self.overrides = self._load_json(overrides_file)
        self.taxonomy = self._load_json(taxonomy_file)

        # Compile regex patterns for performance
        self.compiled_patterns = self._compile_patterns()

        # Statistics tracking
        self.stats = {
            'total': 0,
            'historical_override': 0,
            'exact_match': 0,
            'regex_match': 0,
            'manufacturer_default': 0,
            'fallback': 0,
            'by_body_class': {}
        }

    def _load_json(self, filepath: str) -> dict:
        """Load JSON data file"""
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"⚠️  Warning: {filepath} not found")
            return {}
        except json.JSONDecodeError as e:
            print(f"⚠️  Warning: Error parsing {filepath}: {e}")
            return {}

    def _compile_patterns(self) -> Dict[str, List[re.Pattern]]:
        """Compile regex patterns for each body class"""
        compiled = {}

        patterns_data = self.patterns.get('patterns', {})

        for body_class, data in patterns_data.items():
            regex_patterns = data.get('regex_patterns', [])
            compiled[body_class] = [
                re.compile(pattern, re.IGNORECASE)
                for pattern in regex_patterns
            ]

        return compiled

    def classify(
        self,
        manufacturer: str,
        model: str,
        year: int
    ) -> Tuple[str, str]:
        """
        Classify vehicle and return (body_class, match_type)

        Args:
            manufacturer: Vehicle manufacturer (e.g., "Ford")
            model: Vehicle model (e.g., "Mustang")
            year: Model year (e.g., 1967)

        Returns:
            Tuple of (body_class, match_type)
            match_type: 'historical_override', 'exact_match', 'regex_match',
                       'manufacturer_default', 'fallback'
        """
        self.stats['total'] += 1

        # Normalize inputs
        manufacturer = manufacturer.strip()
        model = model.strip()

        # 1. Check historical overrides first (highest priority)
        override_class = self._check_historical_override(manufacturer, model, year)
        if override_class:
            self.stats['historical_override'] += 1
            self._update_body_class_stats(override_class)
            return (override_class, 'historical_override')

        # 2. Check exact model name matches
        exact_class = self._check_exact_match(model)
        if exact_class:
            self.stats['exact_match'] += 1
            self._update_body_class_stats(exact_class)
            return (exact_class, 'exact_match')

        # 3. Check regex patterns
        regex_class = self._check_regex_match(model)
        if regex_class:
            self.stats['regex_match'] += 1
            self._update_body_class_stats(regex_class)
            return (regex_class, 'regex_match')

        # 4. Check manufacturer-specific defaults
        default_class = self._check_manufacturer_default(manufacturer, model)
        if default_class:
            self.stats['manufacturer_default'] += 1
            self._update_body_class_stats(default_class)
            return (default_class, 'manufacturer_default')

        # 5. Fallback heuristics based on year and model name
        fallback_class = self._fallback_classification(manufacturer, model, year)
        self.stats['fallback'] += 1
        self._update_body_class_stats(fallback_class)
        return (fallback_class, 'fallback')

    def _check_historical_override(
        self,
        manufacturer: str,
        model: str,
        year: int
    ) -> Optional[str]:
        """Check for exact historical override match"""
        overrides_list = self.overrides.get('overrides', [])

        for override in overrides_list:
            if (override['manufacturer'].lower() == manufacturer.lower() and
                override['model'].lower() == model.lower()):

                year_range = override['year_range']
                if year_range[0] <= year <= year_range[1]:
                    return override['body_class']

        return None

    def _check_exact_match(self, model: str) -> Optional[str]:
        """Check for exact model name match in patterns"""
        patterns_data = self.patterns.get('patterns', {})

        for body_class, data in patterns_data.items():
            exact_matches = data.get('exact_matches', [])

            # Case-insensitive comparison
            for exact_model in exact_matches:
                if model.lower() == exact_model.lower():
                    return body_class

        return None

    def _check_regex_match(self, model: str) -> Optional[str]:
        """Check for regex pattern match"""
        for body_class, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                if pattern.search(model):
                    return body_class

        return None

    def _check_manufacturer_default(
        self,
        manufacturer: str,
        model: str
    ) -> Optional[str]:
        """Check manufacturer-specific model defaults"""
        defaults = self.patterns.get('manufacturer_defaults', {})

        mfr_defaults = defaults.get(manufacturer, {})

        # Try exact match first
        if model in mfr_defaults:
            return mfr_defaults[model]

        # Try partial match (e.g., "F-150" matches "F-Series")
        for model_pattern, body_class in mfr_defaults.items():
            if model_pattern.lower() in model.lower():
                return body_class

        return None

    def _fallback_classification(
        self,
        manufacturer: str,
        model: str,
        year: int
    ) -> str:
        """
        Fallback heuristics when no patterns match
        Uses year and common naming conventions
        """
        model_lower = model.lower()

        # Historical fallback (pre-1930)
        if year < 1930:
            # Most pre-1930 vehicles were touring cars or roadsters
            if any(word in model_lower for word in ['roadster', 'speedster', 'racer']):
                return 'Roadster'
            return 'Touring Car'

        # Check for common keywords in model name
        if any(word in model_lower for word in ['truck', 'pickup', '150', '250', '350']):
            return 'Pickup'

        if any(word in model_lower for word in ['van', 'caravan', 'voyager']):
            return 'Van'

        if any(word in model_lower for word in ['sport', 'gt', 'gto', 'ss', 'r/t']):
            return 'Sports Car'

        if any(word in model_lower for word in ['wagon', 'estate']):
            return 'Wagon'

        # Default to Sedan (most common body class)
        return 'Sedan'

    def _update_body_class_stats(self, body_class: str):
        """Update statistics for body class distribution"""
        if body_class not in self.stats['by_body_class']:
            self.stats['by_body_class'][body_class] = 0
        self.stats['by_body_class'][body_class] += 1

    def get_statistics(self) -> dict:
        """Return classification statistics"""
        return self.stats

    def print_statistics(self):
        """Print human-readable statistics"""
        print("\n" + "=" * 70)
        print("🔍 BODY CLASS CLASSIFICATION STATISTICS")
        print("=" * 70)

        print(f"\n📊 Total Vehicles Classified: {self.stats['total']:,}")

        print("\n📈 Classification Methods:")
        print(f"   Historical Override:    {self.stats['historical_override']:>6,} "
              f"({self._percentage(self.stats['historical_override'])})")
        print(f"   Exact Match:            {self.stats['exact_match']:>6,} "
              f"({self._percentage(self.stats['exact_match'])})")
        print(f"   Regex Match:            {self.stats['regex_match']:>6,} "
              f"({self._percentage(self.stats['regex_match'])})")
        print(f"   Manufacturer Default:   {self.stats['manufacturer_default']:>6,} "
              f"({self._percentage(self.stats['manufacturer_default'])})")
        print(f"   Fallback Heuristics:    {self.stats['fallback']:>6,} "
              f"({self._percentage(self.stats['fallback'])})")

        print("\n🚗 Body Class Distribution:")

        # Sort by count descending
        sorted_classes = sorted(
            self.stats['by_body_class'].items(),
            key=lambda x: x[1],
            reverse=True
        )

        for body_class, count in sorted_classes:
            percentage = self._percentage(count)
            pct_value = float(percentage.rstrip('%').strip())
            bar = '█' * int(pct_value // 2)  # Scale down by 2 for readability
            print(f"   {body_class:<20} {count:>6,} ({percentage}) {bar}")

        print("\n" + "=" * 70)

    def _percentage(self, count: int) -> str:
        """Calculate percentage with formatting"""
        if self.stats['total'] == 0:
            return "0%"
        pct = (count / self.stats['total']) * 100
        return f"{pct:>5.1f}%"


# Test function
def test_classifier():
    """Test the classifier with sample vehicles"""
    print("\n🧪 Testing Body Class Classifier\n")

    classifier = BodyClassClassifier()

    test_cases = [
        ("Ford", "Model T", 1920),
        ("Ford", "Mustang", 1967),
        ("Ford", "F-150", 2020),
        ("Chevrolet", "Corvette", 1963),
        ("Chevrolet", "Suburban", 1960),
        ("Dodge", "Charger", 1970),
        ("Dodge", "Charger", 2015),
        ("Tesla", "Model S", 2022),
        ("Pontiac", "GTO", 1969),
        ("Plymouth", "Barracuda", 1970),
        ("Jeep", "Wrangler", 2020),
        ("Chrysler", "Town & Country", 2010),
        ("Lincoln", "Navigator", 2021),
    ]

    print(f"{'Manufacturer':<15} {'Model':<20} {'Year':<6} {'Body Class':<20} {'Match Type'}")
    print("-" * 90)

    for mfr, model, year in test_cases:
        body_class, match_type = classifier.classify(mfr, model, year)
        print(f"{mfr:<15} {model:<20} {year:<6} {body_class:<20} {match_type}")

    classifier.print_statistics()


if __name__ == "__main__":
    test_classifier()
