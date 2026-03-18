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

let myKategoriChart = null; 

let currentUserPhone = localStorage.getItem("userPhone") || null;
const savedNim = localStorage.getItem("username"); 

document.addEventListener('DOMContentLoaded', function() {
    fetchAdminPhone(); 
    fetchItems();
    setupTabs(); 
    setupSidebarAccordion();
    setupSearch();
    setupCalendar(); 
    setupProfileMenu();
    initSideboxAccordionMobile();

    // ── MODE TAMU ──
    const isGuest = localStorage.getItem("isGuest") === "true";
    const welcomeUser = document.getElementById('welcomeUser');
    const savedName = localStorage.getItem("namaUser");

    if (isGuest) {
        // Sembunyikan tombol lapor temuan & lapor kehilangan
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) actionButtons.style.display = 'none';

        // Sembunyikan tab "Laporan Saya"
        const tabLaporanku = document.getElementById('tabLaporanku');
        if (tabLaporanku) tabLaporanku.style.display = 'none';

        // Sembunyikan profil dropdown (tamu tidak punya akun)
        const profileMenu = document.querySelector('.profile-menu');
        if (profileMenu) {
            profileMenu.innerHTML = `
                <a href="login.html" 
                   style="background:#284B63; color:white; padding:8px 16px; border-radius:20px; text-decoration:none; font-size:13px; font-weight:600;">
                   Login
                </a>`;
        }

        if (welcomeUser) welcomeUser.innerHTML = 'Halo, Tamu! 👀';

    } else {
        if (welcomeUser) {
            welcomeUser.innerHTML = savedName ? `Hello, ${savedName} 👋` : `Hello, Nawasena! 👋`;
        }
    }
});

async function fetchAdminPhone() {
    const { data, error } = await supabaseClient 
        .from('users')
        .select('no_telp') 
        .eq('role', 'admin')
        .limit(1); 

    if (!error && data && data.length > 0) {
        nomorAdminSarpras = data[0].no_telp; 
    }
}

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
            if (!currentUserPhone) {
                const { value: waInput } = await Swal.fire({
                    title: 'Verifikasi Nomor WA',
                    text: 'Masukkan nomor WhatsApp Anda untuk melihat laporan milik Anda:',
                    input: 'text',
                    inputPlaceholder: '0812xxxxxx',
                    showCancelButton: true,
                    confirmButtonColor: '#284B63'
                });
                
                if (waInput) {
                    currentUserPhone = waInput;
                    localStorage.setItem("userPhone", currentUserPhone);
                } else {
                    return; 
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

        allDataBarang = dtTemu.filter(item => item.status_lokasi !== 'Sudah Dikembalikan');
        allDataHilang = dtHilang.filter(item => item.status !== 'Selesai' && item.status !== 'Case Closed');

        terapkanSemuaFilter(); 
        updateDiagramKategori();
    }
}

