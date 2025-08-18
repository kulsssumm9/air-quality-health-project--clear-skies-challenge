import os, requests

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def geocode_location(location):
    url = (
        "https://maps.googleapis.com/maps/api/geocode/json"
        f"?address={requests.utils.quote(location)}"
        f"&key={GOOGLE_MAPS_API_KEY}"
    )
    resp = requests.get(url)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        raise ValueError("Location not found")
    loc = results[0]["geometry"]["location"]
    return loc["lat"], loc["lng"]
