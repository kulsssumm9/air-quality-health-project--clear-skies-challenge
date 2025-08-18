import os
import sys
import traceback
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import requests

# Load environment variables
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
OPENWEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

# Load ML model
MODEL_PATH = os.path.join(BASE_DIR, "models", "riskmodel_balanced.pkl")
model = joblib.load(MODEL_PATH)

# Initialize Flask app once, with static folder serving frontend files
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "frontend"),
    static_url_path="/"
)

# Allow CORS for your frontend origins (adjust as needed).  
# For development only, you might use CORS(app) to allow all.
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"])

# --- Utility functions ---

def geocode_location(location_name):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": location_name, "key": GOOGLE_MAPS_API_KEY}
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    result = resp.json()
    if not result.get("results"):
        raise ValueError("Could not geocode location")
    loc = result["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"]

def fetch_aqi_pm(location_lat, location_lon):
    url = "http://api.openweathermap.org/data/2.5/air_pollution"
    params = {"lat": location_lat, "lon": location_lon, "appid": OPENWEATHER_API_KEY}
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    aqi = data["list"][0]["main"]["aqi"]  # 1-5 AQI scale from OpenWeather
    components = data["list"][0]["components"]
    pm25 = components.get("pm2_5")
    pm10 = components.get("pm10")
    return {
        "aqi": aqi * 50,  # approximate scale conversion
        "pm25": pm25,
        "pm10": pm10,
        "main_pollutants": "PM2.5, PM10"
    }

def simulate_wearable():
    import random
    return {
        "heart_rate": random.randint(60, 120),
        "spo2": random.randint(90, 99),
        "cough_count": random.randint(0, 20)
    }

def disease_encode(val, categories):
    try:
        return categories.index(val.lower())
    except Exception:
        return 0  # fallback to 'none'

def smoking_encode(val):
    mapping = ["never", "former", "regular", "occasional"]
    return disease_encode(val, mapping)

def chronic_resp_encode(val):
    mapping = ["none", "asthma", "bronchitis", "copd"]
    return disease_encode(val, mapping)

def heart_disease_encode(val):
    mapping = ["none", "cad", "arrhythmias"]
    return disease_encode(val, mapping)

# --- API Endpoints ---

@app.route("/aqi", methods=["POST"])
def get_aqi():
    data = request.get_json(force=True)
    location = data.get("location")
    if not location:
        return jsonify({"error": "Location required"}), 400
    try:
        lat, lon = geocode_location(location)
        aqi_data = fetch_aqi_pm(lat, lon)
        return jsonify({
            "location": location,
            "aqi": aqi_data["aqi"],
            "pm25": aqi_data["pm25"],
            "pm10": aqi_data["pm10"],
            "main_pollutants": aqi_data["main_pollutants"]
        })
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch AQI"}), 500

@app.route("/health-risk", methods=["POST"])
def health_risk():
    try:
        data = request.get_json(force=True)
        location = data.get("location")
        age = int(data.get("age", 30))
        chronic_respiratory = chronic_resp_encode(data.get("chronic_respiratory", "none"))
        heart_disease = heart_disease_encode(data.get("heart_disease", "none"))
        smoking = smoking_encode(data.get("smoking", "never"))

        if any([data.get(k) is None for k in ["aqi", "pm25", "pm10"]]):
            lat, lon = geocode_location(location)
            aqi_pm = fetch_aqi_pm(lat, lon)
            aqi = aqi_pm["aqi"]
            pm25 = aqi_pm["pm25"]
            pm10 = aqi_pm["pm10"]
        else:
            aqi = float(data["aqi"])
            pm25 = float(data["pm25"])
            pm10 = float(data["pm10"])

        heart_rate = data.get("heart_rate")
        spo2 = data.get("spo2")
        cough_count = data.get("cough_count")

        if heart_rate is None or spo2 is None or cough_count is None:
            wearable = simulate_wearable()
            heart_rate = wearable["heart_rate"]
            spo2 = wearable["spo2"]
            cough_count = wearable["cough_count"]

        features = [[
            aqi, pm25, pm10, age, chronic_respiratory, heart_disease,
            smoking, heart_rate, spo2, cough_count
        ]]
        risk_prediction = model.predict(features)[0]
        risk_prob = model.predict_proba(features)[0]
        risk_str = "High Risk" if risk_prediction == 1 else "Low Risk"

        advice_lines = []
        if risk_prediction == 1:
            advice_lines.append("• Avoid outdoor activities as much as possible, especially when AQI is high.")
            advice_lines.append("• Use certified air-purifying masks (N95/FFP2 or better) when going outside.")
            if pm25 and pm25 > 75:
                advice_lines.append(f"• PM2.5 levels are elevated ({pm25} µg/m3)—avoid exercising outdoors.")
            if pm10 and pm10 > 100:
                advice_lines.append(f"• PM10 is also high ({pm10} µg/m3), aggravating respiratory stress.")
            if spo2 and spo2 < 93:
                advice_lines.append("• Your oxygen saturation is low—monitor closely and consider a checkup.")
            if heart_disease or chronic_respiratory:
                advice_lines.append("• As you have a prior health condition, consult your doctor especially if you feel unwell.")
            if cough_count and cough_count > 10:
                advice_lines.append("• Your cough count is above average—track symptoms and seek medical advice if they worsen.")
            advice_lines.append("• Keep windows closed, use air purifiers indoors, and stay hydrated.")
        else:
            advice_lines.append("• Air quality is currently acceptable for most people.")
            advice_lines.append("• Masking is still advisable if you spend long periods outside in urban areas.")
            if pm25 and pm25 > 35:
                advice_lines.append(f"• Moderate PM2.5 detected ({pm25} µg/m3)—people with health conditions should reduce outdoor exposure.")
            if chronic_respiratory or heart_disease:
                advice_lines.append("• Continue regular medication, track symptoms, and have emergency contacts ready.")
            advice_lines.append("• Continue healthy habits: avoid smoking, monitor your health, and check AQI regularly.")

        report = {
            "Risk Level": risk_str,
            "Risk Probability (%)": round(100 * risk_prob[int(risk_prediction)], 2),
            "Summary": f"Based on your current health/lifestyle and local pollution, your estimated risk status is: {risk_str}.",
            "Data Used": {
                "AQI": aqi,
                "PM2.5 (µg/m3)": pm25,
                "PM10 (µg/m3)": pm10,
                "Age": age,
                "Chronic Respiratory Disease": ['none', 'asthma', 'bronchitis', 'copd'][chronic_respiratory],
                "Heart Disease": ['none', 'cad', 'arrhythmias'][heart_disease],
                "Smoking": ['never', 'former', 'regular', 'occasional'][smoking],
                "Heart Rate": heart_rate,
                "SPO2 (%)": spo2,
                "Cough Count": cough_count
            },
            "Personalized Advice": advice_lines
        }

        return jsonify({
            "risk": risk_str,
            "risk_probability": report["Risk Probability (%)"],
            "advice": advice_lines,
            "aqi": aqi,
            "pm25": pm25,
            "pm10": pm10,
            "main_pollutants": "PM2.5, PM10",
            "heart_rate": heart_rate,
            "spo2": spo2,
            "cough_count": cough_count,
            "report": report
        })

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    full_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