function renderCards(items) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #666;">Belum ada laporan.</p>';
        return;
    }

    items.forEach(item => {
        const isTemuan = item.tabel_asal === 'temuan';
        const idBarang = isTemuan ? item.id_item : item.id_hilang;
        const prefixId = isTemuan ? "BR-" : "HL-";
        const formatId = prefixId + String(idBarang).padStart(3, '0');
        const lokasi = isTemuan ? item.lokasi_temuan : item.lokasi_terakhir;
        
        let cardStyle = "border-top: 4px solid #284B63;"; 
        
        const badgeBg = "#f1f5f9"; 
        const badgeColor = "#284B63"; 
        const locColor = "#3C6E71"; 

        const iconFallback = isTemuan ? "fa-box" : "fa-search";
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

// PERBAIKAN: Tombol Selesai sekarang melakukan UPDATE (bukan DELETE)
window.hapusLaporanKu = function(id, tabelAsal) {
    Swal.fire({
        title: 'Tandai Selesai?',
        text: "Laporan ini akan ditandai sebagai Selesai (Case Closed) dan diarsipkan dari tampilan utama.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3C6E71', 
        cancelButtonColor: '#353535',
        confirmButtonText: 'Ya, Sudah Selesai!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Memproses...', didOpen: () => { Swal.showLoading() }});
            
            const isTemuan = tabelAsal === 'temuan';
            const tabelSupabase = isTemuan ? 'items' : 'barang_hilang';
            const kolomId = isTemuan ? 'id_item' : 'id_hilang';
            const dataUpdate = isTemuan ? { status_lokasi: 'Sudah Dikembalikan' } : { status: 'Case Closed' };

            const { error } = await supabaseClient
                .from(tabelSupabase)
                .update(dataUpdate)
                .eq(kolomId, id);

            if (error) {
                Swal.fire('Error!', 'Gagal menyelesaikan laporan.', 'error');
            } else {
                Swal.fire('Berhasil!', 'Laporan telah diselesaikan dan diarsipkan.', 'success');
                fetchItems(); 
            }
        }
    });
};

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

    let bgPopup = "#f8f9fa";
    let borderPopup = "#284B63"; 
    let colorText = "#284B63";

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
            <div style="background: ${bgPopup}; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid ${borderPopup};">
                <p style="margin: 5px 0;"><b>ID Laporan:</b> <span style="color:${colorText}; font-weight:bold;">${formatId}</span></p>
                <p style="margin: 5px 0;"><b>Tanggal Ditemukan:</b> ${tanggalFormat}</p>
                <p style="margin: 5px 0;"><b>Keberadaan:</b> <span style="color: #3C6E71; font-weight:600;">${item.status_lokasi}</span></p>
                <p style="margin: 5px 0;"><b>Kategori:</b> ${item.kategori}</p>
                <p style="margin: 5px 0;"><b>Lokasi Temu:</b> ${item.lokasi_temuan}</p>
                <p style="margin: 5px 0;"><b>Jenis:</b> ${item.jenis_barang}</p>
                ${infoPemilik}
            </div>
            <p style="margin: 0;"><b>Deskripsi Detail:</b><br><span style="color:#353535;">${item.deskripsi || 'Tidak ada deskripsi.'}</span></p>
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
            <div style="background: ${bgPopup}; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid ${borderPopup};">
                <p style="margin: 5px 0;"><b>ID Laporan:</b> <span style="color:${colorText}; font-weight:bold;">${formatId}</span></p>
                <p style="margin: 5px 0;"><b>Tanggal Kehilangan:</b> ${tanggalFormat}</p>
                <p style="margin: 5px 0;"><b>Status:</b> <span style="color: #3C6E71; font-weight:600;">${item.status}</span></p>
                <p style="margin: 5px 0;"><b>Kategori:</b> ${item.kategori}</p>
                <p style="margin: 5px 0;"><b>Lokasi Terakhir:</b> ${item.lokasi_terakhir}</p>
            </div>
            <p style="margin: 0;"><b>Ciri-ciri Khusus:</b><br><span style="color:#353535;">${item.ciri_ciri || 'Tidak ada ciri-ciri spesifik.'}</span></p>
        `;
    }

    if(waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);

    Swal.fire({
        title: `<span style="color: ${colorText}; font-weight:700;">${item.nama_barang}</span>`,
        html: `
            <div style="text-align: left; font-family: 'Outfit', sans-serif; font-size: 14px;">
                ${htmlContent}
                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #cbd5e1;">
                <p style="text-align: center; margin-bottom: 10px;"><b>Tahu barang ini?</b></p>
                <a href="https://wa.me/${waNumber}?text=${encodeURIComponent(pesanTemplate)}" target="_blank" style="display: block; background: #3C6E71; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    <i class="fab fa-whatsapp"></i> ${tujuanChat}
                </a>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false 
    });
};

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
        let myTemuan = allDataBarang.filter(i => i.nim_pengupload === savedNim);
        let myHilang = allDataHilang.filter(i => i.nim_pengupload === savedNim);
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
                siblingOpts.forEach(el => el.parentElement.classList.remove('selected-filter'));
            } else {
                this.parentElement.classList.toggle('selected-filter');
                if (this.parentElement.classList.contains('selected-filter')) {
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
            document.querySelectorAll('.sub-menu li').forEach(el => el.classList.remove('selected-filter'));
            selectedDate = null; 
            setupCalendar(); 
            terapkanSemuaFilter(); 
        });
    }
}

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
        
        monthYearText.innerHTML = `${months[month]}, <span style="font-weight: 400;">${year}</span>`;

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
            
            daysHTML += `<div class="calendar-day ${isSelected}" data-day="${i}" ${isToday ? "style='color:#3C6E71; font-weight:800;'" : ""}>${i}</div>`;
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

    document.getElementById('btnUbahWa')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: waInput } = await Swal.fire({
            title: 'Atur Nomor WhatsApp',
            text: 'Masukkan nomor yang aktif untuk dihubungi:',
            html: '<input id="swal-input-telp" class="swal2-input" type="tel" placeholder="0812xxxxxx" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, \'\')">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#284B63',
            preConfirm: () => {
                return document.getElementById('swal-input-telp').value;
            }
        });

        if (waInput && savedNim) {
            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
            const { error } = await supabaseClient
                .from('users')
                .update({ no_telp: waInput }) 
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

    document.getElementById('btnUbahPass')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: formValues } = await Swal.fire({
            title: 'Ubah Password',
            html:
                '<input id="oldPass" class="swal2-input" placeholder="Password Lama" type="password">' +
                '<input id="newPass" class="swal2-input" placeholder="Password Baru" type="password">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#284B63',
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

    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Konfirmasi',
            text: "Apakah Anda yakin ingin keluar?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#353535',
            confirmButtonText: 'Ya, Keluar!'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                window.location.href = "login.html";
            }
        });
    });
}

