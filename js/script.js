document.getElementById('loginForm').addEventListener('submit', function(event) {
    // Mencegah halaman refresh
    event.preventDefault(); 
    
    // Pindah ke halaman dashboard
    window.location.href = "dashboard.html";
});