import pandas as pd
import numpy as np
import random
import os
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# 1. Generate synthetic data
n = 1000
records = []
for _ in range(n):
    aqi = random.randint(10, 400)
    hr = random.randint(60, 120)
    spo2 = random.randint(85, 100)
    cough = random.randint(0, 30)
    asthma = random.choice([0, 1])
    # Rule-based label
    risk = int((aqi > 150) or (spo2 < 90) or (cough > 15) or (asthma and aqi > 100))
    records.append([aqi, hr, spo2, cough, asthma, risk])

df = pd.DataFrame(records, columns=["aqi","heart_rate","spo2","cough_count","asthma","risk"])
print("Data sample:\n", df.head())

# 2. Split into train/test
X = df[["aqi","heart_rate","spo2","cough_count","asthma"]]
y = df["risk"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train XGBoost classifier
model = XGBClassifier(use_label_encoder=False, eval_metric="logloss", random_state=42)
model.fit(X_train, y_train)

# 4. Evaluate
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# 5. Save model
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/aqi_health_model.pkl")
print("✅ Model trained and saved to models/aqi_health_model.pkl")