// PERBAIKAN: Fungsi grafik yang akurat ke database dan warna teks diperbaiki
// PERBAIKAN: Fungsi grafik dengan warna kontras dan tidak menyatu dengan background
function updateDiagramKategori() {
    const ctx = document.getElementById('kategoriChart');
    if (!ctx) return;

    const catCounts = { 'Elektronik': 0, 'Dokumen': 0, 'Aksesoris': 0, 'Perlengkapan': 0 };
    const semuaDataAktif = [...allDataBarang, ...allDataHilang];
    
    semuaDataAktif.forEach(item => {
        let kat = item.kategori;
        if(kat) {
            if(catCounts[kat] !== undefined) {
                catCounts[kat]++;
            } else {
                catCounts[kat] = 1; 
            }
        }
    });

    const labels = Object.keys(catCounts);
    const dataValues = Object.values(catCounts);
    const totalData = dataValues.reduce((a, b) => a + b, 0);

    const chartData = totalData === 0 ? [1] : dataValues;
    const chartLabels = totalData === 0 ? ['Belum ada data'] : labels;
    
    // PERBAIKAN WARNA: 
    // Menggunakan warna yang lebih gelap/tegas agar mencolok di background putih
    const chartColors = totalData === 0 
        ? ['#94A3B8'] // Slate/Abu-abu gelap untuk state "Belum ada data"
        : ['#3C6E71', '#284B63', '#F4B41A', '#E07A5F', '#81B29A']; // Warna solid untuk data aktif

    if (myKategoriChart) {
        myKategoriChart.destroy();
    }

    myKategoriChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 2, // Tambahan border agar batas antar warna lebih jelas
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right', 
                    labels: {
                        boxWidth: 10,
                        padding: 10,
                        font: { size: 10, family: 'Outfit' },
                        color: '#2b2b2b' // Teks lebih gelap lagi agar sangat kontras
                    }
                },
                tooltip: {
                    enabled: totalData !== 0,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' }
                }
            }
        }
    });
}

