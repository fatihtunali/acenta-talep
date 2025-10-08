async function testAPIs() {
  const baseUrl = 'http://localhost:3001';

  console.log('=== Testing API Endpoints ===\n');

  try {
    // Test hotels API
    console.log('1. Testing GET /api/hotels');
    const hotelsResponse = await fetch(`${baseUrl}/api/hotels`);
    const hotelsData = await hotelsResponse.json();
    console.log('Status:', hotelsResponse.status);
    console.log('Response structure:', JSON.stringify(hotelsData, null, 2));

    // Test restaurants API
    console.log('\n2. Testing GET /api/meals (restaurants)');
    const restaurantsResponse = await fetch(`${baseUrl}/api/meals`);
    const restaurantsData = await restaurantsResponse.json();
    console.log('Status:', restaurantsResponse.status);
    console.log('Response structure:', JSON.stringify(restaurantsData, null, 2));

    // Test SIC tours API
    console.log('\n3. Testing GET /api/sic-tours');
    const sicToursResponse = await fetch(`${baseUrl}/api/sic-tours`);
    const sicToursData = await sicToursResponse.json();
    console.log('Status:', sicToursResponse.status);
    console.log('Response structure:', JSON.stringify(sicToursData, null, 2));

    console.log('\n✅ All API tests completed!');
  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
  }
}

testAPIs();
