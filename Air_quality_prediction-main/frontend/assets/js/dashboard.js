document.addEventListener('DOMContentLoaded', () => {
  // Redirect if not logged in
  if (!localStorage.getItem('airhealthUser')) {
    window.location.href = 'index.html';
    return;
  }

  const profile = JSON.parse(localStorage.getItem('airhealthProfile') || '{}');

  // Elements
  const riskBadge = document.getElementById('risk-badge');
  const riskProbabilityEl = document.getElementById('risk-probability');
  const riskSummaryEl = document.getElementById('risk-summary');
  const adviceListEl = document.getElementById('advice-list');
  const dataUsedTable = document.getElementById('data-used');

  // Helper (backend expects string)
  const smokingToFeature = v => v;

  // Central renderer for backend response
  function renderRisk(d) {
    // AQI block
    const aqiEl = document.getElementById('aqi-value');
    const pm25El = document.getElementById('pm25-value');
    const pm10El = document.getElementById('pm10-value');
    const aqiAdviceEl = document.getElementById('aqi-advice');

    if (aqiEl) aqiEl.textContent = d.aqi ?? 'N/A';
    if (pm25El) pm25El.textContent = d.pm25 ?? 'N/A';
    if (pm10El) pm10El.textContent = d.pm10 ?? 'N/A';
    if (aqiAdviceEl) {
      aqiAdviceEl.textContent =
        typeof d.aqi === 'number'
          ? (d.aqi <= 50 ? 'Good air quality.' : 'Air quality is degraded—consider a mask outdoors.')
          : '';
    }

    // Risk badge + class
    const risk = d.risk || d.report?.['Risk Level'] || 'Unknown';
    if (riskBadge) {
      riskBadge.textContent = risk;
      riskBadge.style.display = 'block';
      riskBadge.classList.remove('status-good','status-warning','status-danger');
      if (/low/i.test(risk)) riskBadge.classList.add('status-good');
      else if (/moderate|medium/i.test(risk)) riskBadge.classList.add('status-warning');
      else riskBadge.classList.add('status-danger');
    }

    // Probability
    const prob = d.risk_probability ?? d.report?.['Risk Probability (%)'];
    if (riskProbabilityEl) {
      riskProbabilityEl.textContent = (typeof prob === 'number') ? `Risk Probability: ${prob}%` : '';
    }

    // Summary
    if (riskSummaryEl) {
      riskSummaryEl.textContent = d.report?.Summary || `Estimated status: ${risk}.`;
    }

    // Advice list
    const adviceArr = d.advice || d.report?.['Personalized Advice'] || [];
    if (adviceListEl) {
      adviceListEl.innerHTML = '';
      (Array.isArray(adviceArr) ? adviceArr : [adviceArr])
        .filter(Boolean)
        .forEach(line => {
          const li = document.createElement('li');
          li.textContent = String(line).replace(/^\s*[\u2022\-]\s*/, ''); // strip leading bullets
          adviceListEl.appendChild(li);
        });
    }

    // Data Used table
    const used = d.report?.['Data Used'] || {};
    if (dataUsedTable) {
      dataUsedTable.innerHTML = '';
      Object.entries(used).forEach(([k, v]) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.textContent = k;
        const td = document.createElement('td'); td.textContent = v;
        tr.append(th, td);
        dataUsedTable.appendChild(tr);
      });
    }
  }

  // API helper
  async function callRiskAPI(payload) {
    const res = await fetch('http://localhost:5000/health-risk', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  }

  // Calculate Risk
  document.getElementById('calculate-risk-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();

    const location = profile.location;
    let ageVal = Number(profile.age);
    if (isNaN(ageVal) || ageVal <= 0) ageVal = 30;
    const chronicResp = profile.chronicRespiratory || 'none';
    const heartDisease = profile.heartDisease || 'none';
    const smokingVal = profile.smoking;

    if (!location || !chronicResp || !heartDisease || !smokingVal) {
      if (riskBadge) {
        riskBadge.style.display = 'block';
        riskBadge.textContent = 'Error: Please complete your profile.';
        riskBadge.classList.remove('status-good','status-warning','status-danger');
        riskBadge.classList.add('status-danger');
      }
      return;
    }

    const hr = document.getElementById('wearable-hr-input')?.value;
    const s2 = document.getElementById('wearable-spo2-input')?.value;
    const cc = document.getElementById('wearable-cough-input')?.value;

    const payload = {
      location,
      age: ageVal,
      chronic_respiratory: chronicResp.toLowerCase(),
      heart_disease: heartDisease.toLowerCase(),
      smoking: smokingToFeature(smokingVal)
    };
    if (hr && s2 && cc) {
      payload.heart_rate = Number(hr);
      payload.spo2 = Number(s2);
      payload.cough_count = Number(cc);
    }

    if (riskBadge) {
      riskBadge.style.display = 'block';
      riskBadge.textContent = 'Calculating risk...';
      riskBadge.classList.remove('status-good','status-warning','status-danger');
    }

    try {
      const data = await callRiskAPI(payload);
      renderRisk(data);
      riskBadge?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      if (riskBadge) {
        riskBadge.textContent = 'Error: Failed to fetch health risk data.';
        riskBadge.classList.add('status-danger');
      }
    }
  });

  // Sync Wearable Data
  document.getElementById('sync-wearable')?.addEventListener('click', async (e) => {
    e.preventDefault();

    const location = profile.location;
    let ageVal = Number(profile.age);
    if (isNaN(ageVal) || ageVal <= 0) ageVal = 30;
    const chronicResp = profile.chronicRespiratory || 'none';
    const heartDisease = profile.heartDisease || 'none';
    const smokingVal = profile.smoking;

    if (!location || !chronicResp || !heartDisease || !smokingVal) {
      if (riskBadge) {
        riskBadge.style.display = 'block';
        riskBadge.textContent = 'Error: Please complete your profile.';
        riskBadge.classList.remove('status-good','status-warning','status-danger');
        riskBadge.classList.add('status-danger');
      }
      return;
    }

    if (riskBadge) {
      riskBadge.style.display = 'block';
      riskBadge.textContent = 'Syncing wearable data...';
      riskBadge.classList.remove('status-good','status-warning','status-danger');
    }

    try {
      // First call to get wearable-like values
      const baseData = await callRiskAPI({
        location,
        age: ageVal,
        chronic_respiratory: chronicResp.toLowerCase(),
        heart_disease: heartDisease.toLowerCase(),
        smoking: smokingVal
      });

      // Fill inputs
      const hrEl = document.getElementById('wearable-hr-input');
      const s2El = document.getElementById('wearable-spo2-input');
      const ccEl = document.getElementById('wearable-cough-input');
      if (hrEl) hrEl.value = baseData.heart_rate ?? '';
      if (s2El) s2El.value = baseData.spo2 ?? '';
      if (ccEl) ccEl.value = baseData.cough_count ?? '';

      // Second call including wearable data
      const finalData = await callRiskAPI({
        location,
        age: ageVal,
        chronic_respiratory: chronicResp.toLowerCase(),
        heart_disease: heartDisease.toLowerCase(),
        smoking: smokingVal,
        heart_rate: baseData.heart_rate,
        spo2: baseData.spo2,
        cough_count: baseData.cough_count
      });

      renderRisk(finalData);
      riskBadge?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      if (riskBadge) {
        riskBadge.textContent = 'Error: Failed to fetch health risk data.';
        riskBadge.classList.add('status-danger');
      }
    }
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('airhealthUser');
    window.location.href = 'index.html';
  });
});
