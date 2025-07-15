// client/js/main.js
const logoutBtn = document.getElementById("logoutBtn");
const currentPage = window.location.pathname.split("/").pop();

// Check authentication status
if (!isAuthenticated()) {
  alert("Unauthorized! Please log in.");
  window.location.href = "index.html";
}

// Check role-based access for admin page
if (currentPage === "admin.html" && !isAdmin()) {
  alert("Access denied! Admin privileges required.");
  window.location.href = "dashboard.html";
}

// Handle logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
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
