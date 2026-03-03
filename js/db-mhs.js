document.addEventListener('DOMContentLoaded', function() {
    // 1. Jalankan fungsi utama
    fetchItems();
    setupSidebarAccordion();
    setupLogout();

    // 2. LOGIKA SIDEBAR ACCORDION (Perbaikan agar bisa buka-tutup)
    function setupSidebarAccordion() {
        const labels = document.querySelectorAll('.menu-label');
        labels.forEach(label => {
            label.addEventListener('click', function() {
                const subMenu = this.parentElement.querySelector('.sub-menu');
                
                // Toggle Menu
                if (subMenu) {
                    const isShowing = subMenu.classList.contains('show');
                    
                    // Tutup semua menu lain dulu (Optional: biar rapi)
                    document.querySelectorAll('.sub-menu').forEach(s => s.classList.remove('show'));
                    document.querySelectorAll('.menu-label').forEach(l => l.classList.remove('active'));

                    // Jika sebelumnya tertutup, sekarang buka
                    if (!isShowing) {
                        subMenu.classList.add('show');
                        this.classList.add('active');
                    }
                }
            });
        });

        // Logika Klik pada Pilihan di dalam Sub-Menu (Filter)
        const filterOpts = document.querySelectorAll('.sub-menu li');
        filterOpts.forEach(opt => {
            opt.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const value = this.getAttribute('data-value');
                console.log(`Filtering by ${type}: ${value}`);
                
                if (value === 'All') {
                    fetchItems();
                } else {
                    fetchItemsFiltered(type, value);
                }
            });
        });
    }

    // 3. AMBIL DATA DARI SUPABASE
    async function fetchItems() {
        const grid = document.getElementById('itemsGrid');
        grid.innerHTML = '<p>Memuat data barang...</p>';

        const { data, error } = await _supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching:", error);
            grid.innerHTML = '<p>Gagal memuat data.</p>';
        } else {
            renderCards(data);
        }
    }

    // 4. FUNGSI RENDER KARTU (Sesuai Style CSS kamu)
    function renderCards(items) {
        const grid = document.getElementById('itemsGrid');
        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = '<p>Tidak ada barang ditemukan.</p>';
            return;
        }

        items.forEach(item => {
            // Gunakan placeholder icon jika tidak ada image_url
            const imageHtml = item.image_url 
                ? `<img src="${item.image_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">`
                : `<i class="fas fa-box fa-3x"></i>`;

            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="image-placeholder">${imageHtml}</div>
                <div class="bubble-box title-bubble">${item.nama_barang}</div>
                <div class="bubble-box desc-bubble">${item.lokasi_temuan}</div>
                <button class="btn-detail" onclick="showPopupDetail('${item.id_item}')">Detail</button>
            `;
            grid.appendChild(card);
        });
        
        // Simpan data ke window agar bisa diakses fungsi popup
        window.allProducts = items;
    }

    // 5. FUNGSI LOGOUT
    function setupLogout() {
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
                        localStorage.removeItem('userLoggedIn');
                        window.location.href = "login.html";
                    }
                });
            });
        }
    }
});

// 6. FUNGSI POPUP DETAIL (Di luar DOMContentLoaded agar bisa dipanggil onclick)
function showPopupDetail(id) {
    const item = window.allProducts.find(i => i.id_item == id);
    if (!item) return;

    Swal.fire({
        title: `<span style="color: #004E98">${item.nama_barang}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Poppins'; font-size: 14px;">
                <div style="background: #f0f0f0; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                    <p><b>Status:</b> <span style="color: #FF6700">${item.status_barang}</span></p>
                    <p><b>Kategori:</b> ${item.kategori}</p>
                    <p><b>Lokasi:</b> ${item.lokasi_temuan}</p>
                </div>
                <p><b>Deskripsi:</b><br>${item.deskripsi}</p>
                <hr style="margin: 15px 0;">
                <p style="text-align: center;"><b>Hubungi via WhatsApp:</b></p>
                <a href="https://wa.me/628123456789" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 10px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                    <i class="fab fa-whatsapp"></i> Chat Admin
                </a>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3A6EA5'
    });
}