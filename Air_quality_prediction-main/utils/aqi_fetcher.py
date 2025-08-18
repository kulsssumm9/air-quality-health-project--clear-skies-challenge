import os
import requests

OPENWEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

def fetch_aqi_by_coords(lat, lon):
    """Fetch AQI (EPA-style), PM2.5, PM10 from OpenWeather Air Pollution API given lat/lon."""
    if not OPENWEATHER_API_KEY:
        raise RuntimeError("OpenWeather API key missing! Set WEATHER_API_KEY environment variable.")
    url = (
        f"http://api.openweathermap.org/data/2.5/air_pollution"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
    )
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    main = data["list"][0]["main"]
    components = data["list"][0]["components"]

    # OpenWeather aqi: 1(Good)-5(Very Poor). Map to EPA AQI for display/advice
    owm_aqi = main["aqi"]
    # Simple linear mapping; customize as needed for official scaling
    epa_aqi = {1: 50, 2: 100, 3: 150, 4: 200, 5: 300}.get(owm_aqi, owm_aqi*50)

    pm25 = components.get("pm2_5")
    pm10 = components.get("pm10")

    return {
        "aqi": epa_aqi,
        "aqi_raw": owm_aqi,
        "pm25": pm25,
        "pm10": pm10,
        "main_pollutants": "PM2.5, PM10"  # could make this smarter
    }