// ==========================================
// ACCORDION KALENDER & STATISTIK DI MOBILE
// ==========================================
function initSideboxAccordionMobile() {
    if (window.innerWidth > 768) return;

    const sideBoxes = document.querySelectorAll('.sidebar .side-box:nth-child(2), .sidebar .side-box:nth-child(3)');

    sideBoxes.forEach(box => {
        const title = box.querySelector('h4');
        if (!title || title.dataset.accordionInit) return;

        title.dataset.accordionInit = 'true';
        title.style.cursor = 'pointer';
        title.style.marginBottom = '0';
        title.style.display = 'flex';
        title.style.justifyContent = 'space-between';
        title.style.alignItems = 'center';

        const arrow = document.createElement('i');
        arrow.className = 'fas fa-chevron-down';
        arrow.style.transition = 'transform 0.3s';
        arrow.style.fontSize = '12px';
        title.appendChild(arrow);

        const content = document.createElement('div');
        content.style.maxHeight = '0';
        content.style.overflow = 'hidden';
        content.style.transition = 'max-height 0.4s ease, margin-top 0.3s';

        const children = Array.from(box.children).filter(el => el !== title);
        children.forEach(child => content.appendChild(child));
        box.appendChild(content);

        title.addEventListener('click', () => {
            const isOpen = content.style.maxHeight !== '0px' && content.style.maxHeight !== '';
            if (isOpen) {
                content.style.maxHeight = '0';
                content.style.marginTop = '0';
                arrow.style.transform = 'rotate(0deg)';
            } else {
                content.style.maxHeight = '600px';
                content.style.marginTop = '12px';
                arrow.style.transform = 'rotate(180deg)';
            }
        });
    });
}

// ==========================================
// FUNGSI FILTER YANG SUDAH KEBAL HURUF BESAR/KECIL
// ==========================================
function terapkanSemuaFilter() {
    let dataSumber = [];
    
    if (currentTab === 'temuan') {
        dataSumber = allDataBarang;
    } else if (currentTab === 'hilang') {
        dataSumber = allDataHilang;
    } else if (currentTab === 'laporanku') {
        let myTemuan = allDataBarang.filter(i => i.nim_pengupload === savedNim);
        let myHilang = allDataHilang.filter(i => i.nim_pengupload === savedNim);
        dataSumber = [...myTemuan, ...myHilang]; 
    }

    let hasilFilter = dataSumber;

    // Filter Pencarian Teks
    if (pencarianAktif !== "") {
        hasilFilter = hasilFilter.filter(item => {
            const semuaInfoBarang = Object.values(item).join(" ").toLowerCase();
            return semuaInfoBarang.includes(pencarianAktif);
        });
    }

    // Filter Kategori dari Sidebar
    for (const [kategoriUtama, daftarPilihan] of Object.entries(filterAktif)) {
        if (daftarPilihan.length > 0) {
            hasilFilter = hasilFilter.filter(item => {
                let isTemu = item.tabel_asal === 'temuan';
                
                if (kategoriUtama === 'Fakultas') {
                    // Ambil lokasi (FASILITAS UMUM dari database)
                    let loc = isTemu ? item.lokasi_temuan : item.lokasi_terakhir;
                    
                    // KUNCI PERBAIKAN: Ubah semuanya jadi huruf besar!
                    let locUpper = loc ? loc.toUpperCase() : "";
                    let pilihanUpper = daftarPilihan.map(p => p.toUpperCase());
                    
                    // Sekarang "FASILITAS UMUM" dari sidebar PASTI COCOK dengan "FASILITAS UMUM" dari database
                    return pilihanUpper.includes(locUpper);
                }
                
                if (kategoriUtama === 'Jenis Barang' && isTemu) {
                    return daftarPilihan.includes(item.jenis_barang);
                }
                
                if (kategoriUtama === 'Kategori') {
                    return daftarPilihan.includes(item.kategori);
                }
                
                return true;
            });
        }
    }

    // Filter Kalender
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