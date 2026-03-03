// FUNGSI POP-UP DETAIL
function showPopup(nama, status, jenis, pemilik, desc, telp) {
    let infoPemilik = jenis === 'Bertuan' ? `<p><b>Atas Nama:</b> ${pemilik}</p>` : '';
    
    Swal.fire({
        title: `<span style="color: #004E98">${nama}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Poppins'; font-size: 14px;">
                <div style="background: #f0f0f0; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                    <p><b>Status Keberadaan:</b> <span style="color: #FF6700">${status}</span></p>
                    <p><b>Jenis:</b> ${jenis}</p>
                    ${infoPemilik}
                </div>
                <p><b>Deskripsi:</b><br>${desc}</p>
                <hr style="margin: 15px 0;">
                <p style="text-align: center;"><b>Hubungi Penemu/Admin:</b></p>
                <a href="https://wa.me/${telp}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 10px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                    <i class="fab fa-whatsapp"></i> Hubungi via WhatsApp
                </a>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3A6EA5'
    });
}

// SIDEBAR ACCORDION FUNCTION
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar accordion functionality
    const labels = document.querySelectorAll('.menu-label');
    
    labels.forEach(label => {
        label.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Ambil sub-menu di bawahnya
            const subMenu = this.nextElementSibling;
            
            if (subMenu && subMenu.classList.contains('sub-menu')) {
                // Toggle class 'active' untuk putar panah
                this.classList.toggle('active');
                
                // Toggle class 'show' untuk munculkan menu
                subMenu.classList.toggle('show');
                
                console.log("Menu diklik:", this.querySelector('span').textContent);
            }
        });
    });

    const welcomeUser = document.getElementById('welcomeUser');
    const savedName = localStorage.getItem("namaUser");

    if (savedName && welcomeUser) {
        welcomeUser.innerHTML = `Hello, ${savedName} 👋`;
    }

    // Logout functionality
    const btnOut = document.getElementById('btnOut');
    if (btnOut) {
        btnOut.addEventListener('click', function() {
            Swal.fire({
                title: 'Konfirmasi',
                text: "Apakah Anda yakin ingin keluar?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#FF6700',
                cancelButtonColor: '#3A6EA5',
                confirmButtonText: 'Ya, Keluar!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "login.html";
                }
            });
        });
    }

    // Reset button functionality
    const resetBtn = document.querySelector('.btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            Swal.fire({
                title: 'Reset Filter',
                text: 'Semua filter akan direset',
                icon: 'info',
                confirmButtonColor: '#3A6EA5',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }

    // Search functionality
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', function(e) {
            console.log('Searching for:', e.target.value);
            // Add your search logic here
        });
    }
});

