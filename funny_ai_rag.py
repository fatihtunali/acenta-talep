#!/usr/bin/env python3
"""
Funny AI - Custom AI Assistant for Tour Itinerary Generation
Learns from pricing database and creates professional tour packages
Now with RAG (Retrieval Augmented Generation) from training itineraries
"""

import requests
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from db_connector import PricingDatabaseConnector

class FunnyAI:
    def __init__(self, model="mistral:7b", ai_api_url="https://itinerary-ai.ruzgargucu.com/v1/generate"):
        self.model = model
        self.ai_api_url = ai_api_url
        self.db = PricingDatabaseConnector()

        # Knowledge base of popular Turkish destinations
        self.cities_info = {
            "Istanbul": {
                "description": "Historic city bridging Europe and Asia",
                "highlights": ["Hagia Sophia", "Blue Mosque", "Topkapi Palace", "Grand Bazaar", "Bosphorus Cruise"],
                "typical_days": 3
            },
            "Cappadocia": {
                "description": "Famous for fairy chimneys and hot air balloons",
                "highlights": ["Hot Air Balloon Ride", "Goreme Open Air Museum", "Underground Cities", "Uchisar Castle"],
                "typical_days": 2
            },
            "Ephesus": {
                "description": "Ancient Greek city with remarkable ruins",
                "highlights": ["Library of Celsus", "Great Theatre", "Temple of Artemis", "House of Virgin Mary"],
                "typical_days": 1
            },
            "Pamukkale": {
                "description": "White travertine terraces and ancient Hierapolis",
                "highlights": ["Travertine Pools", "Hierapolis Ancient City", "Cleopatra Pool"],
                "typical_days": 1
            },
            "Antalya": {
                "description": "Mediterranean coast with beaches and history",
                "highlights": ["Kaleici Old Town", "Duden Waterfalls", "Perge Ancient City", "Beaches"],
                "typical_days": 2
            }
        }

    def _call_ollama(self, prompt: str, temperature: float = 0.7) -> str:
        """Call AI API"""
        try:
            response = requests.post(
                self.ai_api_url,
                json={
                    "prompt": prompt,
                    "temperature": temperature
                },
                timeout=60
            )

            if response.status_code == 200:
                return response.json().get("result", "")
            else:
                return f"Error calling AI API: {response.status_code}"
        except Exception as e:
            return f"Error: {str(e)}"

    def _extract_day_examples(self, training_content: str, max_examples: int = 3) -> List[str]:
        """Extract individual day descriptions from training itinerary"""
        examples = []
        lines = training_content.split('\n')
        current_day = []

        for line in lines:
            line = line.strip()
            # Check if line starts a new day (various formats)
            if line.startswith('Day ') or line.startswith('DAY '):
                # Save previous day if exists
                if current_day:
                    day_text = ' '.join(current_day).strip()
                    if len(day_text) > 50:  # Only keep substantial descriptions
                        examples.append(day_text)
                    if len(examples) >= max_examples:
                        break
                current_day = []
            elif line and not line.startswith('('):  # Skip meal codes like (B)
                current_day.append(line)

        # Add last day
        if current_day and len(examples) < max_examples:
            day_text = ' '.join(current_day).strip()
            if len(day_text) > 50:
                examples.append(day_text)

        return examples[:max_examples]

    def generate_itinerary(self, params: Dict) -> Dict:
        """
        Generate complete professional tour itinerary

        params:
            - days: int (total tour days)
            - cities: List[str] (cities to visit)
            - tour_type: str (SIC or Private)
            - pax: int (number of travelers)
            - interests: List[str] (history, nature, food, etc.)
            - start_date: str (YYYY-MM-DD)
        """
        days = params.get("days", 7)
        cities = params.get("cities", ["Istanbul", "Cappadocia"])
        tour_type = params.get("tour_type", "Private")
        pax = params.get("pax", 2)
        interests = params.get("interests", ["history", "culture"])
        start_date_str = params.get("start_date", datetime.now().strftime("%Y-%m-%d"))

        # RAG: Fetch training examples matching tour type and similar duration
        print(f"Fetching training examples for {tour_type} tours with ~{days} days...")
        training_itineraries = self.db.get_training_itineraries(
            tour_type=tour_type,
            days=days,
            limit=3
        )

        # Extract day examples from training itineraries
        training_day_examples = []
        for itinerary in training_itineraries:
            examples = self._extract_day_examples(itinerary['content'], max_examples=2)
            training_day_examples.extend(examples)

        print(f"Found {len(training_day_examples)} training examples to learn from")

        # Generate professional tour title
        title = self._generate_title(cities, days, tour_type, training_itineraries)

        # Distribute days among cities intelligently
        day_distribution = self._distribute_days(cities, days)

        # Generate day-by-day itinerary
        itinerary = []
        current_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        current_city = None
        day_number = 1

        for city, city_days in day_distribution.items():
            for day_in_city in range(city_days):
                is_first_day = (day_number == 1)
                is_last_day = (day_number == days)
                is_city_change = (current_city != city)

                day_info = self._generate_day(
                    day_number=day_number,
                    city=city,
                    previous_city=current_city,
                    is_first_day=is_first_day,
                    is_last_day=is_last_day,
                    is_city_change=is_city_change,
                    tour_type=tour_type,
                    interests=interests,
                    training_examples=training_day_examples  # Pass RAG examples
                )

                itinerary.append({
                    "day": day_number,
                    "date": current_date.strftime("%Y-%m-%d"),
                    "city": city,
                    **day_info
                })

                current_city = city
                current_date += timedelta(days=1)
                day_number += 1

        return {
            "title": title,
            "tour_type": tour_type,
            "duration": days,
            "cities": cities,
            "pax": pax,
            "itinerary": itinerary,
            "generated_at": datetime.now().isoformat(),
            "learned_from": len(training_itineraries)
        }

    def _generate_title(self, cities: List[str], days: int, tour_type: str, training_itineraries: List[Dict] = None) -> str:
        """Generate professional tour package title, learning from training examples"""

        # Extract titles from training examples for style learning
        example_titles = []
        if training_itineraries:
            for itinerary in training_itineraries[:3]:
                if itinerary.get('title'):
                    example_titles.append(itinerary['title'])

        examples_text = ""
        if example_titles:
            examples_text = "\n\nExamples from your professional itineraries:\n" + "\n".join(f"- \"{title}\"" for title in example_titles)

        prompt = f"""Generate a professional, attractive tour package title for a {days}-day {tour_type} tour of Turkey visiting {', '.join(cities)}.

Requirements:
- Keep it concise (5-10 words)
- Make it sound professional and appealing
- Include the word "Turkey"
- Do NOT include the number of days
{examples_text}

Generate ONLY the title, nothing else:"""

        title = self._call_ollama(prompt, temperature=0.8).strip()
        # Remove quotes if AI adds them
        title = title.strip('"\'')
        return title

    def _distribute_days(self, cities: List[str], total_days: int) -> Dict[str, int]:
        """Intelligently distribute days among cities"""
        distribution = {}

        if len(cities) == 1:
            distribution[cities[0]] = total_days
        else:
            # Use recommended days per city
            recommended = []
            for city in cities:
                typical = self.cities_info.get(city, {}).get("typical_days", 2)
                recommended.append(typical)

            # Scale to fit total days
            total_recommended = sum(recommended)
            for i, city in enumerate(cities):
                allocated = round((recommended[i] / total_recommended) * total_days)
                distribution[city] = max(1, allocated)  # At least 1 day per city

            # Adjust if rounding caused mismatch
            diff = total_days - sum(distribution.values())
            if diff != 0:
                # Add/subtract from city with most days
                max_city = max(distribution, key=distribution.get)
                distribution[max_city] += diff

        return distribution

    def _generate_day(self, day_number: int, city: str, previous_city: Optional[str],
                      is_first_day: bool, is_last_day: bool, is_city_change: bool,
                      tour_type: str, interests: List[str], training_examples: List[str] = None) -> Dict:
        """Generate description for a single day, learning from training examples"""

        city_info = self.cities_info.get(city, {})
        highlights = city_info.get("highlights", [])

        # Build context for AI
        context_parts = []

        if is_first_day:
            context_parts.append(f"This is arrival day in {city}. Start with arrival at airport, private transfer to hotel.")
        elif is_last_day:
            context_parts.append(f"This is departure day from {city}. End with private transfer to airport.")
        elif is_city_change:
            context_parts.append(f"Traveling from {previous_city} to {city} today.")
        else:
            context_parts.append(f"Full day in {city}.")

        context_parts.append(f"This is a {tour_type} tour.")
        context_parts.append(f"Main attractions: {', '.join(highlights[:3])}")
        context_parts.append(f"Traveler interests: {', '.join(interests)}")

        context = " ".join(context_parts)

        # Add real training examples if available
        examples_section = ""
        if training_examples and len(training_examples) > 0:
            examples_section = "\n\nREAL EXAMPLES FROM YOUR PROFESSIONAL ITINERARIES (learn from this writing style):\n\n"
            for i, example in enumerate(training_examples[:3], 1):
                # Clean up example (remove day numbers if present)
                clean_example = example
                if clean_example.startswith('Day '):
                    # Remove "Day X - City:" prefix
                    parts = clean_example.split('-', 1)
                    if len(parts) > 1:
                        clean_example = parts[1].strip()
                        if ':' in clean_example:
                            clean_example = clean_example.split(':', 1)[1].strip()

                examples_section += f"Example {i}: {clean_example[:300]}\n\n"

        prompt = f"""Write a professional tour itinerary description for this day:

{context}

CRITICAL RULES:
1. Do NOT start with day numbers or day titles (like "Day 1", "Day 4 -", etc.)
2. Do NOT mention breakfast on arrival day (first day of tour)
3. For full days in same city, always start with "After breakfast"
4. Only use "Upon arrival" for actual arrivals (first day or when arriving in a new city)
5. Do NOT invent details like meals, lunch on board, or services not mentioned in context
6. Only describe what is actually provided - be conservative and factual
7. If meals are not mentioned in context, do NOT mention them in description
8. LEARN FROM THE REAL EXAMPLES BELOW - match their professional tone and structure
{examples_section}
Generic examples of GOOD descriptions:
- Arrival day: "Upon arrival at Istanbul Airport, you will be met and privately transferred to your hotel. Rest of the day at leisure."
- Full day: "After breakfast, enjoy a full day exploring Istanbul. Visit the Hagia Sophia and Blue Mosque. Return to hotel."
- City change: "After breakfast, fly from Istanbul to Cappadocia. Upon arrival, visit the Goreme Open Air Museum."
- Departure day: "After breakfast, check out and transfer to the airport for your departure flight."

Examples of BAD descriptions (avoid these):
- "Day 1 - Istanbul: Upon arrival..."
- "Upon arrival in Istanbul" (when already in Istanbul)
- "Breakfast is included" (on arrival day)
- "Enjoy lunch on board" (when lunch is not included)
- "At own expense" (don't mention optional purchases)

Write 2-3 sentences describing the day's activities. Be factual and conservative - only describe what is actually provided. Match the professional writing style from the real examples above.

Description:"""

        description = self._call_ollama(prompt, temperature=0.7).strip()

        return {
            "description": description,
            "activities": highlights[:2],
            "meals": ["Breakfast"] if not is_first_day else [],
            "accommodation": f"Hotel in {city}" if not is_last_day else None
        }

    def suggest_activities(self, city: str, interests: List[str] = None) -> List[Dict]:
        """Suggest activities for a city based on interests"""
        # Get SIC tours from database
        sic_tours = self.db.get_sic_tours_by_city(city)

        # Get sightseeing options
        sightseeing = self.db.sightseeing_by_city(city)

        activities = []
        for tour in sic_tours:
            activities.append({
                "name": tour["name"],
                "type": "SIC Tour",
                "city": city
            })

        for sight in sightseeing:
            activities.append({
                "name": sight["name"],
                "type": "Sightseeing",
                "entrance_fee": sight.get("entrance_fee", 0),
                "city": city
            })

        return activities

    def get_hotel_recommendations(self, city: str, category: str = "4 Star",
                                  check_in: str = None, check_out: str = None) -> List[Dict]:
        """Get hotel recommendations with pricing if dates provided"""
        hotels = self.db.get_hotels_by_city(city, category=category)

        recommendations = []
        for hotel in hotels:
            hotel_info = {
                "name": hotel["name"],
                "category": hotel["category"],
                "city": city
            }

            # Get pricing if dates provided
            if check_in and check_out:
                pricing = self.db.get_hotel_pricing(hotel["id"], check_in, check_out)
                if pricing:
                    hotel_info["pricing"] = pricing

            recommendations.append(hotel_info)

        return recommendations


# Simple test
if __name__ == "__main__":
    funny = FunnyAI()

    # Test itinerary generation
    test_params = {
        "days": 7,
        "cities": ["Istanbul", "Cappadocia"],
        "tour_type": "SIC",
        "pax": 2,
        "interests": ["history", "culture", "photography"],
        "start_date": "2025-05-01"
    }

    print("Generating test itinerary with RAG...")
    result = funny.generate_itinerary(test_params)
    print(json.dumps(result, indent=2))
