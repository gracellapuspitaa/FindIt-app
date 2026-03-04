document.addEventListener('DOMContentLoaded', function() {
    // 1. Jalankan fungsi utama
    fetchItems();
    setupSidebarAccordion();
    setupLogout();

    // ==========================================
    // TAMBAHKAN KODE INI UNTUK WELCOME BANNER
    // ==========================================
    const welcomeUser = document.getElementById('welcomeUser');
    const savedName = localStorage.getItem("namaUser"); // Pastikan key ini sama dengan yang kamu set saat login

    if (savedName && welcomeUser) {
        welcomeUser.innerHTML = `Hello, ${savedName} 👋`;
    } else if (welcomeUser) {
        // Fallback jika tidak ada nama di localStorage
        welcomeUser.innerHTML = `Hello, Nawasena! 👋`;
    }
    // ==========================================

    // 2. LOGIKA SIDEBAR ACCORDION 
    function setupSidebarAccordion() {
        const labels = document.querySelectorAll('.menu-label');
        labels.forEach(label => {
            label.addEventListener('click', function() {
                const subMenu = this.parentElement.querySelector('.sub-menu');
                
                if (subMenu) {
                    const isShowing = subMenu.classList.contains('show');
                    
                    document.querySelectorAll('.sub-menu').forEach(s => s.classList.remove('show'));
                    document.querySelectorAll('.menu-label').forEach(l => l.classList.remove('active'));

                    if (!isShowing) {
                        subMenu.classList.add('show');
                        this.classList.add('active');
                    }
                }
            });
        });

        // Logika Filter (Bisa kamu kembangkan nanti)
        const filterOpts = document.querySelectorAll('.sub-menu li');
        filterOpts.forEach(opt => {
            opt.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const value = this.getAttribute('data-value');
                console.log(`Filtering by ${type}: ${value}`);
                
                if (value === 'All') {
                    fetchItems();
                } else {
                    // Jika kamu sudah punya fungsi fetchItemsFiltered, panggil di sini
                    // fetchItemsFiltered(type, value);
                }
            });
        });
    }

    // 3. AMBIL DATA DARI SUPABASE
    async function fetchItems() {
        const grid = document.getElementById('itemsGrid');
        if (!grid) return; 
        
        grid.innerHTML = '<p>Memuat data barang...</p>';

        // UBAH DISINI: Gunakan supabaseClient
        const { data, error } = await supabaseClient 
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

    // 4. FUNGSI RENDER KARTU
    function renderCards(items) {
        const grid = document.getElementById('itemsGrid');
        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = '<p>Tidak ada barang ditemukan.</p>';
            return;
        }

        items.forEach(item => {
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

// 6. FUNGSI POPUP DETAIL
function showPopupDetail(id) {
    const item = window.allProducts.find(i => i.id_item == id);
    if (!item) return;

    let infoPemilik = item.jenis_barang === 'Bertuan' && item.nama_pemilik ? `<p><b>Atas Nama:</b> ${item.nama_pemilik}</p>` : '';

    let waNumber = item.id_penemu || '';
    if(waNumber.startsWith('0')) {
        waNumber = '62' + waNumber.substring(1);
    }

    Swal.fire({
        title: `<span style="color: #004E98">${item.nama_barang}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Poppins'; font-size: 14px;">
                <div style="background: #f0f0f0; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                    <p><b>Status Keberadaan:</b> <span style="color: #FF6700">${item.status_lokasi}</span></p>
                    <p><b>Kategori:</b> ${item.kategori}</p>
                    <p><b>Lokasi Temu:</b> ${item.lokasi_temuan}</p>
                    <p><b>Jenis:</b> ${item.jenis_barang}</p>
                    ${infoPemilik}
                </div>
                <p><b>Deskripsi:</b><br>${item.deskripsi}</p>
                <hr style="margin: 15px 0;">
                <p style="text-align: center;"><b>Hubungi via WhatsApp:</b></p>
                <a href="https://wa.me/${waNumber}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 10px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                    <i class="fab fa-whatsapp"></i> Chat Penemu/Admin
                </a>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3A6EA5'
    });
}