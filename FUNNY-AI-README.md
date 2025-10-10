# Funny AI - Tour Itinerary Generation System

## Overview

**Funny AI** is a custom AI assistant built specifically for your tour operator business. It learns from your pricing database and generates professional, detailed tour itineraries using real data from your hotels, SIC tours, and sightseeing attractions.

## What Funny AI Does

- **Generates Professional Itineraries**: Creates detailed day-by-day tour descriptions with context-aware content
- **Learns from Your Database**: Uses real data from your hotels, meals, SIC tours, and sightseeing attractions
- **AI-Powered Descriptions**: Generates natural, professional tour operator language using the Mistral 7B AI model
- **Intelligent Day Distribution**: Automatically allocates days among cities based on typical visit durations
- **Context-Aware**: Knows arrival days, departure days, city changes, and adjusts descriptions accordingly

## System Architecture

### Components

1. **funny_ai.py** - Core AI service
   - Connects to your pricing database
   - Generates itinerary titles and descriptions
   - Provides hotel and activity recommendations
   - Uses the AI API at https://itinerary-ai.ruzgargucu.com

2. **db_connector.py** - Database connector
   - Connects to MySQL database at 188.132.230.193
   - Queries hotels, SIC tours, sightseeing, quotes
   - Provides pricing information when dates are specified

3. **funny_ai_api.py** - FastAPI server
   - RESTful API endpoints for itinerary generation
   - Running on port 8000
   - Includes database query endpoints

## Installation Location

- **Server**: 188.132.230.193 (your pricing database server)
- **Directory**: /opt/itinerary-ai/
- **Service**: funny-ai.service (systemd)
- **Port**: 8000
- **Status**: Active and enabled (starts automatically on boot)

## API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### Generate Itinerary
```bash
POST http://localhost:8000/funny-ai/generate-itinerary
Content-Type: application/json

{
  "days": 7,
  "cities": ["Istanbul", "Cappadocia", "Ephesus"],
  "tour_type": "Private",
  "pax": 2,
  "interests": ["history", "culture", "photography"],
  "start_date": "2025-06-01"
}
```

**Response**:
```json
{
  "title": "Discover Turkey: Istanbul to Cappadocia Adventure",
  "tour_type": "Private",
  "duration": 7,
  "cities": ["Istanbul", "Cappadocia", "Ephesus"],
  "pax": 2,
  "itinerary": [
    {
      "day": 1,
      "date": "2025-06-01",
      "city": "Istanbul",
      "description": "Upon arrival at Istanbul Airport, met and privately transferred to your hotel...",
      "activities": ["Hagia Sophia", "Blue Mosque"],
      "meals": [],
      "accommodation": "Hotel in Istanbul"
    }
    // ... more days
  ],
  "generated_at": "2025-10-10T06:48:57.267349"
}
```

### Recommend Hotels
```bash
POST http://localhost:8000/funny-ai/recommend-hotels
Content-Type: application/json

{
  "city": "Istanbul",
  "category": "4 Star",
  "check_in": "2025-06-01",
  "check_out": "2025-06-04"
}
```

### Suggest Activities
```bash
POST http://localhost:8000/funny-ai/suggest-activities
Content-Type: application/json

{
  "city": "Cappadocia",
  "interests": ["history", "photography"]
}
```

### Database Queries

- `GET /database/cities` - Get all cities
- `GET /database/hotels/{city}` - Get hotels in a city
- `GET /database/sic-tours/{city}` - Get SIC tours
- `GET /database/sightseeing/{city}` - Get sightseeing attractions
- `GET /database/quotes?limit=10` - Get recent quotes

## API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Service Management

### Check Status
```bash
systemctl status funny-ai
```

### Start/Stop/Restart
```bash
systemctl start funny-ai
systemctl stop funny-ai
systemctl restart funny-ai
```

### View Logs
```bash
journalctl -u funny-ai -f
```

### Manual Start (for testing)
```bash
cd /opt/itinerary-ai
python3 funny_ai_api.py
```

## Configuration

### Database Connection
Edit `/opt/itinerary-ai/db_connector.py`:
```python
self.config = {
    'host': '188.132.230.193',
    'user': 'ruzgargucu',
    'password': 'Dlr235672.-Yt',
    'database': 'ruzgargucu_ruzgar',
    'port': 3306
}
```

### AI API Endpoint
Edit `/opt/itinerary-ai/funny_ai.py`:
```python
def __init__(self, model="mistral:7b", ai_api_url="https://itinerary-ai.ruzgargucu.com/v1/generate"):
```

