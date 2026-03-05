// ==========================================
// VARIABEL GLOBAL
// ==========================================
let allDataBarang = [];   
let allDataHilang = [];   
let currentTab = 'temuan'; 

let pencarianAktif = "";
let filterAktif = { 'Fakultas': [], 'Jenis Barang': [], 'Kategori': [] };
let currentDate = new Date(); 
let selectedDate = null; 
let nomorAdminSarpras = ""; 

document.addEventListener('DOMContentLoaded', function() {
    fetchAdminPhone(); 
    fetchItems();
    setupTabs(); 
    setupSidebarAccordion();
    setupSearch();
    setupLogout();
    setupCalendar(); 

    const welcomeUser = document.getElementById('welcomeUser');
    const savedName = localStorage.getItem("namaUser");
    if (welcomeUser) {
        welcomeUser.innerHTML = savedName ? `Hello, ${savedName} 👋` : `Hello, Nawasena! 👋`;
    }
});

// ==========================================
// 1. AMBIL NOMOR ADMIN
// ==========================================
async function fetchAdminPhone() {
    const { data, error } = await supabaseClient 
        .from('users')
        .select('no_tlp')
        .eq('role', 'admin')
        .limit(1); 

    if (!error && data && data.length > 0) {
        nomorAdminSarpras = data[0].no_tlp; 
    }
}

// ==========================================
// 2. FUNGSI TAB SWITCHER
// ==========================================
function setupTabs() {
    const tabTemuan = document.getElementById('tabTemuan');
    const tabHilang = document.getElementById('tabHilang');

    if(tabTemuan && tabHilang) {
        tabTemuan.addEventListener('click', () => {
            currentTab = 'temuan';
            tabTemuan.classList.add('active');
            tabHilang.classList.remove('active');
            terapkanSemuaFilter(); 
        });

        tabHilang.addEventListener('click', () => {
            currentTab = 'hilang';
            tabHilang.classList.add('active');
            tabTemuan.classList.remove('active');
            terapkanSemuaFilter(); 
        });
    }
}

// ==========================================
// 3. AMBIL DATA DARI 2 TABEL SEKALIGUS
// ==========================================
async function fetchItems() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return; 
    
    grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Memuat data...</p>';

    const { data: dataTemu, error: errTemu } = await supabaseClient 
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    const { data: dataHilang, error: errHilang } = await supabaseClient 
        .from('barang_hilang')
        .select('*')
        .order('created_at', { ascending: false });

    if (errTemu || errHilang) {
        console.error("Error fetching data:", errTemu || errHilang);
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Gagal memuat data.</p>';
    } else {
        allDataBarang = dataTemu || [];
        allDataHilang = dataHilang || [];
        terapkanSemuaFilter(); 
    }
}

