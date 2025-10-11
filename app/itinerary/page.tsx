'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  mealCode: string;
  description: string;
}

interface HotelStay {
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType?: string;
  category?: string;
}

interface PricingSlab {
  pax: number;
  pricePerPerson: number;
  totalPrice: number;
}

interface HotelCategoryPricing {
  category: string;
  pricingSlabs: PricingSlab[];
}

type HotelCategoryLabel = '3 stars' | '4 stars' | '5 stars';

interface PricingCategoryTotals {
  adultPerPerson: number;
  singleSupplement: number;
  child0to2: number | 'FOC';
  child3to5: number | 'FOC';
  child6to11: number | 'FOC';
}

interface PricingTableRow {
  pax: number;
  categories: Record<HotelCategoryLabel, PricingCategoryTotals>;
}

interface SavedItineraryData {
  tourName: string;
  duration: string;
  days: DayItinerary[];
  inclusions: string;
  exclusions: string;
  information: string;
}

interface QuoteExpense {
  id: string;
  location?: string | null;
  description?: string | null;
  price?: number | null;
  singleSupplement?: number | null;
  child0to2?: number | null;
  child3to5?: number | null;
  child6to11?: number | null;
  vehicleCount?: number | null;
  pricePerVehicle?: number | null;
  hotelCategory?: HotelCategoryLabel;
}

type ExpenseCategory =
  | 'hotelAccommodation'
  | 'meals'
  | 'entranceFees'
  | 'sicTourCost'
  | 'tips'
  | 'transportation'
  | 'guide'
  | 'guideDriverAccommodation'
  | 'parking';

type QuoteDay = Record<ExpenseCategory, QuoteExpense[]> & {
  dayNumber: number;
  date: string;
};

interface QuoteResponse {
  id: number;
  quoteName: string;
  startDate: string;
  endDate: string;
  tourType: 'SIC' | 'Private';
  pax: number;
  markup: number;
  tax: number;
  transportPricingMode: 'total' | 'vehicle';
  pricingTable: PricingTableRow[] | null;
  days: QuoteDay[];
  createdAt: string;
  updatedAt: string;
  itineraryData?: SavedItineraryData | null;
}

interface TransferInfo {
  description: string;
  location?: string | null;
}

interface HotelsByCategoryEntry {
  city: string;
  categories: Record<HotelCategoryLabel, string[]>;
}

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isHotelCategoryLabel = (value: string | null | undefined): value is HotelCategoryLabel =>
  value === '3 stars' || value === '4 stars' || value === '5 stars';

const createEmptyHotelCategoryMap = (): Record<HotelCategoryLabel, string[]> => ({
  '3 stars': [],
  '4 stars': [],
  '5 stars': []
});

function ItineraryPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tourName, setTourName] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [hotels, setHotels] = useState<HotelStay[]>([]);
  const [hotelCategoryPricing, setHotelCategoryPricing] = useState<HotelCategoryPricing[]>([]);
  const [hotelsByCategory, setHotelsByCategory] = useState<HotelsByCategoryEntry[]>([]);
  const [inclusions, setInclusions] = useState<string>('');
  const [exclusions, setExclusions] = useState<string>('');
  const [information, setInformation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentQuoteId, setCurrentQuoteId] = useState<number | null>(null);
  const [isSavingItinerary, setIsSavingItinerary] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [hasSavedItinerary, setHasSavedItinerary] = useState<boolean>(false);

  const markUnsavedChanges = useCallback(() => setHasUnsavedChanges(true), []);
  const saveMessageTimeoutRef = useRef<number | null>(null);

  const displaySaveMessage = useCallback((message: string, duration = 4000) => {
    if (saveMessageTimeoutRef.current) {
      window.clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = null;
    }

    setSaveMessage(message);

    if (duration >= 0) {
      saveMessageTimeoutRef.current = window.setTimeout(() => {
        setSaveMessage('');
        saveMessageTimeoutRef.current = null;
      }, duration);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveMessageTimeoutRef.current) {
        window.clearTimeout(saveMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Auto-resize all textareas after content is loaded
  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [days, inclusions, exclusions, information, hotelCategoryPricing, hotelsByCategory]);

  const generateWithFunnyAI = useCallback(async (data: QuoteResponse) => {
    try {
      console.log('Starting Funny AI generation...');

      // Extract cities from quote data
      const cities = [
        ...new Set(
          data.days
            .map(day => day.hotelAccommodation?.[0]?.location)
            .filter(isNonEmptyString)
        )
      ];

      console.log('Extracted cities:', cities);

      if (cities.length === 0) {
        console.error('No cities found in quote data');
        throw new Error('No cities found in quote data');
      }

      // Extract interests from activities
      const allActivities = data.days.flatMap(day => [
        ...day.entranceFees.map(e => e.description).filter(isNonEmptyString),
        ...(data.tourType === 'SIC' ? day.sicTourCost.map(e => e.description).filter(isNonEmptyString) : [])
      ]);

      const interests: string[] = ['history', 'culture'];
      if (allActivities.some(a => a.toLowerCase().includes('museum'))) interests.push('art');
      if (allActivities.some(a => a.toLowerCase().includes('cruise') || a.toLowerCase().includes('boat'))) interests.push('nature');
      if (allActivities.some(a => a.toLowerCase().includes('balloon'))) interests.push('photography');

      // Extract detailed day-by-day services from quote
      const dayDetails = data.days.map((day, index) => {
        const isSIC = data.tourType === 'SIC';

        // Extract actual booked services
        const sicTours = day.sicTourCost.map(e => e.description).filter(isNonEmptyString);
        const entrances = day.entranceFees.map(e => e.description).filter(isNonEmptyString);
        const meals = day.meals.map(e => e.description).filter(isNonEmptyString);
        const transportation = day.transportation.map(e => e.description).filter(isNonEmptyString);
        const hotel = day.hotelAccommodation?.[0]?.description || '';
        const city = day.hotelAccommodation?.[0]?.location || '';

        return {
          day_number: index + 1,
          date: day.date,
          city: city,
          hotel: hotel,
          sic_tours: sicTours,
          entrance_fees: entrances,
          meals: meals,
          transportation: transportation,
          is_first_day: index === 0,
          is_last_day: index === data.days.length - 1
        };
      });

      console.log('Calling Funny AI API with detailed quote data:', {
        days: data.days.length,
        cities,
        tour_type: data.tourType,
        pax: data.pax,
        interests: [...new Set(interests)],
        day_details: dayDetails
      });

      // Extract just the date part (YYYY-MM-DD) from ISO datetime string
      const startDateOnly = data.startDate.split('T')[0];

      console.log('Start date formatted:', startDateOnly);

      // Call Funny AI via proxy API to avoid CORS issues
      const response = await fetch('/api/funny-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: data.days.length,
          cities: cities,
          tour_type: data.tourType,
          pax: data.pax,
          interests: [...new Set(interests)],
          start_date: startDateOnly,
          day_details: dayDetails  // Send actual booked services
        })
      });

      console.log('Funny AI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Funny AI error response:', errorText);
        throw new Error(`Funny AI request failed: ${response.status} - ${errorText}`);
      }

      const aiResult = await response.json();
      console.log('Funny AI result received:', aiResult);

      // Map Funny AI response to DayItinerary format
      const mappedDays: DayItinerary[] = data.days.map((quoteDay, index) => {
        const aiDay = aiResult.itinerary[index];
        let location = quoteDay.hotelAccommodation?.[0]?.location || '';

        // For last day, use previous day's location if current location is empty
        const isLastDay = index === data.days.length - 1;
        if (isLastDay && (!location || location === 'Location')) {
          location = index > 0 ? (data.days[index - 1].hotelAccommodation?.[0]?.location || 'Location') : 'Location';
        }

        if (!location) location = 'Location';

        // Generate meal code
        let mealCode = '(';
        if (index > 0) mealCode += 'B';

        const isSIC = data.tourType === 'SIC';
        const dayTourName = isSIC && quoteDay.sicTourCost.length > 0
          ? quoteDay.sicTourCost[0]?.description ?? ''
          : '';

        if (isSIC && dayTourName && dayTourName.toLowerCase().includes('full day')) {
          mealCode += mealCode.length > 1 ? '/L' : 'L';
        }

        const meals = quoteDay.meals.map(expense => expense.description).filter(isNonEmptyString);
        if (meals.some(meal => meal.toLowerCase().includes('lunch')) && !mealCode.includes('L')) {
          mealCode += mealCode.length > 1 ? '/L' : 'L';
        }
        if (meals.some(meal => meal.toLowerCase().includes('dinner'))) {
          mealCode += mealCode.length > 1 ? '/D' : 'D';
        }

        if (mealCode === '(') {
          mealCode = '(-)';
        } else {
          mealCode += ')';
          mealCode = mealCode.replace('(/', '(');
        }

        return {
          dayNumber: quoteDay.dayNumber,
          date: quoteDay.date,
          title: isLastDay ? `Day ${quoteDay.dayNumber} - ${location} - Departure` : `Day ${quoteDay.dayNumber} - ${location}`,
          mealCode,
          description: aiDay?.description || `Day ${quoteDay.dayNumber} in ${location}. Overnight in ${location}.`
        };
      });

      // Return title and days
      return {
        title: aiResult.title || data.quoteName,
        days: mappedDays
      };

    } catch (error) {
      console.error('Error generating with Funny AI:', error);
      return null;
    }
  }, []);

  const loadQuoteForItinerary = useCallback(async (quoteId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) {
        console.error(`Failed to load quote ${quoteId}`);
        setCurrentQuoteId(null);
        setHasUnsavedChanges(false);
        displaySaveMessage('Failed to load itinerary for this quote.', 5000);
        return;
      }

      const data = (await response.json()) as QuoteResponse;
      setCurrentQuoteId(data.id);
      displaySaveMessage('', -1);

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const nights = Math.max(
        0,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const daysCount = nights + 1;

      const defaultInclusions = [
        `- ${nights} nights accommodation in the mentioned hotels`,
        '- Meals are as per itinerary with code letters (B=Breakfast, L=Lunch, D=Dinner)',
        '- Return airport transfers on Private basis',
        '- Professional English-Speaking Guidance on tour days',
        `- Sightseeings as per itinerary on ${
          data.tourType === 'SIC' ? 'SIC (Group Tours)' : 'Private'
        } basis with entrance fees for mentioned places`,
        '- Local Taxes.'
      ].join('\n');

      const defaultExclusions = [
        '- Flights',
        '- Personal expenses',
        '- Drinks at meals',
        '- Tips and porterage at hotels',
        '- Tips to the driver and the guide.'
      ].join('\n');

      const defaultInformation = [
        '- Official Holidays and Religious Festivals: Grand Bazaar and Spice Market will be closed.',
        '- Grand Bazaar is closed on Sundays',
        '- Please be ready on lobby floor minimum 5 minutes prior to pick up time for the tours and transfers.'
      ].join('\n');

      let computedTourName = data.quoteName;
      let computedDuration = `${nights} Nights / ${daysCount} Days`;
      let computedDays: DayItinerary[] = [];
      let computedInclusions = defaultInclusions;
      let computedExclusions = defaultExclusions;
      let computedInformation = defaultInformation;

      const savedItinerary = data.itineraryData ?? null;

      if (savedItinerary) {
        // Load saved itinerary
        computedTourName = savedItinerary.tourName.trim().length
          ? savedItinerary.tourName
          : computedTourName;
        computedDuration = savedItinerary.duration.trim().length
          ? savedItinerary.duration
          : computedDuration;
        computedDays = savedItinerary.days.map(day => ({ ...day }));
        computedInclusions = savedItinerary.inclusions.trim().length
          ? savedItinerary.inclusions
          : defaultInclusions;
        computedExclusions = savedItinerary.exclusions.trim().length
          ? savedItinerary.exclusions
          : defaultExclusions;
        computedInformation = savedItinerary.information.trim().length
          ? savedItinerary.information
          : defaultInformation;
        setHasSavedItinerary(true);
        displaySaveMessage('Loaded saved itinerary', 3000);
      } else {
        // Use Funny AI to generate complete itinerary
        displaySaveMessage('Generating itinerary with Funny AI...', -1);
        const funnyAIResult = await generateWithFunnyAI(data);

        if (funnyAIResult) {
          computedTourName = funnyAIResult.title;
          computedDays = funnyAIResult.days;
          setHasSavedItinerary(false);
          displaySaveMessage('✓ Itinerary generated successfully! Review the content and save when ready.', 5000);
        } else {
          // Funny AI failed - show error
          displaySaveMessage('Failed to generate itinerary. Please try again.', 5000);
        }
      }

      setTourName(computedTourName);
      setDuration(computedDuration);
      setDays(computedDays);
      setInclusions(computedInclusions);
      setExclusions(computedExclusions);
      setInformation(computedInformation);
      // Only mark as saved if we loaded a saved itinerary, otherwise mark as unsaved for fresh generation
      setHasUnsavedChanges(!savedItinerary);

      const hotelStays: HotelStay[] = [];
      let currentHotelName = '';
      let checkInDate = '';
      let checkInCity = '';

      data.days.forEach((day, index) => {
        const [hotelInfo] = day.hotelAccommodation;
        if (!isNonEmptyString(hotelInfo?.description)) {
          return;
        }

        if (currentHotelName !== hotelInfo.description) {
          if (currentHotelName) {
            const categoryMatch = currentHotelName.match(/(\d)\s*[Ss]tar/);
            const category = categoryMatch ? `${categoryMatch[1]}-Star` : '4-Star';
            const firstIndex = data.days.findIndex(
              dayEntry => dayEntry.hotelAccommodation?.[0]?.description === currentHotelName
            );
            const nightsAtHotel = firstIndex >= 0 ? index - firstIndex : 0;

            hotelStays.push({
              hotelName: currentHotelName,
              city: checkInCity,
              checkIn: checkInDate,
              checkOut: day.date,
              nights: nightsAtHotel,
              category
            });
          }

          currentHotelName = hotelInfo.description;
          checkInDate = day.date;
          checkInCity = hotelInfo.location ?? 'N/A';
        }
      });

      if (currentHotelName) {
        const categoryMatch = currentHotelName.match(/(\d)\s*[Ss]tar/);
        const category = categoryMatch ? `${categoryMatch[1]}-Star` : '4-Star';
        const nightsAtHotel = data.days.filter(
          day => day.hotelAccommodation?.[0]?.description === currentHotelName
        ).length;

        hotelStays.push({
          hotelName: currentHotelName,
          city: checkInCity,
          checkIn: checkInDate,
          checkOut: data.endDate,
          nights: nightsAtHotel,
          category
        });
      }

      setHotels(hotelStays);

      const hotelsByCity: Record<string, Record<HotelCategoryLabel, string[]>> = {};

      data.days.forEach(day => {
        day.hotelAccommodation.forEach(hotelInfo => {
          const { location: city, description, hotelCategory } = hotelInfo;
          if (!isNonEmptyString(city) || !isNonEmptyString(description) || !isHotelCategoryLabel(hotelCategory)) {
            return;
          }

          if (!hotelsByCity[city]) {
            hotelsByCity[city] = createEmptyHotelCategoryMap();
          }

          const categoryList = hotelsByCity[city][hotelCategory];
          if (!categoryList.includes(description)) {
            categoryList.push(description);
          }
        });
      });

      const hotelsByCategoryArray: HotelsByCategoryEntry[] = Object.entries(hotelsByCity).map(
        ([city, categories]) => ({
          city,
          categories
        })
      );

      setHotelsByCategory(hotelsByCategoryArray);

      const selectedHotelCategories: HotelCategoryLabel[] = ['3 stars', '4 stars', '5 stars'];
      const markup = Number(data.markup ?? 0);
      const tax = Number(data.tax ?? 0);

      const toNumber = (value: number | null | undefined) =>
        typeof value === 'number' && Number.isFinite(value) ? value : 0;

      const calculateDayTotals = (day: QuoteDay, hotelCategory?: HotelCategoryLabel) => {
        const hotels =
          hotelCategory != null
            ? day.hotelAccommodation.filter(expense => expense.hotelCategory === hotelCategory)
            : day.hotelAccommodation;

        const perPersonTotal =
          hotels.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.meals.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.entranceFees.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.sicTourCost.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.tips.reduce((sum, expense) => sum + toNumber(expense.price), 0);

        const singleSupplementTotal =
          hotels.reduce((sum, expense) => sum + toNumber(expense.singleSupplement), 0) +
          day.meals.reduce((sum, expense) => sum + toNumber(expense.singleSupplement), 0) +
          day.entranceFees.reduce((sum, expense) => sum + toNumber(expense.singleSupplement), 0);

        const child0to2Total =
          hotels.reduce((sum, expense) => sum + toNumber(expense.child0to2), 0) +
          day.meals.reduce((sum, expense) => sum + toNumber(expense.child0to2), 0) +
          day.entranceFees.reduce((sum, expense) => sum + toNumber(expense.child0to2), 0) +
          day.sicTourCost.reduce((sum, expense) => sum + toNumber(expense.child0to2), 0);

        const child3to5Total =
          hotels.reduce((sum, expense) => sum + toNumber(expense.child3to5), 0) +
          day.meals.reduce((sum, expense) => sum + toNumber(expense.child3to5), 0) +
          day.entranceFees.reduce((sum, expense) => sum + toNumber(expense.child3to5), 0) +
          day.sicTourCost.reduce((sum, expense) => sum + toNumber(expense.child3to5), 0);

        const child6to11Total =
          hotels.reduce((sum, expense) => sum + toNumber(expense.child6to11), 0) +
          day.meals.reduce((sum, expense) => sum + toNumber(expense.child6to11), 0) +
          day.entranceFees.reduce((sum, expense) => sum + toNumber(expense.child6to11), 0) +
          day.sicTourCost.reduce((sum, expense) => sum + toNumber(expense.child6to11), 0);

        const generalTotal =
          day.transportation.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.guide.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.guideDriverAccommodation.reduce((sum, expense) => sum + toNumber(expense.price), 0) +
          day.parking.reduce((sum, expense) => sum + toNumber(expense.price), 0);

        return {
          perPersonTotal,
          singleSupplementTotal,
          child0to2Total,
          child3to5Total,
          child6to11Total,
          generalTotal
        };
      };

      const calculatePricingTable = (): PricingTableRow[] => {
        const paxSlabs = [2, 4, 6, 8, 10];

        return paxSlabs.map(currentPax => {
          const categoriesData: Partial<Record<HotelCategoryLabel, PricingCategoryTotals>> = {};

          selectedHotelCategories.forEach(category => {
            let totalPerPerson = 0;
            let totalSingleSupplement = 0;
            let totalChild0to2 = 0;
            let totalChild3to5 = 0;
            let totalChild6to11 = 0;
            let totalGeneral = 0;

            data.days.forEach(day => {
              const dayTotals = calculateDayTotals(day, category);
              totalPerPerson += dayTotals.perPersonTotal;
              totalSingleSupplement += dayTotals.singleSupplementTotal;
              totalChild0to2 += dayTotals.child0to2Total;
              totalChild3to5 += dayTotals.child3to5Total;
              totalChild6to11 += dayTotals.child6to11Total;
              totalGeneral += dayTotals.generalTotal;
            });

            const generalPerPerson = currentPax > 0 ? totalGeneral / currentPax : 0;
            const adultCost = totalPerPerson + generalPerPerson;
            const adultSubtotal = adultCost * currentPax;
            const adultWithMarkup = adultSubtotal * (1 + markup / 100);
            const adultFinal = adultWithMarkup * (1 + tax / 100);
            const adultPerPerson = currentPax > 0 ? adultFinal / currentPax : 0;

            const sglWithMarkup = totalSingleSupplement * (1 + markup / 100);
            const sglFinal = sglWithMarkup * (1 + tax / 100);

            const child0to2IsFOC = totalChild0to2 === 0;
            const child0to2WithMarkup = totalChild0to2 * (1 + markup / 100);
            const child0to2Final = child0to2WithMarkup * (1 + tax / 100);

            const child3to5IsFOC = totalChild3to5 === 0;
            const child3to5WithMarkup = totalChild3to5 * (1 + markup / 100);
            const child3to5Final = child3to5WithMarkup * (1 + tax / 100);

            const child6to11IsFOC = totalChild6to11 === 0;
            const child6to11WithMarkup = totalChild6to11 * (1 + markup / 100);
            const child6to11Final = child6to11WithMarkup * (1 + tax / 100);

            categoriesData[category] = {
              adultPerPerson: Math.round(adultPerPerson),
              singleSupplement: Math.round(sglFinal),
              child0to2: child0to2IsFOC ? 'FOC' : Math.round(child0to2Final),
              child3to5: child3to5IsFOC ? 'FOC' : Math.round(child3to5Final),
              child6to11: child6to11IsFOC ? 'FOC' : Math.round(child6to11Final)
            };
          });

          return {
            pax: currentPax,
            categories: categoriesData as Record<HotelCategoryLabel, PricingCategoryTotals>
          };
        });
      };

      const pricingTableData = data.pricingTable ?? calculatePricingTable();

      const categoryPricing = selectedHotelCategories.map(category => {
        const pricingSlabs = pricingTableData.map(row => {
          const categoryRates = row.categories[category];
          return categoryRates
            ? {
                pax: row.pax,
                pricePerPerson: categoryRates.adultPerPerson,
                totalPrice: categoryRates.adultPerPerson * row.pax
              }
            : {
                pax: row.pax,
                pricePerPerson: 0,
                totalPrice: 0
              };
        });

        return {
          category,
          pricingSlabs
        };
      });

      setHotelCategoryPricing(categoryPricing);
    } catch (error) {
      console.error('Error loading quote:', error);
      setCurrentQuoteId(null);
      setHasUnsavedChanges(false);
      displaySaveMessage('An unexpected error occurred while loading the itinerary.', 5000);
    } finally {
      setIsLoading(false);
    }
  }, [displaySaveMessage, generateWithFunnyAI]);

  const handleRegenerateItinerary = useCallback(async () => {
    if (!currentQuoteId) {
      displaySaveMessage('No quote loaded to regenerate.', 4000);
      return;
    }

    setIsRegenerating(true);
    try {
      displaySaveMessage('Regenerating itinerary with Funny AI...', -1);

      // Fetch quote data again
      const response = await fetch(`/api/quotes/${currentQuoteId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load quote:', response.status, errorText);
        throw new Error(`Failed to load quote data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Quote data loaded, generating with Funny AI...');

      // Generate with Funny AI
      const funnyAIResult = await generateWithFunnyAI(data);

      if (funnyAIResult) {
        console.log('Funny AI generation successful');
        setTourName(funnyAIResult.title);
        setDays(funnyAIResult.days);
        setHasSavedItinerary(false);
        setHasUnsavedChanges(true);
        displaySaveMessage('✓ Itinerary regenerated successfully! You can now review and save your changes.', 8000);
      } else {
        console.error('Funny AI returned null result');
        displaySaveMessage('Failed to regenerate itinerary. Check console for details.', 5000);
      }
    } catch (error) {
      console.error('Error regenerating itinerary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      displaySaveMessage(`Error: ${errorMessage}`, 5000);
    } finally {
      setIsRegenerating(false);
    }
  }, [currentQuoteId, generateWithFunnyAI, displaySaveMessage]);

  const handleSaveItinerary = useCallback(async () => {
    if (!currentQuoteId) {
      displaySaveMessage('No quote is loaded to save.', 4000);
      return;
    }

    setIsSavingItinerary(true);
    try {
      const response = await fetch(`/api/quotes/${currentQuoteId}/itinerary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tourName,
          duration,
          days,
          inclusions,
          exclusions,
          information
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save itinerary.';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = `Failed to save itinerary: ${errorData.error}`;
          }
        } catch (parseError) {
          console.error('Error parsing itinerary save response:', parseError);
        }
        displaySaveMessage(errorMessage, 5000);
        return;
      }

      displaySaveMessage('✓ Itinerary saved successfully!', 3000);
      setHasUnsavedChanges(false);
      setHasSavedItinerary(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      displaySaveMessage(`Failed to save itinerary: ${message}`, 5000);
      console.error('Error saving itinerary:', error);
    } finally {
      setIsSavingItinerary(false);
    }
  }, [currentQuoteId, days, displaySaveMessage, duration, exclusions, inclusions, information, tourName]);

  // Load quote if quoteId parameter is present
  useEffect(() => {
    const quoteId = searchParams.get('quote');
    if (quoteId && session) {
      loadQuoteForItinerary(quoteId);
    }
  }, [searchParams, session, loadQuoteForItinerary]);



  const updateDay = <K extends keyof DayItinerary>(
    dayIndex: number,
    field: K,
    value: DayItinerary[K]
  ) => {
    const newDays = [...days];
    newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
    setDays(newDays);
    markUnsavedChanges();
  };

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const isSaveDisabled = !currentQuoteId || isSavingItinerary || !hasUnsavedChanges;

  useEffect(() => {
    console.log("hasUnsavedChanges", hasUnsavedChanges);
    console.log("isSaveDisabled", isSaveDisabled);
  }, [hasUnsavedChanges, isSaveDisabled]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }


  if (!session) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        /* Make inputs look like regular text */
        .text-input, .text-area {
          border: none;
          outline: none;
          background: transparent;
          resize: none;
          font-family: inherit;
          line-height: inherit;
        }

        .text-input:hover, .text-area:hover {
          background: rgba(229, 231, 235, 0.3);
        }

        .text-input:focus, .text-area:focus {
          background: white;
          outline: 2px solid #e5e7eb;
          outline-offset: 2px;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          @page {
            size: A4;
            margin: 1.2cm 1.5cm;
          }

          /* Hide all non-printable elements */
          nav, button, .print\\:hidden {
            display: none !important;
          }

          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print\\:break-before {
            break-before: page;
            page-break-before: always;
          }

          /* Ensure backgrounds and borders print */
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Remove shadows and rounded corners for cleaner print */
          .shadow, .shadow-sm, .shadow-md, .shadow-lg, .rounded, .rounded-lg, .rounded-md {
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Remove borders from inputs when printing */
          input, textarea {
            border: none !important;
            outline: none !important;
            background: transparent !important;
          }

          /* Optimize table for print */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          /* Remove all unnecessary spacing */
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          /* Make sure the itinerary container fills the page properly */
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }

          /* Optimize spacing for PDF */
          .px-12 {
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
          }

          .pt-10 {
            padding-top: 1.5rem !important;
          }

          .pb-6 {
            padding-bottom: 0.75rem !important;
          }

          .py-8 {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }

          .mb-8 {
            margin-bottom: 1rem !important;
          }

          .mb-6 {
            margin-bottom: 0.75rem !important;
          }

          .space-y-6 > * + * {
            margin-top: 0.75rem !important;
          }

          /* Compact day descriptions */
          .mb-3 {
            margin-bottom: 0.5rem !important;
          }

          /* Reduce section spacing */
          .border-t {
            margin-top: 1rem !important;
          }

          .pt-6 {
            padding-top: 1rem !important;
          }

          /* Make text slightly smaller for better fit */
          body {
            font-size: 11pt !important;
          }

          h3 {
            font-size: 13pt !important;
            margin-bottom: 0.5rem !important;
          }

          .text-4xl {
            font-size: 20pt !important;
          }

          .text-2xl {
            font-size: 14pt !important;
          }

          .text-xl {
            font-size: 12pt !important;
          }

          .text-lg {
            font-size: 11pt !important;
          }

          .text-xs {
            font-size: 8pt !important;
          }

          /* Day description styling - smaller font and limited to 3-4 lines max */
          .space-y-6 .text-area {
            font-size: 9pt !important;
            line-height: 1.35 !important;
            max-height: 5.4rem !important; /* ~4 lines at 1.35 line-height = 4 * 1.35rem */
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 4 !important;
            -webkit-box-orient: vertical !important;
            text-overflow: ellipsis !important;
          }

          /* Logo sizing */
          .h-20 {
            height: 3.5rem !important;
          }

          .h-14 {
            height: 3rem !important;
          }

          /* Footer spacing */
          .mt-8 {
            margin-top: 1.5rem !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-100 print:bg-white">
        {/* Navigation */}
        <nav className="bg-white shadow-sm print:hidden border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Itinerary Builder
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 print:p-0 print:max-w-full">
        {days.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No itinerary loaded. Select a quote to get started.</p>
            <Link
              href="/quotes"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
            >
              Select Quote
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md print:shadow-none">
            {/* Header with Logo */}
            <div className="px-12 pt-10 pb-6">
              <div className="flex items-start justify-between mb-8">
                <Image
                  src="/images/Funny_Logo.png"
                  alt="Funny Tourism"
                  width={240}
                  height={80}
                  className="h-20 w-auto object-contain"
                  priority
                />
                <div className="text-right text-xs text-gray-600 leading-relaxed">
                  <p className="font-semibold text-sm text-gray-800">Funny Tourism</p>
                  <p className="mt-1">Mehmet Akif Ersoy Mah.</p>
                  <p>Hanımeli Sok No 5/B</p>
                  <p>Uskudar - Istanbul</p>
                  <p className="mt-2">www.funnytourism.com</p>
                  <p>info@funnytourism.com</p>
                </div>
              </div>

              {/* Tour Title and Duration */}
              <div className="text-center border-b-2 border-indigo-600 pb-6">
                {tourName.includes(':') ? (
                  <div>
                    <div className="text-4xl font-bold text-indigo-900 mb-1">
                      {tourName.split(':')[0].trim()}
                    </div>
                    <div className="text-2xl font-semibold text-indigo-700 mb-2">
                      {tourName.split(':')[1].trim()}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={tourName}
                    onChange={(e) => {
                      setTourName(e.target.value);
                      markUnsavedChanges();
                    }}
                    className="text-input text-4xl font-bold text-indigo-900 w-full text-center mb-2"
                    placeholder="Tour Package Name"
                  />
                )}
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    markUnsavedChanges();
                  }}
                  className="text-input text-lg text-gray-600 w-full text-center"
                  placeholder="X Nights / X Days"
                />
              </div>
            </div>

            {/* Day by Day Itinerary */}
            <div className="px-12 py-8 space-y-6">
              {days.map((day, index) => (
                <div key={index} className="mb-6 print:break-inside-avoid">
                  <div className="flex items-baseline justify-between mb-3">
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateDay(index, 'title', e.target.value)}
                      className="text-input flex-1 text-xl font-bold text-gray-900"
                      placeholder="Day X - Location"
                    />
                    <input
                      type="text"
                      value={day.mealCode}
                      onChange={(e) => updateDay(index, 'mealCode', e.target.value)}
                      className="text-input w-20 text-right text-gray-600 font-medium ml-4"
                      placeholder="(B/L/D)"
                    />
                  </div>
                  <textarea
                    value={day.description}
                    onChange={(e) => {
                      updateDay(index, 'description', e.target.value);
                      autoResizeTextarea(e);
                    }}
                    onInput={autoResizeTextarea}
                    className="text-area w-full text-gray-700 leading-relaxed text-justify overflow-hidden"
                    style={{ minHeight: '80px' }}
                    placeholder="Enter day description..."
                  />
                </div>
              ))}
            </div>

            {/* Inclusions */}
            <div className="px-12 pb-6 border-t border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Inclusions</h3>
              <textarea
                value={inclusions}
                onChange={(e) => {
                  setInclusions(e.target.value);
                  markUnsavedChanges();
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '120px' }}
                placeholder="• List inclusions here..."
              />
            </div>

            {/* Exclusions */}
            <div className="px-12 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Exclusions</h3>
              <textarea
                value={exclusions}
                onChange={(e) => {
                  setExclusions(e.target.value);
                  markUnsavedChanges();
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '100px' }}
                placeholder="• List exclusions here..."
              />
            </div>

            {/* Information */}
            <div className="px-12 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Important Information</h3>
              <textarea
                value={information}
                onChange={(e) => {
                  setInformation(e.target.value);
                  markUnsavedChanges();
                  autoResizeTextarea(e);
                }}
                onInput={autoResizeTextarea}
                className="text-area w-full text-gray-700 leading-relaxed overflow-hidden"
                style={{ minHeight: '100px' }}
                placeholder="• Add important information here..."
              />
            </div>

            {/* Hotels and Rates */}
            {hotels.length > 0 && (
              <div className="px-12 pb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Accommodation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-800">
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          City
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Check-In
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Check-Out
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Nights
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotels.map((hotel, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                            {hotel.city}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {new Date(hotel.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {new Date(hotel.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-center font-medium">
                            {hotel.nights} {hotel.nights === 1 ? 'Night' : 'Nights'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  * Accommodation will be provided in selected hotel category<br />
                  * Standard hotel check-in time: 14:00 | Standard check-out time: 12:00
                </p>
              </div>
            )}

            {/* Hotel Options by Category */}
            {hotelsByCategory.length > 0 && (() => {
              // Detect which categories have hotels
              const availableCategories: HotelCategoryLabel[] = [];
              (['3 stars', '4 stars', '5 stars'] as HotelCategoryLabel[]).forEach(category => {
                const hasHotels = hotelsByCategory.some(cityData =>
                  cityData.categories[category]?.length > 0
                );
                if (hasHotels) {
                  availableCategories.push(category);
                }
              });

              const numColumns = availableCategories.length + 1; // +1 for City column
              const dataColumnWidth = `${(100 - 15) / availableCategories.length}%`;

              return (
                <div className="px-12 pb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Hotel Options</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300" style={{minWidth: '600px'}}>
                      <colgroup>
                        <col style={{width: '15%'}} />
                        {availableCategories.map(cat => (
                          <col key={cat} style={{width: dataColumnWidth}} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-indigo-600 text-white">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold text-sm">City</th>
                          {availableCategories.includes('3 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">3-Star Hotels</th>
                          )}
                          {availableCategories.includes('4 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">4-Star Hotels</th>
                          )}
                          {availableCategories.includes('5 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">5-Star Hotels</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {hotelsByCategory.map((cityData, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900 text-sm align-top">
                              {cityData.city}
                            </td>
                            {availableCategories.includes('3 stars') && (
                              <td className="border border-gray-300 px-3 py-2 text-xs text-gray-700 text-center align-top">
                                {cityData.categories['3 stars']?.join(', ') || '-'}
                              </td>
                            )}
                            {availableCategories.includes('4 stars') && (
                              <td className="border border-gray-300 px-3 py-2 text-xs text-gray-700 text-center align-top">
                                {cityData.categories['4 stars']?.join(', ') || '-'}
                              </td>
                            )}
                            {availableCategories.includes('5 stars') && (
                              <td className="border border-gray-300 px-3 py-2 text-xs text-gray-700 text-center align-top">
                                {cityData.categories['5 stars']?.join(', ') || '-'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 italic">
                    * Final hotel selection will be based on your chosen category and availability
                  </p>
                </div>
              );
            })()}

            {/* Pricing */}
            {hotelCategoryPricing.length > 0 && (() => {
              // Detect which categories have hotels (same as Hotel Options table)
              const availableCategories: HotelCategoryLabel[] = [];
              (['3 stars', '4 stars', '5 stars'] as HotelCategoryLabel[]).forEach(category => {
                const hasHotels = hotelsByCategory.some(cityData =>
                  cityData.categories[category]?.length > 0
                );
                if (hasHotels) {
                  availableCategories.push(category);
                }
              });

              const dataColumnWidth = `${(100 - 15) / availableCategories.length}%`;

              return (
                <div className="px-12 pb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Package Rates</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300" style={{minWidth: '600px'}}>
                      <colgroup>
                        <col style={{width: '15%'}} />
                        {availableCategories.map(cat => (
                          <col key={cat} style={{width: dataColumnWidth}} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-indigo-600 text-white">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold text-sm">PAX / PP in DBL</th>
                          {availableCategories.includes('3 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">3-Star Hotels</th>
                          )}
                          {availableCategories.includes('4 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">4-Star Hotels</th>
                          )}
                          {availableCategories.includes('5 stars') && (
                            <th className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">5-Star Hotels</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {hotelCategoryPricing[0]?.pricingSlabs.map((slab, slabIndex) => {
                          // Find pricing for each category
                          const threeStar = hotelCategoryPricing.find(cp => cp.category === '3 stars');
                          const fourStar = hotelCategoryPricing.find(cp => cp.category === '4 stars');
                          const fiveStar = hotelCategoryPricing.find(cp => cp.category === '5 stars');

                          return (
                            <tr key={slabIndex} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900 text-sm">
                                {slab.pax} PAX
                              </td>
                              {availableCategories.includes('3 stars') && (
                                <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-700 text-sm">
                                  €{threeStar?.pricingSlabs[slabIndex].pricePerPerson || 0}
                                </td>
                              )}
                              {availableCategories.includes('4 stars') && (
                                <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-700 text-sm">
                                  €{fourStar?.pricingSlabs[slabIndex].pricePerPerson || 0}
                                </td>
                              )}
                              {availableCategories.includes('5 stars') && (
                                <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-700 text-sm">
                                  €{fiveStar?.pricingSlabs[slabIndex].pricePerPerson || 0}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

              <div className="mt-4">
                <p className="text-xs text-gray-500 italic">
                  * Prices are per person in Euro and may vary based on season and availability
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">
                  * Hotel category will be confirmed at time of booking
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-12 py-6 border-t-2 border-indigo-600 mt-8">
              <div className="flex items-center justify-between">
                <Image
                  src="/images/Funny_Logo.png"
                  alt="Funny Tourism"
                  width={200}
                  height={70}
                  className="h-14 w-auto object-contain opacity-80"
                />
                <div className="text-right text-xs text-gray-600 leading-relaxed">
                  <p className="font-semibold text-sm text-gray-800">Funny Tourism</p>
                  <p className="mt-1">Mehmet Akif Ersoy Mah. Hanımeli Sok No 5/B, Uskudar - Istanbul</p>
                  <p className="mt-1">www.funnytourism.com | info@funnytourism.com</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {days.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 print:hidden">
            {saveMessage && (
              <div className={`px-4 py-3 rounded-md text-sm font-medium ${
                saveMessage.includes('successfully') || saveMessage.includes('regenerated')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : saveMessage.includes('Failed') || saveMessage.includes('Error')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : saveMessage.includes('Generating') || saveMessage.includes('Regenerating')
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {saveMessage}
              </div>
            )}
            <div className="flex justify-end gap-3">
              {currentQuoteId && (
                <button
                  onClick={handleRegenerateItinerary}
                  disabled={isRegenerating}
                  className={`px-6 py-3 font-semibold rounded-md shadow-sm border transition-colors ${isRegenerating ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300'}`}
                >
                  {isRegenerating ? 'Regenerating...' : 'Regenerate with AI'}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-colors"
              >
                Print / Save PDF
              </button>
              <button
                onClick={handleSaveItinerary}
                disabled={isSaveDisabled}
                className={`px-6 py-3 font-semibold rounded-md shadow-sm border transition-colors ${isSaveDisabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
              >
                {isSavingItinerary ? 'Saving...' : 'Save Itinerary'}
              </button>
            </div>
          </div>
        )}
      </main>
      </div>
    </>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <ItineraryPageContent />
    </Suspense>
  );
}





