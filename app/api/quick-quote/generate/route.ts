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

    for (const cityStay of cityStays) {
      try {
        // Resolve city ID
        const cityId = await resolveCityId(userId, { cityName: cityStay.city })

        // Get city name from database
        const [cityRows] = await pool.execute<RowDataPacket[]>(
          'SELECT name FROM cities WHERE id = ? AND user_id = ?',
          [cityId, userId]
        )
        const cityName = cityRows.length > 0 ? cityRows[0].name : cityStay.city

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

        let selectedHotel: any = null
        if (hotelRows.length > 0) {
          // Find pricing that matches the date range
          const hotel = hotelRows[0]
          const checkDate = new Date(days[dayIndex].date)

          if (hotel.pp_dbl_rate && isDateInRange(checkDate, hotel.start_date, hotel.end_date)) {
            selectedHotel = hotel
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
           JOIN sic_tour_pricing stp ON st.id = stp.sic_tour_id
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

        // Find transfer (for arrival at first city or inter-city transfers)
        const [transferRows] = await pool.execute<RowDataPacket[]>(
          `SELECT transfer_type, vehicle_type, price, max_pax
           FROM transfers
           WHERE user_id = ? AND city_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [userId, cityId]
        )

        const selectedTransfer = transferRows.length > 0 ? transferRows[0] : null

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
              hotelCategory: `${hotelCategory}-star`
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

        // Add transfer on arrival day (first day of city)
        if (selectedTransfer && dayIndex < days.length) {
          const vehicleCount = Math.ceil(pax / (selectedTransfer.max_pax || pax))
          days[dayIndex].transportation.push({
            id: generateId(),
            location: cityName,
            description: `${selectedTransfer.transfer_type} - ${selectedTransfer.vehicle_type}`,
            price: 0,
            vehicleCount: vehicleCount,
            pricePerVehicle: parseFloat(selectedTransfer.price) || 0
          })
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

    // Build response
    const result = {
      quoteName,
      tourType,
      startDate,
      endDate: days[days.length - 1]?.date || startDate,
      pax,
      hotelCategory,
      days,
      cityStays,
      markup: 10, // Default operator markup
      tax: 8, // Default tax
      agencyMarkup: session.user.role === 'admin' ? 0 : 15, // Default agency markup
      hasData: hasAnyData,
      missingData: missingData
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