// ==========================================
// 4. TAMPILKAN KARTU
// ==========================================
function renderCards(items) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #666;">Tidak ada data yang sesuai.</p>';
        return;
    }

    const isTemuan = currentTab === 'temuan';

    items.forEach(item => {
        const idBarang = isTemuan ? item.id_item : item.id_hilang;
        const prefixId = isTemuan ? "BR-" : "HL-";
        const formatId = prefixId + String(idBarang).padStart(3, '0');
        const lokasi = isTemuan ? item.lokasi_temuan : item.lokasi_terakhir;
        const cardStyle = isTemuan ? "" : "card-hilang";
        const iconFallback = isTemuan ? "fa-box" : "fa-search";
        const badgeBg = isTemuan ? "#f1f5f9" : "#fee2e2";
        const badgeColor = isTemuan ? "#94a3b8" : "#ef4444";
        const locColor = isTemuan ? "#FF6700" : "#ef4444";

        const imageHtml = item.image_url 
            ? `<img src="${item.image_url}" alt="Foto ${item.nama_barang}">`
            : `<i class="fas ${iconFallback} fa-3x" style="color: #cbd5e1;"></i>`;

        const card = document.createElement('div');
        card.className = `item-card ${cardStyle}`;
        card.innerHTML = `
            <div class="card-img-container">${imageHtml}</div>
            <div class="card-content">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h3 class="card-title" style="margin:0;">${item.nama_barang}</h3>
                    <span style="font-size: 11px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; padding: 2px 6px; border-radius: 4px;">${formatId}</span>
                </div>
                <p class="card-desc"><i class="fas fa-map-marker-alt" style="color:${locColor};"></i> ${lokasi}</p>
                <span class="badge-kategori">${item.kategori}</span>
            </div>
            <button class="btn-detail" onclick="window.bukaPopupDetail('${idBarang}')">Detail ${isTemuan ? 'Barang' : 'Laporan'}</button>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 5. FUNGSI POPUP DETAIL
// ==========================================
window.bukaPopupDetail = function(id) {
    const isTemuan = currentTab === 'temuan';
    
    const item = isTemuan 
        ? allDataBarang.find(i => String(i.id_item) === String(id))
        : allDataHilang.find(i => String(i.id_hilang) === String(id));

    if (!item) return;

    const prefixId = isTemuan ? "BR-" : "HL-";
    const formatId = prefixId + String(id).padStart(3, '0');

    let htmlContent = "";
    let waNumber = "";
    let tujuanChat = "";
    let pesanTemplate = `Halo, saya ingin bertanya tentang laporan dengan ID ${formatId}`;

    if (isTemuan) {
        let infoPemilik = item.jenis_barang === 'Bertuan' && item.nama_pemilik ? `<p style="margin: 5px 0;"><b>Atas Nama:</b> ${item.nama_pemilik}</p>` : '';
        
        if (item.status_lokasi === 'Di Sarpras' && nomorAdminSarpras !== "") {
            waNumber = String(nomorAdminSarpras);
            tujuanChat = "Chat Admin Sarpras";
        } else {
            waNumber = String(item.id_penemu || ''); 
            tujuanChat = "Chat Penemu Barang";
        }

        let tanggalFormat = 'Tanggal tidak diketahui';
        if (item.created_at) {
            tanggalFormat = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        htmlContent = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                <p style="margin: 5px 0;"><b>ID Laporan:</b> <span style="color:#004E98; font-weight:bold;">${formatId}</span></p>
                <p style="margin: 5px 0;"><b>Tanggal Ditemukan:</b> ${tanggalFormat}</p>
                <p style="margin: 5px 0;"><b>Keberadaan:</b> <span style="color: #FF6700; font-weight:600;">${item.status_lokasi}</span></p>
                <p style="margin: 5px 0;"><b>Kategori:</b> ${item.kategori}</p>
                <p style="margin: 5px 0;"><b>Lokasi Temu:</b> ${item.lokasi_temuan}</p>
                <p style="margin: 5px 0;"><b>Jenis:</b> ${item.jenis_barang}</p>
                ${infoPemilik}
            </div>
            <p style="margin: 0;"><b>Deskripsi Detail:</b><br><span style="color:#475569;">${item.deskripsi || 'Tidak ada deskripsi.'}</span></p>
        `;
    } else {
        waNumber = String(item.wa_pelapor || '');
        tujuanChat = "Hubungi Pelapor";
        pesanTemplate = `Halo, saya memiliki informasi terkait barang Anda yang hilang dengan ID ${formatId}`;
        
        let tanggalFormat = 'Tanggal tidak diketahui';
        if (item.tanggal_hilang) {
            tanggalFormat = new Date(item.tanggal_hilang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        htmlContent = `
            <div style="background: #fff1f0; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #ffccc7;">
                <p style="margin: 5px 0;"><b>ID Laporan:</b> <span style="color:#cf1322; font-weight:bold;">${formatId}</span></p>
                <p style="margin: 5px 0;"><b>Tanggal Kehilangan:</b> ${tanggalFormat}</p>
                <p style="margin: 5px 0;"><b>Status:</b> <span style="color: #cf1322; font-weight:600;">${item.status}</span></p>
                <p style="margin: 5px 0;"><b>Kategori:</b> ${item.kategori}</p>
                <p style="margin: 5px 0;"><b>Lokasi Terakhir:</b> ${item.lokasi_terakhir}</p>
            </div>
            <p style="margin: 0;"><b>Ciri-ciri Khusus:</b><br><span style="color:#475569;">${item.ciri_ciri || 'Tidak ada ciri-ciri spesifik.'}</span></p>
        `;
    }

    if(waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);

    Swal.fire({
        title: `<span style="color: ${isTemuan ? '#004E98' : '#cf1322'}; font-weight:700;">${item.nama_barang}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Poppins', sans-serif; font-size: 14px;">
                ${htmlContent}
                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #cbd5e1;">
                <p style="text-align: center; margin-bottom: 10px;"><b>Tahu barang ini?</b></p>
                <a href="https://wa.me/${waNumber}?text=${encodeURIComponent(pesanTemplate)}" target="_blank" style="display: block; background: #25D366; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    <i class="fab fa-whatsapp"></i> ${tujuanChat}
                </a>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false 
    });
};

// ==========================================
// 6. GABUNGAN PENCARIAN & FILTER
// ==========================================
function setupSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', function(e) {
            pencarianAktif = e.target.value.toLowerCase().trim();
            terapkanSemuaFilter(); 
        });
    }
}

function terapkanSemuaFilter() {
    let dataSumber = currentTab === 'temuan' ? allDataBarang : allDataHilang;
    let hasilFilter = dataSumber;

    // A. Filter Pencarian Teks
    if (pencarianAktif !== "") {
        hasilFilter = hasilFilter.filter(item => {
            const semuaInfoBarang = Object.values(item).join(" ").toLowerCase();
            return semuaInfoBarang.includes(pencarianAktif);
        });
    }

    // B. Filter Sidebar
    for (const [kategoriUtama, daftarPilihan] of Object.entries(filterAktif)) {
        if (daftarPilihan.length > 0) {
            hasilFilter = hasilFilter.filter(item => {
                if (kategoriUtama === 'Fakultas') {
                    let loc = currentTab === 'temuan' ? item.lokasi_temuan : item.lokasi_terakhir;
                    return daftarPilihan.includes(loc);
                }
                if (kategoriUtama === 'Jenis Barang' && currentTab === 'temuan') {
                    return daftarPilihan.includes(item.jenis_barang);
                }
                if (kategoriUtama === 'Kategori') return daftarPilihan.includes(item.kategori);
                return true;
            });
        }
    }

    // C. Filter Tanggal Kalender
    if (selectedDate !== null) {
        hasilFilter = hasilFilter.filter(item => {
            let targetDateStr = currentTab === 'temuan' ? item.created_at : item.tanggal_hilang;
            if (!targetDateStr) return false;
            
            let itemDate = new Date(targetDateStr);
            return itemDate.getFullYear() === selectedDate.getFullYear() &&
                   itemDate.getMonth() === selectedDate.getMonth() &&
                   itemDate.getDate() === selectedDate.getDate();
        });
    }

    renderCards(hasilFilter);
}

// ==========================================
// 7. FUNGSI SIDEBAR & RESET
// ==========================================
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
                    if (!filterAktif[parentLabel].includes(value)) filterAktif[parentLabel].push(value);
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
            selectedDate = null; 
            setupCalendar(); 
            terapkanSemuaFilter(); 
        });
    }
}

// ==========================================
// 8. FUNGSI KALENDER
// ==========================================
function setupCalendar() {
    const monthYearText = document.getElementById('monthYear');
    const daysContainer = document.getElementById('calendarDays');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (!monthYearText || !daysContainer) return;

    function renderCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        monthYearText.innerHTML = `${months[month]}, <span style="color: #94a3b8; font-weight: 400;">${year}</span>`;

        const firstDayIndex = new Date(year, month, 1).getDay(); 
        const lastDay = new Date(year, month + 1, 0).getDate(); 
        const prevLastDay = new Date(year, month, 0).getDate(); 
        const lastDayIndex = new Date(year, month + 1, 0).getDay(); 
        const today = new Date();

        let daysHTML = "";

        for (let x = firstDayIndex; x > 0; x--) {
            daysHTML += `<div class="calendar-day faded">${prevLastDay - x + 1}</div>`;
        }

        for (let i = 1; i <= lastDay; i++) {
            let isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) ? "today" : "";
            let isSelected = (selectedDate && year === selectedDate.getFullYear() && month === selectedDate.getMonth() && i === selectedDate.getDate()) ? "selected" : "";
            daysHTML += `<div class="calendar-day ${isToday} ${isSelected}" data-day="${i}">${i}</div>`;
        }

        let nextDays = 7 - lastDayIndex - 1;
        for (let j = 1; j <= nextDays; j++) {
            daysHTML += `<div class="calendar-day faded">${j}</div>`;
        }

        daysContainer.innerHTML = daysHTML;

        // EVENT KLIK PADA TANGGAL
        daysContainer.querySelectorAll('.calendar-day:not(.faded)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const clickedDay = parseInt(dayEl.getAttribute('data-day'));
                if (selectedDate && selectedDate.getDate() === clickedDay && selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
                    selectedDate = null; 
                } else {
                    selectedDate = new Date(year, month, clickedDay);
                }
                renderCalendar(currentDate); 
                terapkanSemuaFilter(); // Render ulang kartu berdasarkan tanggal yang diklik
            });
        });
    }

    if (!prevBtn.hasAttribute('data-listener')) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
        });
        prevBtn.setAttribute('data-listener', 'true');
    }

    if (!nextBtn.hasAttribute('data-listener')) {
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
        });
        nextBtn.setAttribute('data-listener', 'true');
    }

    renderCalendar(currentDate);
}

// ==========================================
// 9. FUNGSI LOGOUT
// ==========================================
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