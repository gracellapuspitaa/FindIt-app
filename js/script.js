// Pastikan SweetAlert2 sudah ada di index.html
document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault(); // Stop form submit default

    const nim = document.getElementById("nim").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("errorMsg");

    errorMsg.textContent = "";

    const nimRegex = /^[0-9]+$/;
    const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;

    if (!nimRegex.test(nim)) {
        errorMsg.textContent = "NIM harus berupa angka saja!";
        return;
    }

    if (!passRegex.test(password)) {
        errorMsg.textContent = "Password harus kombinasi huruf dan angka!";
        return;
    }

    Swal.fire({
        title: 'Login Berhasil!',
        text: 'Menuju Dashboard...',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#002855',
        iconColor: '#FFCC00',
        willClose: () => {
            window.location.href = "dashboard.html";
        }
    });
});