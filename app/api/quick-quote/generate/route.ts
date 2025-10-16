import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pool from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import { resolveCityId } from '@/lib/cities'

interface CityStay {
  id: string
  city: string
  nights: number
}

interface GenerateRequest {
  quoteName: string
  cityStays: CityStay[]
  pax: number
  startDate: string
  hotelCategory: '3' | '4' | '5'
  tourType: 'Private' | 'SIC'
}

interface ExpenseItem {
  id: string
  location: string
  description: string
  price: number
  singleSupplement?: number
  child0to2?: number
  child3to5?: number
  child6to11?: number
  vehicleCount?: number
  pricePerVehicle?: number
  hotelCategory?: string
}

interface DayExpenses {
  dayNumber: number
  date: string
  hotelAccommodation: ExpenseItem[]
  meals: ExpenseItem[]
  entranceFees: ExpenseItem[]
  sicTourCost: ExpenseItem[]
  tips: ExpenseItem[]
  transportation: ExpenseItem[]
  guide: ExpenseItem[]
  guideDriverAccommodation: ExpenseItem[]
  parking: ExpenseItem[]
}

let idCounter = 0
const generateId = () => {
  idCounter++
  return `item-${Date.now()}-${idCounter}`
}

// Helper to check if a date is within a range
const isDateInRange = (date: Date, startDate: string | null, endDate: string | null): boolean => {
  if (!startDate && !endDate) return true
  if (startDate && new Date(date) < new Date(startDate)) return false
  if (endDate && new Date(date) > new Date(endDate)) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const data: GenerateRequest = await request.json()

    const { quoteName, cityStays, pax, startDate, hotelCategory, tourType } = data

    // Validation
    if (!quoteName || !cityStays?.length || !pax || !startDate || !hotelCategory || !tourType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate total days and generate day-by-day structure
    const totalNights = cityStays.reduce((sum, stay) => sum + stay.nights, 0)
    const days: DayExpenses[] = []
    const start = new Date(startDate)
    const currentDate = new Date(start)
    let dayCounter = 1

    // Generate days
    for (let i = 0; i <= totalNights; i++) {
      const dateStr = currentDate.toISOString().split('T')[0]

      days.push({
        dayNumber: dayCounter++,
        date: dateStr,
        hotelAccommodation: [],
        meals: [],
        entranceFees: [],
        sicTourCost: [],
        tips: [],
        transportation: [],
        guide: [],
        guideDriverAccommodation: [],
        parking: []
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Now populate expenses for each city stay
    let dayIndex = 0
    const totalCities = cityStays.length

    for (let cityIndex = 0; cityIndex < cityStays.length; cityIndex++) {
      const cityStay = cityStays[cityIndex]
      const isFirstCity = cityIndex === 0
      const isLastCity = cityIndex === totalCities - 1
      try {
        console.log(`[Quick Quote] Processing city: ${cityStay.city}, nights: ${cityStay.nights}`)

        // Resolve city ID
        const cityId = await resolveCityId(userId, { cityName: cityStay.city })
        console.log(`[Quick Quote] Resolved city ID: ${cityId}`)

        // Get city name from database
        const [cityRows] = await pool.execute<RowDataPacket[]>(
          'SELECT name FROM cities WHERE id = ? AND user_id = ?',
          [cityId, userId]
        )
        const cityName = cityRows.length > 0 ? cityRows[0].name : cityStay.city
        console.log(`[Quick Quote] City name from DB: ${cityName}`)

        // Find hotel for this city and category
        const [hotelRows] = await pool.execute<RowDataPacket[]>(
          `SELECT h.id, h.hotel_name, h.category,
                  hp.pp_dbl_rate, hp.single_supplement,
                  hp.child_0to2, hp.child_3to5, hp.child_6to11,
                  hp.start_date, hp.end_date
           FROM hotels h
           LEFT JOIN hotel_pricing hp ON h.id = hp.hotel_id
           WHERE h.user_id = ? AND h.city_id = ? AND h.category LIKE ?
           ORDER BY h.id DESC
           LIMIT 1`,
          [userId, cityId, `${hotelCategory}%`]
        )
        console.log(`[Quick Quote] Found ${hotelRows.length} hotels for city ${cityName}, category ${hotelCategory}`)

        let selectedHotel: any = null
        if (hotelRows.length > 0) {
          // Find pricing that matches the date range
          const hotel = hotelRows[0]
          const checkDate = new Date(days[dayIndex].date)
          console.log(`[Quick Quote] Hotel: ${hotel.hotel_name}, Price: ${hotel.pp_dbl_rate}, Date: ${days[dayIndex].date}, Range: ${hotel.start_date} to ${hotel.end_date}`)

          if (hotel.pp_dbl_rate && isDateInRange(checkDate, hotel.start_date, hotel.end_date)) {
            selectedHotel = hotel
            console.log(`[Quick Quote] ✓ Hotel selected: ${hotel.hotel_name}`)
          } else {
            console.log(`[Quick Quote] ✗ Hotel NOT selected - price: ${hotel.pp_dbl_rate}, inRange: ${isDateInRange(checkDate, hotel.start_date, hotel.end_date)}`)
          }
        }

        // Find breakfast option
        const [mealRows] = await pool.execute<RowDataPacket[]>(
          `SELECT r.restaurant_name, rmp.menu_option, rmp.price, rmp.start_date, rmp.end_date
           FROM restaurants r
           JOIN restaurant_menu_pricing rmp ON r.id = rmp.restaurant_id
           WHERE r.user_id = ? AND r.city_id = ?
           ORDER BY r.id DESC
           LIMIT 5`,
          [userId, cityId]
        )

        let breakfastOption: any = null
        for (const meal of mealRows) {
          if (meal.menu_option.toLowerCase().includes('breakfast') || meal.menu_option.toLowerCase().includes('b/b')) {
            const checkDate = new Date(days[dayIndex].date)
            if (isDateInRange(checkDate, meal.start_date, meal.end_date)) {
              breakfastOption = meal
              break
            }
          }
        }
        if (!breakfastOption && mealRows.length > 0) {
          breakfastOption = mealRows[0] // Fallback to first meal
        }

        // Find SIC tour if applicable
        const [sicTourRows] = await pool.execute<RowDataPacket[]>(
          `SELECT st.tour_name, stp.pp_dbl_rate, stp.single_supplement,
                  stp.child_0to2, stp.child_3to5, stp.child_6to11,
                  stp.start_date, stp.end_date
           FROM sic_tours st
           JOIN sic_tour_pricing stp ON st.id = stp.tour_id
           WHERE st.user_id = ? AND st.city_id = ?
           ORDER BY st.id DESC
           LIMIT 1`,
          [userId, cityId]
        )

        let selectedSicTour: any = null
        if (sicTourRows.length > 0 && tourType === 'SIC') {
          const tour = sicTourRows[0]
          const checkDate = new Date(days[dayIndex].date)
          if (isDateInRange(checkDate, tour.start_date, tour.end_date)) {
            selectedSicTour = tour
          }
        }

        // Query for specific transfer types based on city position
        let arrivalTransfer: any = null
        let departureTransfer: any = null
        let intercityTransfer: any = null

        if (isFirstCity) {
          // Get "Airport to Hotel" transfer for first city
          const [arrivalRows] = await pool.execute<RowDataPacket[]>(
            `SELECT transfer_type, price
             FROM transfers
             WHERE user_id = ? AND city_id = ? AND transfer_type LIKE '%Airport%Hotel%'
             ORDER BY id DESC
             LIMIT 1`,
            [userId, cityId]
          )
          arrivalTransfer = arrivalRows.length > 0 ? arrivalRows[0] : null
          console.log(`[Quick Quote] Airport arrival transfer: ${arrivalTransfer ? arrivalTransfer.transfer_type + ' €' + arrivalTransfer.price : 'not found'}`)
        }

        if (!isFirstCity) {
          // Get inter-city transfer for subsequent cities
          const previousCityId = await resolveCityId(userId, { cityName: cityStays[cityIndex - 1].city })
          const previousCityName = cityStays[cityIndex - 1].city

          // Try to find specific transfer with city names
          // First try: Look for "CityA to CityB - Flight"
          const [flightRows] = await pool.execute<RowDataPacket[]>(
            `SELECT transfer_type, price
             FROM transfers
             WHERE user_id = ? AND city_id = ?
             AND transfer_type LIKE CONCAT('%', ?, '%', ?, '%Flight%')
             LIMIT 1`,
            [userId, cityId, previousCityName, cityName]
          )

          if (flightRows.length > 0) {
            intercityTransfer = flightRows[0]
            console.log(`[Quick Quote] ✓ Found Flight transfer: ${intercityTransfer.transfer_type}`)
          } else {
            // Second try: Look for "CityA to CityB - Drive"
            const [driveRows] = await pool.execute<RowDataPacket[]>(
              `SELECT transfer_type, price
               FROM transfers
               WHERE user_id = ? AND city_id = ?
               AND transfer_type LIKE CONCAT('%', ?, '%', ?, '%Drive%')
               LIMIT 1`,
              [userId, cityId, previousCityName, cityName]
            )

            if (driveRows.length > 0) {
              intercityTransfer = driveRows[0]
              console.log(`[Quick Quote] ✓ Found Drive transfer: ${intercityTransfer.transfer_type}`)
            } else {
              // Last resort: Generic "Intercity Transfer"
              const [genericRows] = await pool.execute<RowDataPacket[]>(
                `SELECT transfer_type, price
                 FROM transfers
                 WHERE user_id = ? AND city_id IN (?, ?) AND transfer_type LIKE '%Intercity%'
                 ORDER BY id DESC
                 LIMIT 1`,
                [userId, previousCityId, cityId]
              )
              intercityTransfer = genericRows.length > 0 ? genericRows[0] : null
              console.log(`[Quick Quote] Fallback generic transfer: ${intercityTransfer ? intercityTransfer.transfer_type : 'not found'}`)
            }
          }

          console.log(`[Quick Quote] Inter-city transfer (${previousCityName} → ${cityName}): ${intercityTransfer ? intercityTransfer.transfer_type + ' €' + intercityTransfer.price : 'not found'}`)
        }

        if (isLastCity) {
          // Get "Hotel to Airport" transfer for last city
          const [departureRows] = await pool.execute<RowDataPacket[]>(
            `SELECT transfer_type, price
             FROM transfers
             WHERE user_id = ? AND city_id = ? AND transfer_type LIKE '%Hotel%Airport%'
             ORDER BY id DESC
             LIMIT 1`,
            [userId, cityId]
          )
          departureTransfer = departureRows.length > 0 ? departureRows[0] : null
          console.log(`[Quick Quote] Airport departure transfer: ${departureTransfer ? departureTransfer.transfer_type + ' €' + departureTransfer.price : 'not found'}`)
        }

        // Add hotel accommodation for each night in this city
        for (let night = 0; night < cityStay.nights; night++) {
          const currentDayIndex = dayIndex + night

          if (selectedHotel) {
            days[currentDayIndex].hotelAccommodation.push({
              id: generateId(),
              location: cityName,
              description: selectedHotel.hotel_name,
              price: parseFloat(selectedHotel.pp_dbl_rate) || 0,
              singleSupplement: selectedHotel.single_supplement ? parseFloat(selectedHotel.single_supplement) : 0,
              child0to2: selectedHotel.child_0to2 ? parseFloat(selectedHotel.child_0to2) : 0,
              child3to5: selectedHotel.child_3to5 ? parseFloat(selectedHotel.child_3to5) : 0,
              child6to11: selectedHotel.child_6to11 ? parseFloat(selectedHotel.child_6to11) : 0,
              hotelCategory: selectedHotel.category // Use actual DB value: "4 stars", "5 stars", etc.
            })
          }

          // Add breakfast
          if (breakfastOption) {
            days[currentDayIndex].meals.push({
              id: generateId(),
              location: cityName,
              description: `${breakfastOption.restaurant_name} - ${breakfastOption.menu_option}`,
              price: parseFloat(breakfastOption.price) || 0
            })
          }

          // Add SIC tour (only on first day of city stay, if applicable)
          if (night === 0 && selectedSicTour) {
            days[currentDayIndex].sicTourCost.push({
              id: generateId(),
              location: cityName,
              description: selectedSicTour.tour_name,
              price: parseFloat(selectedSicTour.pp_dbl_rate) || 0,
              singleSupplement: selectedSicTour.single_supplement ? parseFloat(selectedSicTour.single_supplement) : 0,
              child0to2: selectedSicTour.child_0to2 ? parseFloat(selectedSicTour.child_0to2) : 0,
              child3to5: selectedSicTour.child_3to5 ? parseFloat(selectedSicTour.child_3to5) : 0,
              child6to11: selectedSicTour.child_6to11 ? parseFloat(selectedSicTour.child_6to11) : 0
            })
          }
        }

        // Add arrival transfer for first city
        if (isFirstCity && arrivalTransfer && dayIndex < days.length) {
          days[dayIndex].transportation.push({
            id: generateId(),
            location: cityName,
            description: arrivalTransfer.transfer_type,
            price: 0,
            vehicleCount: 1,
            pricePerVehicle: parseFloat(arrivalTransfer.price) || 0
          })
          console.log(`[Quick Quote] ✓ Added: ${arrivalTransfer.transfer_type}`)
        }

        // Add inter-city transfer for subsequent cities
        if (!isFirstCity && intercityTransfer && dayIndex < days.length) {
          const previousCity = cityStays[cityIndex - 1].city
          days[dayIndex].transportation.push({
            id: generateId(),
            location: `${previousCity} → ${cityName}`,
            description: intercityTransfer.transfer_type,
            price: 0,
            vehicleCount: 1,
            pricePerVehicle: parseFloat(intercityTransfer.price) || 0
          })
          console.log(`[Quick Quote] ✓ Added: ${intercityTransfer.transfer_type} (${previousCity} → ${cityName})`)
        }

        // Add airport departure transfer on the last day of last city
        if (isLastCity && departureTransfer) {
          const lastDayIndex = dayIndex + cityStay.nights
          if (lastDayIndex < days.length) {
            days[lastDayIndex].transportation.push({
              id: generateId(),
              location: cityName,
              description: departureTransfer.transfer_type,
              price: 0,
              vehicleCount: 1,
              pricePerVehicle: parseFloat(departureTransfer.price) || 0
            })
            console.log(`[Quick Quote] ✓ Added: ${departureTransfer.transfer_type}`)
          }
        }

        // Add guide/driver for private tours
        if (tourType === 'Private') {
          // Add guide for the city (first day only)
          if (dayIndex < days.length) {
            days[dayIndex].guide.push({
              id: generateId(),
              location: cityName,
              description: `Professional guide for ${cityName}`,
              price: 0,
              vehicleCount: 1,
              pricePerVehicle: 100 // Default guide cost per day
            })
          }
        }

        dayIndex += cityStay.nights
      } catch (error) {
        console.error(`Error processing city ${cityStay.city}:`, error)
        // Continue with next city
      }
    }

    // Check if any data was found
    let hasAnyData = false
    const missingData: string[] = []

    for (const day of days) {
      if (day.hotelAccommodation.length > 0 ||
          day.meals.length > 0 ||
          day.transportation.length > 0 ||
          day.guide.length > 0 ||
          day.sicTourCost.length > 0) {
        hasAnyData = true
        break
      }
    }

    // Check what's missing for each city
    if (!hasAnyData) {
      for (const cityStay of cityStays) {
        const cityMissing: string[] = []

        // Check if hotel exists for this city
        const [hotelCheck] = await pool.execute<RowDataPacket[]>(
          'SELECT COUNT(*) as count FROM hotels WHERE user_id = ? AND city_id IN (SELECT id FROM cities WHERE user_id = ? AND name LIKE ?)',
          [userId, userId, `%${cityStay.city}%`]
        )
        if (hotelCheck[0].count === 0) {
          cityMissing.push('hotels')
        }

        // Check if meals exist for this city
        const [mealCheck] = await pool.execute<RowDataPacket[]>(
          'SELECT COUNT(*) as count FROM restaurants WHERE user_id = ? AND city_id IN (SELECT id FROM cities WHERE user_id = ? AND name LIKE ?)',
          [userId, userId, `%${cityStay.city}%`]
        )
        if (mealCheck[0].count === 0) {
          cityMissing.push('meals')
        }

        // Check if transfers exist for this city
        const [transferCheck] = await pool.execute<RowDataPacket[]>(
          'SELECT COUNT(*) as count FROM transfers WHERE user_id = ? AND city_id IN (SELECT id FROM cities WHERE user_id = ? AND name LIKE ?)',
          [userId, userId, `%${cityStay.city}%`]
        )
        if (transferCheck[0].count === 0) {
          cityMissing.push('transfers')
        }

        if (cityMissing.length > 0) {
          missingData.push(`${cityStay.city}: ${cityMissing.join(', ')}`)
        }
      }
    }

    // Save quote to database
    let savedQuoteId: number | null = null

    try {
      const connection = await pool.getConnection()
      try {
        await connection.beginTransaction()

        // Insert quote
        const [quoteResult] = await connection.execute<any>(
          `INSERT INTO quotes (user_id, quote_name, tour_type, start_date, end_date, pax, markup, tax, markup_percentage, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            quoteName,
            tourType,
            startDate,
            days[days.length - 1]?.date || startDate,
            pax,
            10, // markup
            8,  // tax
            session.user.role === 'admin' ? 0 : 15 // markup_percentage (agency markup)
          ]
        )

        savedQuoteId = quoteResult.insertId

        // Insert days and items
        for (const day of days) {
          const [dayResult] = await connection.execute<any>(
            'INSERT INTO quote_days (quote_id, day_number, date) VALUES (?, ?, ?)',
            [savedQuoteId, day.dayNumber, day.date]
          )
          const dayId = dayResult.insertId

          // Insert all expense items
          const allItems = [
            ...day.hotelAccommodation.map(item => ({ ...item, category: 'hotelAccommodation' })),
            ...day.meals.map(item => ({ ...item, category: 'meals' })),
            ...day.entranceFees.map(item => ({ ...item, category: 'entranceFees' })),
            ...day.sicTourCost.map(item => ({ ...item, category: 'sicTourCost' })),
            ...day.tips.map(item => ({ ...item, category: 'tips' })),
            ...day.transportation.map(item => ({ ...item, category: 'transportation' })),
            ...day.guide.map(item => ({ ...item, category: 'guide' })),
            ...day.guideDriverAccommodation.map(item => ({ ...item, category: 'guideDriverAccommodation' })),
            ...day.parking.map(item => ({ ...item, category: 'parking' }))
          ]

          for (const item of allItems) {
            await connection.execute(
              `INSERT INTO quote_expenses
               (quote_day_id, category, location, description, price, single_supplement, child_0to2, child_3to5, child_6to11, vehicle_count, price_per_vehicle, hotel_category)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                dayId,
                item.category,
                item.location || '',
                item.description || '',
                item.price || 0,
                item.singleSupplement || null,
                item.child0to2 || null,
                item.child3to5 || null,
                item.child6to11 || null,
                item.vehicleCount || null,
                item.pricePerVehicle || null,
                item.hotelCategory || null
              ]
            )
          }
        }

        await connection.commit()
        console.log(`[Quick Quote] ✓ Saved quote ID: ${savedQuoteId}`)
      } catch (error) {
        await connection.rollback()
        console.error('[Quick Quote] Error saving quote:', error)
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error('[Quick Quote] Database error:', error)
      // Continue even if save fails
    }

    // Generate AI itinerary descriptions
    let itinerary: any = { days: [] }

    try {
      console.log('[Quick Quote] Generating AI itinerary descriptions...')

      const cityList = cityStays.map(cs => cs.city).join(', ')
      const aiPrompt = {
        cities: cityStays,
        pax,
        tourType,
        hotelCategory,
        totalNights,
        days: days.map(day => ({
          dayNumber: day.dayNumber,
          date: day.date,
          hasHotel: day.hotelAccommodation.length > 0,
          hasMeals: day.meals.length > 0,
          hasTransportation: day.transportation.length > 0,
          hasActivities: day.sicTourCost.length > 0 || day.entranceFees.length > 0,
          hotelName: day.hotelAccommodation[0]?.description || '',
          cityName: day.hotelAccommodation[0]?.location || ''
        }))
      }

      const aiResponse = await fetch('https://itinerary-ai.ruzgargucu.com/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a day-by-day itinerary description for a ${totalNights}-night tour visiting ${cityList}.
          Tour type: ${tourType}. PAX: ${pax}. Hotel category: ${hotelCategory} stars.

          For each day, provide:
          1. A descriptive paragraph about the day's activities
          2. Specific activities with times (e.g., "09:00 AM - Hotel Check-in", "10:00 AM - City Tour", etc.)

          Format as JSON with this structure:
          {
            "days": [
              {
                "dayNumber": 1,
                "date": "YYYY-MM-DD",
                "city": "CityName",
                "description": "Full day description",
                "activities": [
                  { "time": "09:00 AM", "title": "Activity name", "description": "Activity details", "type": "hotel|meal|tour|transport|free-time" }
                ]
              }
            ]
          }`,
          data: aiPrompt
        })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        if (aiData.itinerary || aiData.days) {
          itinerary = aiData.itinerary || { days: aiData.days }
          console.log('[Quick Quote] ✓ AI itinerary generated successfully')
        }
      } else {
        console.error('[Quick Quote] AI API returned error:', await aiResponse.text())
      }
    } catch (error) {
      console.error('[Quick Quote] Error generating AI itinerary:', error)
      // Create fallback itinerary
      itinerary = {
        days: days.map((day, idx) => {
          const cityName = day.hotelAccommodation[0]?.location || cityStays[Math.floor(idx / (days.length / cityStays.length))]?.city || 'City'
          const isFirstDay = day.dayNumber === 1
          const isLastDay = day.dayNumber === days.length
          const hasTransportation = day.transportation.length > 0

          let description = ''
          const activities: any[] = []

          if (isFirstDay) {
            description = `Welcome to ${cityName}! Upon arrival at the airport, you'll be met by your transfer service and taken to your hotel. After check-in, enjoy the rest of the day at leisure to explore the local area or relax at your hotel.`
            if (hasTransportation) {
              activities.push({
                time: '10:00 AM',
                title: 'Airport Arrival & Transfer',
                description: `Arrival at airport and private transfer to hotel in ${cityName}`,
                type: 'transport'
              })
            }
            activities.push({
              time: '12:00 PM',
              title: 'Hotel Check-in',
              description: `Check in to ${day.hotelAccommodation[0]?.description || 'your hotel'}`,
              type: 'hotel'
            })
            activities.push({
              time: '02:00 PM',
              title: 'Free Time',
              description: 'Leisure time to explore the area or relax',
              type: 'free-time'
            })
          } else if (isLastDay) {
            description = `Your final day in ${cityName}. After breakfast and hotel check-out, transfer to the airport for your departure flight. We hope you enjoyed your journey!`
            if (day.meals.length > 0) {
              activities.push({
                time: '08:00 AM',
                title: 'Breakfast',
                description: day.meals[0].description || 'Hotel breakfast',
                type: 'meal'
              })
            }
            activities.push({
              time: '10:00 AM',
              title: 'Hotel Check-out',
              description: 'Check out from hotel',
              type: 'hotel'
            })
            if (hasTransportation) {
              activities.push({
                time: '11:00 AM',
                title: 'Airport Transfer',
                description: `Private transfer to airport for departure`,
                type: 'transport'
              })
            }
          } else {
            description = `Full day in ${cityName}. ${day.sicTourCost.length > 0 ? 'Join a guided tour to explore the city\'s highlights.' : 'Explore the city at your own pace.'} ${day.meals.length > 0 ? 'Meals included as per itinerary.' : ''}`

            if (day.meals.length > 0) {
              activities.push({
                time: '08:00 AM',
                title: 'Breakfast',
                description: day.meals[0].description || 'Hotel breakfast',
                type: 'meal'
              })
            }

            if (day.sicTourCost.length > 0) {
              activities.push({
                time: '09:00 AM',
                title: day.sicTourCost[0].description || 'City Tour',
                description: `Guided sightseeing tour of ${cityName}`,
                type: 'tour'
              })
            } else {
              activities.push({
                time: '10:00 AM',
                title: 'Free Time',
                description: `Leisure time to explore ${cityName}`,
                type: 'free-time'
              })
            }

            activities.push({
              time: '06:00 PM',
              title: 'Return to Hotel',
              description: 'Evening at leisure',
              type: 'free-time'
            })
          }

          return {
            dayNumber: day.dayNumber,
            date: day.date,
            city: cityName,
            description,
            activities
          }
        })
      }
    }

    // Build response with saved quote and itinerary
    const result = {
      quote: {
        id: savedQuoteId,
        quote_name: quoteName,
        name: quoteName, // Keep for backward compatibility
        tourType,
        startDate,
        endDate: days[days.length - 1]?.date || startDate,
        pax,
        hotelCategory: `${hotelCategory} stars`,
        days,
        cityStays,
        markup: 10,
        tax: 8,
        markup_percentage: session.user.role === 'admin' ? 0 : 15,
        agencyMarkup: session.user.role === 'admin' ? 0 : 15, // Keep for backward compatibility
        hasData: hasAnyData,
        missingData: missingData
      },
      itinerary
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating quick quote:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
