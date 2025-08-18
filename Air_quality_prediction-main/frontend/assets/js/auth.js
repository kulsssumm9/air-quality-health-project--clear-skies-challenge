// Toggle between Sign In and Sign Up forms
function showSignin() {
  document.getElementById('signin-form').style.display = 'grid';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('signin-toggle').classList.add('active');
  document.getElementById('signup-toggle').classList.remove('active');
}

function showSignup() {
  document.getElementById('signin-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'grid';
  document.getElementById('signup-toggle').classList.add('active');
  document.getElementById('signin-toggle').classList.remove('active');
}

// Sign In form submit handler
document.getElementById('signin-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  const storedProfile = JSON.parse(localStorage.getItem('airhealthProfile') || '{}');

  if (!storedProfile.email || !storedProfile.password) {
    alert("No user found. Please Sign Up first.");
    return;
  }

  if (storedProfile.email === email && storedProfile.password === password) {
    localStorage.setItem('airhealthUser', email); // Mark user logged in
    window.location.href = 'chatbot.html'; // Redirect on success
  } else {
    alert("Invalid email or password. Please try again.");
  }
});

// Sign Up form submit handler -- now with Age field included!
document.getElementById('signup-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const name = document.getElementById('signup-name').value.trim();
  const gender = document.getElementById('signup-gender').value;
  const location = document.getElementById('location').value.trim();
  const ageVal = document.getElementById('signup-age').value.trim();
  const chronicResp = document.getElementById('respiratory').value;
  const heartDisease = document.getElementById('heart').value;
  const smoking = document.getElementById('smoking').value;

  // Validate age (must be a positive integer)
  const age = Number(ageVal);
  if (!ageVal || isNaN(age) || age <= 0 || age > 120) {
    alert("Please enter a valid age between 1 and 120.");
    return;
  }

  // Simple validation
  if (!email || !password || !confirmPassword || !name || !gender || !location || !chronicResp || !heartDisease || !smoking) {
    alert("Please fill in all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  // Prepare profile object including age
  const profile = {
    email,
    password,
    name,
    gender,
    location,
    age,  // <-- Added age here
    chronicRespiratory: chronicResp,
    heartDisease,
    smoking
  };

  // Store profile and logged-in user email in localStorage
  localStorage.setItem('airhealthProfile', JSON.stringify(profile));
  localStorage.setItem('airhealthUser', email);

  alert("Signup successful! You can update your details any time on your personal page.");
  window.location.href = 'chatbot.html';  // Redirect after signup
});
