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

// Mengambil nomor WA user dan NIM dari localStorage
let currentUserPhone = localStorage.getItem("userPhone") || null;
const savedNim = localStorage.getItem("username"); 

document.addEventListener('DOMContentLoaded', function() {
    fetchAdminPhone(); 
    fetchItems();
    setupTabs(); 
    setupSidebarAccordion();
    setupSearch();
    setupCalendar(); 
    setupProfileMenu(); // Inisialisasi menu dropdown profil

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
        .select('no_telp') // PERBAIKAN: Ejaan sesuai database (pakai 'e')
        .eq('role', 'admin')
        .limit(1); 

    if (!error && data && data.length > 0) {
        nomorAdminSarpras = data[0].no_telp; 
    }
}

// ==========================================
// 2. FUNGSI TAB SWITCHER
// ==========================================
function setupTabs() {
    const tabTemuan = document.getElementById('tabTemuan');
    const tabHilang = document.getElementById('tabHilang');
    const tabLaporanku = document.getElementById('tabLaporanku');

    if(tabTemuan && tabHilang && tabLaporanku) {
        tabTemuan.addEventListener('click', () => {
            currentTab = 'temuan';
            tabTemuan.classList.add('active');
            tabHilang.classList.remove('active');
            tabLaporanku.classList.remove('active');
            terapkanSemuaFilter(); 
        });

        tabHilang.addEventListener('click', () => {
            currentTab = 'hilang';
            tabHilang.classList.add('active');
            tabTemuan.classList.remove('active');
            tabLaporanku.classList.remove('active');
            terapkanSemuaFilter(); 
        });

        tabLaporanku.addEventListener('click', async () => {
            // Jika nomor WA belum ada, tanyakan sekali saja
            if (!currentUserPhone) {
                const { value: waInput } = await Swal.fire({
                    title: 'Verifikasi Nomor WA',
                    text: 'Masukkan nomor WhatsApp Anda untuk melihat laporan milik Anda:',
                    input: 'text',
                    inputPlaceholder: '0812xxxxxx',
                    showCancelButton: true,
                    confirmButtonColor: '#004E98'
                });
                
                if (waInput) {
                    currentUserPhone = waInput;
                    localStorage.setItem("userPhone", currentUserPhone);
                } else {
                    return; // Batal masuk tab jika cancel
                }
            }

            currentTab = 'laporanku';
            tabLaporanku.classList.add('active');
            tabTemuan.classList.remove('active');
            tabHilang.classList.remove('active');
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
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Gagal memuat data.</p>';
    } else {
        let dtTemu = dataTemu || [];
        dtTemu.forEach(d => d.tabel_asal = 'temuan');
        
        let dtHilang = dataHilang || [];
        dtHilang.forEach(d => d.tabel_asal = 'hilang');

        allDataBarang = dtTemu;
        allDataHilang = dtHilang;
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

    items.forEach(item => {
        const isTemuan = item.tabel_asal === 'temuan';
        const idBarang = isTemuan ? item.id_item : item.id_hilang;
        const prefixId = isTemuan ? "BR-" : "HL-";
        const formatId = prefixId + String(idBarang).padStart(3, '0');
        const lokasi = isTemuan ? item.lokasi_temuan : item.lokasi_terakhir;
        
        let cardStyle = "";
        if (currentTab === 'laporanku') cardStyle = "border-top: 4px solid #a855f7;"; 
        else if (!isTemuan) cardStyle = "border-top: 4px solid #ef4444;"; 
        
        const iconFallback = isTemuan ? "fa-box" : "fa-search";
        const badgeBg = isTemuan ? "#f1f5f9" : "#fee2e2";
        const badgeColor = isTemuan ? "#94a3b8" : "#ef4444";
        const locColor = currentTab === 'laporanku' ? "#a855f7" : (isTemuan ? "#FF6700" : "#ef4444");

        const imageHtml = item.image_url 
            ? `<img src="${item.image_url}" alt="Foto ${item.nama_barang}">`
            : `<i class="fas ${iconFallback} fa-3x" style="color: #cbd5e1;"></i>`;

        let tombolAksi = "";
        if (currentTab === 'laporanku') {
            tombolAksi = `<button class="btn-delete" onclick="window.hapusLaporanKu('${idBarang}', '${item.tabel_asal}')"><i class="fas fa-check-circle"></i> Selesai / Hapus</button>`;
        } else {
            tombolAksi = `<button class="btn-detail" onclick="window.bukaPopupDetail('${idBarang}', '${item.tabel_asal}')">Detail Laporan</button>`;
        }

        const card = document.createElement('div');
        card.className = `item-card`;
        card.style = cardStyle;
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
            ${tombolAksi}
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 5. FUNGSI HAPUS LAPORAN (TAB LAPORANKU)
// ==========================================
window.hapusLaporanKu = function(id, tabelAsal) {
    Swal.fire({
        title: 'Tandai Selesai?',
        text: "Laporan ini akan dihapus dari sistem secara permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#25D366',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Sudah Selesai!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Menghapus...', didOpen: () => { Swal.showLoading() }});
            
            const tabelSupabase = tabelAsal === 'temuan' ? 'items' : 'barang_hilang';
            const kolomId = tabelAsal === 'temuan' ? 'id_item' : 'id_hilang';

            const { error } = await supabaseClient
                .from(tabelSupabase)
                .delete()
                .eq(kolomId, id);

            if (error) {
                Swal.fire('Error!', 'Gagal menghapus laporan.', 'error');
            } else {
                Swal.fire('Berhasil!', 'Laporan telah diselesaikan dan dihapus.', 'success');
                fetchItems(); 
            }
        }
    });
};

// ==========================================
// 6. FUNGSI POPUP DETAIL 
// ==========================================
window.bukaPopupDetail = function(id, tabelAsal) {
    const isTemuan = tabelAsal === 'temuan';
    
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
// 7. GABUNGAN PENCARIAN & FILTER
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
    let dataSumber = [];
    
    if (currentTab === 'temuan') {
        dataSumber = allDataBarang;
    } else if (currentTab === 'hilang') {
        dataSumber = allDataHilang;
    } else if (currentTab === 'laporanku') {
        let myTemuan = allDataBarang.filter(i => i.id_penemu === currentUserPhone);
        let myHilang = allDataHilang.filter(i => i.wa_pelapor === currentUserPhone);
        dataSumber = [...myTemuan, ...myHilang]; 
    }

    let hasilFilter = dataSumber;

    if (pencarianAktif !== "") {
        hasilFilter = hasilFilter.filter(item => {
            const semuaInfoBarang = Object.values(item).join(" ").toLowerCase();
            return semuaInfoBarang.includes(pencarianAktif);
        });
    }

    for (const [kategoriUtama, daftarPilihan] of Object.entries(filterAktif)) {
        if (daftarPilihan.length > 0) {
            hasilFilter = hasilFilter.filter(item => {
                let isTemu = item.tabel_asal === 'temuan';
                if (kategoriUtama === 'Fakultas') {
                    let loc = isTemu ? item.lokasi_temuan : item.lokasi_terakhir;
                    return daftarPilihan.includes(loc);
                }
                if (kategoriUtama === 'Jenis Barang' && isTemu) {
                    return daftarPilihan.includes(item.jenis_barang);
                }
                if (kategoriUtama === 'Kategori') return daftarPilihan.includes(item.kategori);
                return true;
            });
        }
    }

    if (selectedDate !== null) {
        hasilFilter = hasilFilter.filter(item => {
            let targetDateStr = item.tabel_asal === 'temuan' ? item.created_at : item.tanggal_hilang;
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
// 8. FUNGSI SIDEBAR & RESET
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
// 9. FUNGSI KALENDER
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

        daysContainer.querySelectorAll('.calendar-day:not(.faded)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const clickedDay = parseInt(dayEl.getAttribute('data-day'));
                if (selectedDate && selectedDate.getDate() === clickedDay && selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
                    selectedDate = null; 
                } else {
                    selectedDate = new Date(year, month, clickedDay);
                }
                renderCalendar(currentDate); 
                terapkanSemuaFilter(); 
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
// 10. MANAJEMEN PROFIL & DROPDOWN
// ==========================================
function setupProfileMenu() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const dropName = document.getElementById('dropName');
    const dropNim = document.getElementById('dropNim');

    const savedName = localStorage.getItem("namaUser");
    
    if (dropName && savedName) dropName.innerText = savedName;
    if (dropNim && savedNim) dropNim.innerText = savedNim;

    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }

    window.addEventListener('click', function() {
        if (profileDropdown && profileDropdown.classList.contains('show')) {
            profileDropdown.classList.remove('show');
        }
    });

    // 10A. UBAH NO WA
    document.getElementById('btnUbahWa')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: waInput } = await Swal.fire({
            title: 'Atur Nomor WhatsApp',
            text: 'Masukkan nomor yang aktif untuk dihubungi jika barang ditemukan:',
            input: 'text',
            inputValue: currentUserPhone || "",
            inputPlaceholder: '0812xxxxxx',
            showCancelButton: true,
            confirmButtonColor: '#25D366'
        });

        if (waInput && savedNim) {
            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
            const { error } = await supabaseClient
                .from('users')
                .update({ no_telp: waInput }) // Ejaan no_telp sesuai database
                .eq('username', savedNim);

            if (!error) {
                localStorage.setItem("userPhone", waInput);
                currentUserPhone = waInput; 
                Swal.fire('Berhasil!', 'Nomor WhatsApp berhasil diperbarui.', 'success');
            } else {
                Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan.', 'error');
            }
        }
    });

    // 10B. UBAH PASSWORD
    document.getElementById('btnUbahPass')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: formValues } = await Swal.fire({
            title: 'Ubah Password',
            html:
                '<input id="oldPass" class="swal2-input" placeholder="Password Lama" type="password">' +
                '<input id="newPass" class="swal2-input" placeholder="Password Baru" type="password">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#004E98',
            preConfirm: () => {
                return [
                    document.getElementById('oldPass').value,
                    document.getElementById('newPass').value
                ]
            }
        });

        if (formValues && savedNim) {
            const [oldPass, newPass] = formValues;
            
            const { data, error: errCek } = await supabaseClient
                .from('users')
                .select('password')
                .eq('username', savedNim)
                .single();

            if (data && data.password === oldPass) {
                const { error: errUpdate } = await supabaseClient
                    .from('users')
                    .update({ password: newPass })
                    .eq('username', savedNim);

                if (!errUpdate) {
                    Swal.fire('Sukses!', 'Password berhasil diubah. Silakan login kembali.', 'success')
                    .then(() => {
                        localStorage.clear();
                        window.location.href = "login.html";
                    });
                }
            } else {
                Swal.fire('Gagal!', 'Password lama yang Anda masukkan salah.', 'error');
            }
        }
    });

    // 10C. LOGOUT
    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
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
                localStorage.clear();
                window.location.href = "login.html";
            }
        });
    });
}