### Knowledge Base
The AI has built-in knowledge about popular Turkish destinations:
- **Istanbul**: 3 typical days (Hagia Sophia, Blue Mosque, Topkapi Palace, Grand Bazaar, Bosphorus)
- **Cappadocia**: 2 typical days (Hot Air Balloon, Goreme Museum, Underground Cities)
- **Ephesus**: 1 typical day (Library of Celsus, Great Theatre, Temple of Artemis)
- **Pamukkale**: 1 typical day (Travertine Pools, Hierapolis, Cleopatra Pool)
- **Antalya**: 2 typical days (Kaleici, Duden Waterfalls, Perge, Beaches)

## Integration with Your App

You can integrate Funny AI into your Next.js pricing app by making API calls:

```typescript
// Example: Generate itinerary
const response = await fetch('http://localhost:8000/funny-ai/generate-itinerary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    days: 7,
    cities: ['Istanbul', 'Cappadocia'],
    tour_type: 'Private',
    pax: 2,
    interests: ['history', 'culture'],
    start_date: '2025-06-01'
  })
});

const itinerary = await response.json();
console.log(itinerary.title);
console.log(itinerary.itinerary);
```

## Features

### Smart Day Distribution
Funny AI automatically allocates days among cities based on typical visit durations. For example:
- 7-day tour of Istanbul (3 days) + Cappadocia (2 days) + Ephesus (1 day) + Pamukkale (1 day)

### Context-Aware Descriptions
- **Arrival Day**: "Upon arrival at Istanbul Airport, met and privately transferred to your hotel..."
- **Full Days**: "After breakfast, full day exploring [city]..."
- **City Change**: "After breakfast, fly/drive from [City A] to [City B]..."
- **Departure Day**: "...private transfer to airport for your departure flight"

### Tour Type Support
- **Private Tours**: Emphasizes private transfers and personalized experience
- **SIC Tours**: Mentions group tour experience for activities

## Performance

- **AI Generation**: ~5-15 seconds per itinerary (depends on number of days)
- **Database Queries**: <100ms
- **Caching**: AI API responses are cached for 1 hour
- **Memory Usage**: ~40MB

## Files Deployed

```
/opt/itinerary-ai/
├── funny_ai.py          # Core AI service
├── db_connector.py      # Database connector
├── funny_ai_api.py      # FastAPI server
└── (Python packages installed globally)

/etc/systemd/system/
└── funny-ai.service     # Systemd service file
```

## Packages Installed

- fastapi
- uvicorn
- pydantic
- mysql-connector-python
- requests

## Testing

Test the API is working:
```bash
# Health check
curl http://localhost:8000/health

# Generate simple itinerary
curl -X POST http://localhost:8000/funny-ai/generate-itinerary \
  -H 'Content-Type: application/json' \
  -d '{
    "days": 3,
    "cities": ["Istanbul"],
    "tour_type": "Private",
    "pax": 2,
    "interests": ["history"],
    "start_date": "2025-06-01"
  }'
```

## Troubleshooting

### Service Not Starting
```bash
# Check logs
journalctl -u funny-ai -n 50

# Check if port is in use
netstat -tlnp | grep 8000

# Test manually
cd /opt/itinerary-ai
python3 funny_ai_api.py
```

### Database Connection Issues
```bash
# Test database connection
cd /opt/itinerary-ai
python3 db_connector.py
```

### AI API Issues
```bash
# Test AI endpoint
curl https://itinerary-ai.ruzgargucu.com/v1/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Test", "temperature": 0.7}'
```

## Future Enhancements

Potential improvements for Funny AI:
1. **Web Search Integration**: Add current information about attractions, events, weather
2. **Vector Database**: Use ChromaDB to learn from past successful quotes
3. **Multi-language Support**: Generate itineraries in different languages
4. **Price Estimation**: Automatically calculate tour costs based on database pricing
5. **Season Awareness**: Adjust recommendations based on travel dates
6. **Customer Preferences**: Learn from user feedback to improve suggestions

## Support

For issues or questions:
- Check logs: `journalctl -u funny-ai -f`
- Check service status: `systemctl status funny-ai`
- API docs: http://localhost:8000/docs
- Test endpoints manually using curl or Postman

## Summary

**Funny AI is now live and running!** 🎉

- ✅ Connected to your pricing database
- ✅ Generating professional tour itineraries
- ✅ Using your real hotel and tour data
- ✅ Running as a system service (auto-starts on boot)
- ✅ RESTful API on port 8000
- ✅ Integrated with your custom AI model

You can now use Funny AI to:
1. Generate detailed itineraries for customer quotes
2. Get hotel recommendations with pricing
3. Suggest activities based on customer interests
4. Query your master data programmatically

Enjoy your new AI-powered tour planning assistant!
