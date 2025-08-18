import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from joblib import dump
import os

np.random.seed(42)
n_samples = 3000

chronic_diseases = ['none', 'asthma', 'bronchitis', 'copd']
heart_diseases = ['none', 'cad', 'arrhythmias']
smoking_statuses = ['never', 'former', 'regular', 'occasional']

chronic_map = {d:i for i,d in enumerate(chronic_diseases)}
heart_map = {d:i for i,d in enumerate(heart_diseases)}
smoking_map = {s:i for i,s in enumerate(smoking_statuses)}

features = [
    'aqi', 'pm25', 'pm10', 'age', 'chronic_respiratory', 'heart_disease',
    'smoking', 'heart_rate', 'spo2', 'cough_count'
]

low_risk = []
high_risk = []

# Generate balanced samples by design
while len(low_risk) < n_samples//2 or len(high_risk) < n_samples//2:
    row = {
        'aqi': np.random.randint(10, 301),
        'pm25': np.random.randint(5, 151),
        'pm10': np.random.randint(10, 201),
        'age': np.random.randint(1, 91),
        'chronic_respiratory': np.random.choice(list(chronic_map.values())),
        'heart_disease': np.random.choice(list(heart_map.values())),
        'smoking': np.random.choice(list(smoking_map.values())),
        'heart_rate': np.random.randint(60, 120),
        'spo2': np.random.randint(85, 100),
        'cough_count': np.random.randint(0, 20)
    }
    # Risk scoring logic similar to before
    risk_score = (
        0.3 * (row['aqi'] / 300) +
        0.15 * (row['pm25'] / 150) +
        0.15 * (row['pm10'] / 200) +
        0.1 * (row['age'] / 90) +
        0.1 * (row['chronic_respiratory'] > 0) +
        0.1 * (row['heart_disease'] > 0) +
        0.1 * (row['smoking'] > 0) +
        0.1 * (1 - row['spo2'] / 100) +
        0.1 * ((row['heart_rate'] - 60) / 70) +
        0.1 * (row['cough_count'] / 30)
    )
    label = int(risk_score > 0.35)

    if label == 0 and len(low_risk) < n_samples//2:
        low_risk.append({**row,'risk':0})
    elif label == 1 and len(high_risk) < n_samples//2:
        high_risk.append({**row,'risk':1})

data = pd.DataFrame(low_risk+high_risk)
data = data.sample(frac=1, random_state=42).reset_index(drop=True)

X = data[features]
y = data['risk']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    random_state=42,
    n_estimators=100,
    class_weight='balanced'
)

model.fit(X_train, y_train)

os.makedirs("models", exist_ok=True)
dump(model, "models/riskmodel_balanced.pkl")

y_pred = model.predict(X_test)
print("Model trained and saved as models/riskmodel_balanced.pkl")
print("Classification Report:")
print(classification_report(y_test, y_pred, digits=4))
