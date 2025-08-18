document.addEventListener('DOMContentLoaded', () => {
  // Load saved profile from localStorage or empty object
  const profile = JSON.parse(localStorage.getItem('airhealthProfile') || '{}');

  // Populate form fields with saved data or empty defaults
  document.getElementById('pName').value = profile.name || '';
  document.getElementById('pEmail').value = profile.email || '';
  document.getElementById('pGender').value = profile.gender || '';
  document.getElementById('pLocation').value = profile.location || '';
  document.getElementById('pAge').value = profile.age || '';
  document.getElementById('pChronicResp').value = profile.chronicRespiratory || '';
  document.getElementById('pHeartDisease').value = profile.heartDisease || '';
  document.getElementById('pSmoking').value = profile.smoking || '';

  // Attach submit event handler to the profile form
  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();

    // Read and trim form input values
    const name = document.getElementById('pName').value.trim();
    const gender = document.getElementById('pGender').value;
    const location = document.getElementById('pLocation').value.trim();
    const ageVal = document.getElementById('pAge').value.trim();
    const chronicRespiratory = document.getElementById('pChronicResp').value;
    const heartDisease = document.getElementById('pHeartDisease').value;
    const smoking = document.getElementById('pSmoking').value;

    // Validate age input
    const age = Number(ageVal);
    if (!ageVal || isNaN(age) || age <= 0 || age > 120) {
      alert('Please enter a valid age between 1 and 120.');
      return;
    }

    // Check required fields are not empty
    if (!name || !gender || !location || !chronicRespiratory || !heartDisease || !smoking) {
      alert('Please fill in all required fields.');
      return;
    }

    // Compose updated profile object, preserving any existing fields not edited here (like email)
    const updatedProfile = {
      ...profile, // preserve existing fields like email and possibly password
      name,
      gender,
      location,
      age,
      chronicRespiratory,
      heartDisease,
      smoking
    };

    // Save updated profile back to localStorage
    localStorage.setItem('airhealthProfile', JSON.stringify(updatedProfile));

    alert('Profile updated successfully!');
  });
});
