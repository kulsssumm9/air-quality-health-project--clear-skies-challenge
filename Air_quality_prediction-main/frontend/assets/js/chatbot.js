document.addEventListener('DOMContentLoaded', () => {
  // Load user profile to get the location
  const profile = JSON.parse(localStorage.getItem('airhealthProfile') || '{}');
  const location = profile.location || "Your Area";

  // Function to map AQI to a descriptive category string
  function aqiCategory(aqi) {
    if (aqi <= 50) return " (Good)";
    if (aqi <= 100) return " (Moderate)";
    if (aqi <= 150) return " (Unhealthy for Sensitive Groups)";
    if (aqi <= 200) return " (Unhealthy)";
    if (aqi <= 300) return " (Very Unhealthy)";
    if (aqi > 300) return " (Hazardous)";
    return "";
  }

  // DOM elements for updating UI
  const locationSpan = document.getElementById('home-location');
  const aqiSpan = document.getElementById('home-aqi');
  const aqiDescSpan = document.getElementById('home-aqi-desc');
  const pm25Span = document.getElementById('home-pm25');
  const pm10Span = document.getElementById('home-pm10');
  const pollutantsSpan = document.getElementById('home-main-pollutants');
  const updatedSpan = document.getElementById('home-updated');

  locationSpan.textContent = location;
  updatedSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST';

  // Fetch AQI data from the new /aqi endpoint
  fetch('http://localhost:5000/aqi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: location })
  })
    .then(response => response.json())
    .then(data => {
      // Update AQI and description
      aqiSpan.textContent = data.aqi ?? '--';
      aqiDescSpan.textContent = aqiCategory(data.aqi ?? 0);

      // Update PM2.5 and PM10 values
      pm25Span.textContent = data.pm25 !== undefined && data.pm25 !== null ? data.pm25 : '--';
      pm10Span.textContent = data.pm10 !== undefined && data.pm10 !== null ? data.pm10 : '--';

      // Update main pollutants text
      pollutantsSpan.textContent = data.main_pollutants ?? 'PM2.5, PM10';
    })
    .catch(err => {
      console.error("Failed to fetch AQI data:", err);

      // Fallback UI updates
      aqiSpan.textContent = '--';
      aqiDescSpan.textContent = '';
      pm25Span.textContent = '--';
      pm10Span.textContent = '--';
      pollutantsSpan.textContent = '--';
    });

  // Logout button event handler
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('airhealthUser');
    window.location.href = 'index.html';
  });
});
