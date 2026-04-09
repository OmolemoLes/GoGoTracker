let trip = JSON.parse(localStorage.getItem("trip")) || [];

let map = L.map('map').setView([-25.7479, 28.2293], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// Load all saved trips
let trips = JSON.parse(localStorage.getItem("trips")) || [];
displayTrips();

function addTrip() {
    let start = document.getElementById("tripstart").value;
    let end = document.getElementById("tripend").value;
    let vehicleType = document.getElementById("vehicle").value;

    if (!start || !end || !vehicleType) {
        alert("Please fill in all fields and select a vehicle type.");
        return;
    }

    // Use GPS-calculated distance if available, otherwise use default
    let distance = 0;
    let time = 0;

    if (tripData.length >= 2) {
        distance = parseFloat(calculateTripDistance().toFixed(2));
        time = parseFloat(calculateTripTime().toFixed(2));
    } else {
        // Fallback: use a default distance or prompt user
        distance = parseFloat(prompt("Enter trip distance (km):", "10")) || 10;
        time = 0;
    }

    let factor = emissionFactors[vehicleType];
    let co2 = (distance * factor).toFixed(2);

    let trip = { start, end, distance, time, co2, vehicleType, factor, date: new Date().toLocaleString() };

    trips.push(trip);
    localStorage.setItem("trips", JSON.stringify(trips));

    displayTrips();
    updateStatus();
    renderChart();

    // Reset trip data after adding
    tripData = [];
    tripStartTime = null;
}

function displayTrips() {
    let container = document.getElementById("trips");
    container.innerHTML = "";

    trips.forEach(t => {
        let timeDisplay = t.time ? `<p>Duration: ${t.time} minutes</p>` : "";
        container.innerHTML += `
            
        <div class="trip-card">
            <p><strong>${t.start} → ${t.end}</strong></p>
            <p>Distance: ${t.distance} km</p>
            ${timeDisplay}
            <p>Vehicle: ${t.vehicleType}</p>
            <p>Emission Factor: ${t.factor} kg CO₂/km</p>
            <p><strong>Emissions: ${t.co2} kg CO₂</strong></p>
        </div>
        `;
    });
}

let tripActive = false;
let tripData = [];
let tripStartTime = null;

function tripstart() {
  tripActive = true;
  tripStartTime = new Date();
  tripData = [];
  document.getElementById("status").innerText = "Driving";

  navigator.geolocation.watchPosition((position) => {
    if (!tripActive) return;

    const speed = position.coords.speed
      ? position.coords.speed * 3.6
      : 0;

    document.getElementById("speed").innerText = speed.toFixed(1);

    tripData.push({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: speed,
      time: new Date().toISOString()
    });

  });
}

// Function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to calculate total distance from GPS data
function calculateTripDistance() {
    if (tripData.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < tripData.length; i++) {
        const dist = calculateDistance(
            tripData[i - 1].lat,
            tripData[i - 1].lng,
            tripData[i].lat,
            tripData[i].lng
        );
        totalDistance += dist;
    }
    return totalDistance;
}

// Function to calculate trip time in minutes
function calculateTripTime() {
    if (!tripStartTime) return 0;
    const durationMs = new Date() - tripStartTime;
    return durationMs / (1000 * 60); // Convert to minutes
}

function tripend() {
  tripActive = false;
  document.getElementById("status").innerText = "Stopped";

  if (tripData.length < 2) {
    alert("Trip too short to record. Please drive for longer.");
    return;
  }

  // Calculate distance and time from GPS data
  const distance = calculateTripDistance().toFixed(2);
  const time = calculateTripTime().toFixed(2);
  const vehicleType = document.getElementById("vehicle").value;

  if (!vehicleType) {
    alert("Please select a vehicle type first.");
    return;
  }

  const factor = emissionFactors[vehicleType];
  const co2 = (distance * factor).toFixed(2);

  const newTrip = {
    start: "GPS Start",
    end: "GPS End",
    distance: distance,
    time: time,
    co2: co2,
    vehicleType: vehicleType,
    factor: factor,
    date: new Date().toLocaleString()
  };

  trips.push(newTrip);
  localStorage.setItem("trips", JSON.stringify(trips));

  displayTrips();
  updateStatus();
  renderChart();

  // Reset for next trip
  tripData = [];
  tripStartTime = null;

  alert("Trip saved! Distance: " + distance + " km, Time: " + time + " minutes");
}

const emissionFactors = {
    petrol: 0.195,
    diesel: 0.173,
    electric: 0.051,          
    hybrid: 0.121
}

function updateStatus() {
    let totalDistance = 0;
    let totalCO2 = 0;

    trips.forEach(t => {
        totalDistance += t.distance;
        totalCO2 += parseFloat(t.co2);
    });

    document.getElementById("totalTrips").textContent = trips.length;
    document.getElementById("totalDistance").textContent = totalDistance + " km";
    document.getElementById("totalCO2").textContent = totalCO2.toFixed(2) + " kg";
}

displayTrips();
updateStatus();
renderChart();

let chart;

function renderChart() {
    // Group CO₂ by date
    let co2ByDate = {};

    trips.forEach(trip => {
        let date = trip.date;

        if (!co2ByDate[date]) {
            co2ByDate[date] = 0;
        }

        co2ByDate[date] += parseFloat(trip.co2);
    });

    let labels = Object.keys(co2ByDate);
    let data = Object.values(co2ByDate);

    const ctx = document.getElementById("co2Chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "CO₂ Emissions (kg)",
                data: data,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "CO₂ (kg)"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                }
            }
        }
    });
}

function addTrip() {
    let start = document.getElementById("tripstart").value;
    let end = document.getElementById("tripend").value;
    let vehicleType = document.getElementById("vehicle").value;

    let distance = Math.floor(Math.random() * 20) + 5;

    let factor = emissionFactors[vehicleType];
    let co2 = (distance * factor).toFixed(2);

    let trip = {
        tripstart,
        tripend,
        distance,
        co2,
        vehicleType,
        date: new Date().toLocaleString()
    };

    trips.push(trip);
    localStorage.setItem("trips", JSON.stringify(trips));

    displayTrips();
    updateStatus();
    renderChart(); // 👈 important
}

function displayTrips() {
    let container = document.getElementById("trips");
    container.innerHTML = "";

    trips.slice().reverse().forEach(t => {
        container.innerHTML += `
            <div class="trip-card">
                <strong>${t.start} → ${t.end}</strong><br>
                ${t.distance} km | ${t.co2} kg CO₂<br>
                <small>${t.date}</small>
            </div>
        `;
    });
}

app.get("/getTrips", auth, async (req, res) => {
    const trips = await Trip.find({ userId: req.user.id });
    res.json(trips);
});

function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}