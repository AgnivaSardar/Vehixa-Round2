const RENDER_API_URL = 'https://vehixa-round2.onrender.com/api/v1';

async function getVehicles() {
  try {
    console.log('Fetching vehicles from Render...');
    
    const response = await fetch(`${RENDER_API_URL}/vehicles`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('\n✅ Vehicles found:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data && Array.isArray(data.data)) {
      console.log('\n📋 Vehicle IDs:');
      data.data.forEach(vehicle => {
        console.log(`- ${vehicle.manufacturer} ${vehicle.model}: ${vehicle.vehicleId}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error.message);
    process.exit(1);
  }
}

getVehicles();
