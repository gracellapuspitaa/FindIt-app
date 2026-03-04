let allDataBarang = []; 
let pencarianAktif = "";
let filterAktif = {
    'Fakultas': [],
    'Jenis Barang': [],
    'Kategori': []
};

document.addEventListener('DOMContentLoaded', function() {
    fetchItems();
    setupSidebarAccordion();
    setupSearch();
    setupLogout();

    const welcomeUser = document.getElementById('welcomeUser');
    const savedName = localStorage.getItem("namaUser");
    if (welcomeUser) {
        welcomeUser.innerHTML = savedName ? `Hello, ${savedName} 👋` : `Hello, Nawasena! 👋`;
    }
});

// 1. AMBIL DATA DARI SUPABASE
async function fetchItems() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return; 
    
    grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Memuat data barang...</p>';

    const { data, error } = await supabaseClient 
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching:", error);
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Gagal memuat data.</p>';
    } else {
        allDataBarang = data; 
        renderCards(allDataBarang); 
    }
}

// 2. TAMPILKAN KARTU BARANG
function renderCards(items) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #666;">Tidak ada barang yang ditemukan.</p>';
        return;
    }

    items.forEach(item => {
        const imageHtml = item.image_url 
            ? `<img src="${item.image_url}" alt="Foto ${item.nama_barang}">`
            : `<i class="fas fa-box fa-3x" style="color: #cbd5e1;"></i>`;

        const card = document.createElement('div');
        card.className = 'item-card';
        
        // PERHATIKAN BAGIAN ONCLICK DI BAWAH INI
        card.innerHTML = `
            <div class="card-img-container">${imageHtml}</div>
            <div class="card-content">
                <h3 class="card-title">${item.nama_barang}</h3>
                <p class="card-desc"><i class="fas fa-map-marker-alt" style="color:#FF6700;"></i> ${item.lokasi_temuan}</p>
                <span class="badge-kategori">${item.kategori}</span>
            </div>
            <button class="btn-detail" onclick="window.bukaPopupDetail('${item.id_item}')">Detail Barang</button>
        `;
        grid.appendChild(card);
    });
}

// 3. FUNGSI SIDEBAR & RESET
function setupSidebarAccordion() {
    const labels = document.querySelectorAll('.menu-label');
    labels.forEach(label => {
        label.addEventListener('click', function() {
            const subMenu = this.parentElement.querySelector('.sub-menu');
            if (subMenu) {
                subMenu.classList.toggle('show');
                this.classList.toggle('active');
            }
        });
    });

    const filterOpts = document.querySelectorAll('.sub-menu li .filter-opt');
    filterOpts.forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const value = this.innerText.trim();
            const parentLabel = this.closest('.menu-item').querySelector('.menu-label span:nth-child(2)').innerText.trim();

            if (value === 'All') {
                filterAktif[parentLabel] = [];
                const siblingOpts = this.closest('.sub-menu').querySelectorAll('.filter-opt');
                siblingOpts.forEach(el => el.classList.remove('selected-filter'));
            } else {
                this.classList.toggle('selected-filter');
                if (this.classList.contains('selected-filter')) {
                    if (!filterAktif[parentLabel].includes(value)) {
                        filterAktif[parentLabel].push(value);
                    }
                } else {
                    filterAktif[parentLabel] = filterAktif[parentLabel].filter(v => v !== value);
                }
            }
            terapkanSemuaFilter();
        });
    });

    const resetBtn = document.getElementById('btnReset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const searchBar = document.getElementById('searchBar');
            if(searchBar) searchBar.value = '';
            pencarianAktif = "";
            filterAktif = { 'Fakultas': [], 'Jenis Barang': [], 'Kategori': [] };
            document.querySelectorAll('.filter-opt').forEach(el => el.classList.remove('selected-filter'));
            renderCards(allDataBarang);
        });
    }
}

// 4. FUNGSI KOLOM PENCARIAN
function setupSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', function(e) {
            pencarianAktif = e.target.value.toLowerCase().trim();
            terapkanSemuaFilter(); 
        });
    }
}

// 5. GABUNGKAN FILTER & PENCARIAN
function terapkanSemuaFilter() {
    let hasilFilter = allDataBarang;

    if (pencarianAktif !== "") {
        hasilFilter = hasilFilter.filter(item => {
            const semuaInfoBarang = Object.values(item).join(" ").toLowerCase();
            return semuaInfoBarang.includes(pencarianAktif);
        });
    }

    for (const [kategoriUtama, daftarPilihan] of Object.entries(filterAktif)) {
        if (daftarPilihan.length > 0) {
            hasilFilter = hasilFilter.filter(item => {
                if (kategoriUtama === 'Fakultas') return daftarPilihan.includes(item.lokasi_temuan);
                if (kategoriUtama === 'Jenis Barang') return daftarPilihan.includes(item.jenis_barang);
                if (kategoriUtama === 'Kategori') return daftarPilihan.includes(item.kategori);
                return true;
            });
        }
    }

    renderCards(hasilFilter);
}

// ==========================================
// 6. FUNGSI MUNCULKAN POPUP DETAIL (GLOBAL)
// ==========================================
window.bukaPopupDetail = function(id) {
    console.log("Mencoba membuka popup untuk ID:", id); // Log untuk pengecekan

    const item = allDataBarang.find(i => String(i.id_item) === String(id));
    
    if (!item) {
        console.error("Data tidak ditemukan di array allDataBarang!");
        Swal.fire('Error', 'Gagal memuat detail barang.', 'error');
        return;
    }

    let infoPemilik = item.jenis_barang === 'Bertuan' && item.nama_pemilik 
        ? `<p><b>Atas Nama:</b> ${item.nama_pemilik}</p>` : '';

    // Tambahkan String() untuk memaksa nilainya menjadi teks
    let waNumber = String(item.id_penemu || ''); 
    if(waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);
    
    Swal.fire({
        title: `<span style="color: #004E98; font-weight:700;">${item.nama_barang}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Poppins', sans-serif; font-size: 14px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                    <p style="margin: 5px 0;"><b>Keberadaan:</b> <span style="color: #FF6700; font-weight:600;">${item.status_lokasi}</span></p>
                    <p style="margin: 5px 0;"><b>Kategori:</b> ${item.kategori}</p>
                    <p style="margin: 5px 0;"><b>Lokasi Temu:</b> ${item.lokasi_temuan}</p>
                    <p style="margin: 5px 0;"><b>Jenis:</b> ${item.jenis_barang}</p>
                    ${infoPemilik}
                </div>
                <p style="margin: 0;"><b>Deskripsi Detail:</b><br><span style="color:#475569;">${item.deskripsi || 'Tidak ada deskripsi.'}</span></p>
                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #cbd5e1;">
                <p style="text-align: center; margin-bottom: 10px;"><b>Klaim / Hubungi Penemu:</b></p>
                <a href="https://wa.me/${waNumber}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.3s;">
                    <i class="fab fa-whatsapp"></i> Chat via WhatsApp
                </a>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false 
    });
};

// 7. FUNGSI LOGOUT
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
                confirmButtonText: 'Ya, Keluar!'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('userLoggedIn');
                    window.location.href = "login.html";
                }
            });
        });
    }
}