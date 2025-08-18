import random

def simulate_wearable():
    return {
        "heart_rate": random.randint(60, 100),
        "spo2": random.randint(90, 100),
        "cough_count": random.randint(0, 10)
    }
