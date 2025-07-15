// client/js/auth.js
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const API_BASE = "http://localhost:5000/api/auth"; // change port if needed

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    try {
      // Clear previous error messages
      document.getElementById("loginError").innerText = "";
      
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // Store token and user role
        localStorage.setItem("token", data.token);
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        localStorage.setItem("userRole", payload.role);

        // Redirect based on role
        if (payload.role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } else {
        // Display specific error message from server
        document.getElementById("loginError").innerText = data.message || "Login failed. Please check your credentials.";
      }
    } catch (err) {
      console.error("Login error:", err);
      document.getElementById("loginError").innerText = "Connection error. Please check your internet connection and try again.";
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = signupForm.username.value;
    const email = signupForm.email.value;
    const password = signupForm.password.value;

    try {
      // Clear previous error messages
      document.getElementById("signupError").innerText = "";
      
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Signup successful! Please login.");
        window.location.href = "index.html";
      } else {
        // Display specific error message from server
        document.getElementById("signupError").innerText = data.message || "Signup failed. Please try again.";
      }
    } catch (err) {
      console.error("Signup error:", err);
      document.getElementById("signupError").innerText = "Connection error. Please check your internet connection and try again.";
    }
  });
}

// Function to check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expirationDate = new Date(payload.exp * 1000);
    return expirationDate > new Date();
  } catch {
    return false;
  }
}

// Function to check if user is admin
function isAdmin() {
  return localStorage.getItem("userRole") === "admin";
}
