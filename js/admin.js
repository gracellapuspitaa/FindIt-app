// ==========================================
// VARIABEL GLOBAL SINKRONISASI DATABASE
// ==========================================
let globalUsers = [];
let globalTemuan = [];
let globalHilang = [];

document.addEventListener('DOMContentLoaded', async function() {
    const adminName = localStorage.getItem("namaUser");
    if (!adminName) { window.location.href = "login_sarpras.html"; return; }
    
    document.getElementById('adminName').innerText = adminName;
    setupWaktuGreeting();
    setupSPARouting();
    
    await reloadAllData();
    setupSearchBar();
    
    document.getElementById('adminProfileBtn').addEventListener('click', () => document.getElementById('adminDropdown').classList.toggle('show'));
    document.getElementById('btnAdminLogout').addEventListener('click', () => { localStorage.clear(); window.location.href = "login_sarpras.html"; });
});

function setupWaktuGreeting() {
    const hour = new Date().getHours();
    let greet = 'Selamat Malam';
    if(hour >= 5 && hour < 12) greet = 'Selamat Pagi';
    else if(hour >= 12 && hour < 15) greet = 'Selamat Siang';
    else if(hour >= 15 && hour < 18) greet = 'Selamat Sore';
    document.getElementById('greetingText').innerText = `${greet}, Admin!`;
}

// ==========================================
// SINKRONISASI DATA DARI SUPABASE (REAL-TIME MIRROR)
// ==========================================
async function reloadAllData() {
    Swal.fire({ title: 'Sinkronisasi Database...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const [resUsers, resItems, resHilang] = await Promise.all([
        supabaseClient.from('users').select('*').eq('role', 'Mahasiswa'),
        supabaseClient.from('items').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('barang_hilang').select('*').order('created_at', { ascending: false })
    ]);

    globalUsers = resUsers.data || [];
    globalTemuan = resItems.data || [];
    globalHilang = resHilang.data || [];

    Swal.close();
    
    renderDashboardStats();
    renderTableMahasiswa();
    renderTableTemuan();
    renderTableHilang();
}

function setupSPARouting() {
    const menus = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.content-section');

    menus.forEach(menu => {
        menu.addEventListener('click', function() {
            menus.forEach(m => m.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            document.getElementById('adminSearch').value = '';
            setupSearchBar(); 
        });
    });
}

// ==========================================
// DASHBOARD & CHARTS
// ==========================================
let myCharts = {};

function renderDashboardStats() {
    const selesaiTemuan = globalTemuan.filter(i => i.status_lokasi === 'Sudah Dikembalikan').length;
    const selesaiHilang = globalHilang.filter(i => i.status === 'Selesai' || i.status === 'Case Closed').length;

    document.getElementById('countMhs').innerText = globalUsers.length;
    document.getElementById('countTemuan').innerText = globalTemuan.length;
    document.getElementById('countHilang').innerText = globalHilang.length;
    document.getElementById('countSelesai').innerText = selesaiTemuan + selesaiHilang;

    const catCounts = { Elektronik: 0, Dokumen: 0, Aksesoris: 0, Perlengkapan: 0 };
    globalTemuan.concat(globalHilang).forEach(obj => { if(catCounts[obj.kategori] !== undefined) catCounts[obj.kategori]++; });

    let statusCounts = { 'Di Sarpras': 0, 'Dibawa Penemu': 0, 'Selesai / Closed': selesaiTemuan + selesaiHilang };
    globalTemuan.forEach(i => {
        if(i.status_lokasi === 'Di Sarpras') statusCounts['Di Sarpras']++;
        if(i.status_lokasi === 'Dibawa Penemu') statusCounts['Dibawa Penemu']++;
    });

    renderDonutChart('chartStatus', ['Di Sarpras', 'Dibawa Penemu', 'Selesai / Closed'], Object.values(statusCounts), ['#0284c7', '#ca8a04', '#16a34a']);
    renderBarChart('chartKategori', Object.keys(catCounts), Object.values(catCounts), '#f97316');
    renderHorizontalBar('chartLokasi', ['FEB', 'Kantin Pusat', 'Perpustakaan', 'FASILKOM'], [12, 8, 5, 3], '#3b82f6');
}

function renderDonutChart(cId, lbl, data, col) {
    if(myCharts[cId]) myCharts[cId].destroy();
    myCharts[cId] = new Chart(document.getElementById(cId).getContext('2d'), { type: 'doughnut', data: { labels: lbl, datasets: [{ data: data, backgroundColor: col }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%' } });
}
function renderBarChart(cId, lbl, data, col) {
    if(myCharts[cId]) myCharts[cId].destroy();
    myCharts[cId] = new Chart(document.getElementById(cId).getContext('2d'), { type: 'bar', data: { labels: lbl, datasets: [{ label: 'Jumlah', data: data, backgroundColor: col }] }, options: { responsive: true, maintainAspectRatio: false } });
}
function renderHorizontalBar(cId, lbl, data, col) {
    if(myCharts[cId]) myCharts[cId].destroy();
    myCharts[cId] = new Chart(document.getElementById(cId).getContext('2d'), { type: 'bar', data: { labels: lbl, datasets: [{ label: 'Kasus', data: data, backgroundColor: col }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false } });
}

// ==========================================
// CRUD MAHASISWA & IMPORT CSV (DIKEMBALIKAN!)
// ==========================================
function renderTableMahasiswa() {
    const tbody = document.getElementById('tableMahasiswa');
    tbody.innerHTML = '';
    if(globalUsers.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada data</td></tr>'; return; }
    
    globalUsers.forEach(user => {
        tbody.innerHTML += `
            <tr class="search-row">
                <td><strong>${user.username}</strong></td>
                <td>${user.nama_lengkap}</td>
                <td>${user.no_telp || '-'}</td>
                <td>
                    <button class="btn-action btn-warn" title="Reset Password" onclick="resetPasswordMhs('${user.id_user}', '${user.username}')"><i class="fas fa-key"></i></button>
                </td>
            </tr>`;
    });
}

// 1. FUNGSI MUNCULKAN MODAL TAMBAH
window.bukaModalMhs = () => { document.getElementById('modalMhs').classList.add('show'); }
window.tutupModal = (id) => { 
    document.getElementById(id).classList.remove('show'); 
    
    // Khusus membersihkan modal Detail Barang agar tidak nyangkut saat dibuka lagi
    if (id === 'modalDetail' && document.getElementById('modalBodyReplace')) {
        document.getElementById('modalBodyReplace').outerHTML = `
            <div class="modal-body">
                <div class="detail-img-box" id="detImgBox"></div>
                <div class="detail-info" id="detInfo"></div>
            </div>
        `;
        document.querySelector('#modalDetail .modal-content').classList.remove('large');
    }
}

// 2. FUNGSI SIMPAN MAHASISWA MANUAL
window.simpanMahasiswaBaru = async () => {
    const nim = document.getElementById('mhsNim').value;
    const nama = document.getElementById('mhsNama').value;
    const telp = document.getElementById('mhsTelp').value;
    const pass = document.getElementById('mhsPass').value;
    const fakultas = document.getElementById('mhsFakultas').value; // Mengambil ID Fakultas

    if(!nim || !nama || !pass || !fakultas) return Swal.fire('Error', 'NIM, Nama, Fakultas, dan Password wajib diisi', 'error');

    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
    
    // Mengirim data ke Supabase beserta id_fakultas
    const { error } = await supabaseClient.from('users').insert([{ 
        username: nim, 
        nama_lengkap: nama, 
        no_telp: telp, 
        password: pass, 
        role: 'Mahasiswa',
        id_fakultas: parseInt(fakultas) // Diubah jadi angka
    }]);
    
    if(error) {
        console.error("Detail Error Supabase:", error);
        // Memunculkan pesan error jujur dari database
        Swal.fire('Gagal Disimpan!', error.message, 'error'); 
    } else { 
        Swal.fire('Berhasil', 'Mahasiswa baru ditambahkan', 'success'); 
        tutupModal('modalMhs'); 
        
        // Kosongkan form setelah sukses
        document.getElementById('mhsNim').value = '';
        document.getElementById('mhsNama').value = '';
        document.getElementById('mhsTelp').value = '';
        document.getElementById('mhsFakultas').value = '';
        
        reloadAllData(); 
    }
}

// 3. FUNGSI IMPORT CSV
window.prosesImportCSV = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const dataToInsert = [];
        
        // FORMAT EXCEL BARU: NIM, NAMA, NO_TELP, PASSWORD, ID_FAKULTAS
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].length >= 2 && rows[i][0] !== "") {
                dataToInsert.push({
                    username: rows[i][0],
                    nama_lengkap: rows[i][1],
                    no_telp: rows[i][2] || null,
                    password: rows[i][3] || '123456',
                    role: 'Mahasiswa',
                    // Ambil dari kolom ke-5 CSV, jika kosong default ke 1 (FEB)
                    id_fakultas: rows[i][4] ? parseInt(rows[i][4]) : 1 
                });
            }
        }

        if(dataToInsert.length > 0) {
            Swal.fire({ title: 'Menyimpan '+dataToInsert.length+' data...', didOpen: () => Swal.showLoading() });
            const { error } = await supabaseClient.from('users').insert(dataToInsert);
            
            if(error) {
                console.error("Detail Error CSV:", error);
                Swal.fire('Gagal Import!', error.message, 'error');
            } else { 
                Swal.fire('Berhasil', 'Import data selesai', 'success'); 
                reloadAllData(); 
            }
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// 4. RESET PASSWORD
window.resetPasswordMhs = async (id, nim) => {
    const { value: newPass } = await Swal.fire({
        title: `Reset Password ${nim}`,
        input: 'text',
        inputLabel: 'Masukkan Password Baru',
        inputValue: '123456',
        showCancelButton: true
    });

    if (newPass) {
        Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });
        const { error } = await supabaseClient.from('users').update({ password: newPass }).eq('id_user', id);
        if(!error) Swal.fire('Berhasil', 'Password berhasil direset', 'success');
        else Swal.fire('Gagal', error.message, 'error');
    }
}

// ==========================================
// RENDER TABEL BARANG (HISTORY LENGKAP)
// ==========================================
function renderTableTemuan() {
    const tbody = document.getElementById('tableTemuan');
    tbody.innerHTML = '';
    globalTemuan.forEach(item => {
        const formatId = "BR-" + String(item.id_item).padStart(3, '0');
        let badgeCls = item.status_lokasi === 'Dibawa Penemu' ? 'badge-penemu' : (item.status_lokasi === 'Sudah Dikembalikan' ? 'badge-selesai' : 'badge-sarpras');

        tbody.innerHTML += `
            <tr class="search-row">
                <td><strong>${formatId}</strong></td>
                <td>${item.nama_barang}</td>
                <td>${item.kategori}</td>
                <td>${item.lokasi_temuan}</td>
                <td><span class="badge-status ${badgeCls}">${item.status_lokasi}</span></td>
                <td><button class="btn-action btn-edit" onclick="bukaDetailBarang('${item.id_item}', 'temuan')">Lihat Detail</button></td>
            </tr>`;
    });
}

function renderTableHilang() {
    const tbody = document.getElementById('tableHilang');
    tbody.innerHTML = '';
    globalHilang.forEach(item => {
        const formatId = "HL-" + String(item.id_hilang).padStart(3, '0');
        let badgeCls = (item.status === 'Selesai' || item.status === 'Case Closed') ? 'badge-selesai' : 'badge-penemu';
        
        tbody.innerHTML += `
            <tr class="search-row">
                <td><strong>${formatId}</strong></td>
                <td>${item.nama_barang}</td>
                <td>${item.kategori}</td>
                <td>${item.lokasi_terakhir}</td>
                <td><span class="badge-status ${badgeCls}">${item.status}</span></td>
                <td><button class="btn-action btn-edit" onclick="bukaDetailBarang('${item.id_hilang}', 'hilang')">Lihat Detail</button></td>
            </tr>`;
    });
}

// ==========================================
// MODAL DETAIL LENGKAP & SISTEM RESOLVE (CASE CLOSED)
// ==========================================
window.bukaDetailBarang = function(id, tipe) {
    const isTemu = tipe === 'temuan';
    const dataObj = isTemu ? globalTemuan.find(i => String(i.id_item) === String(id)) : globalHilang.find(i => String(i.id_hilang) === String(id));
    if(!dataObj) return;

    const formatId = (isTemu ? "BR-" : "HL-") + String(id).padStart(3, '0');
    
    document.querySelector('#modalDetail .modal-content').classList.add('large');

    // MENCARI DATA PELAPOR ASLI DARI TABEL USERS 
    let pelapor = globalUsers.find(u => 
        u.username === dataObj.nim_pengupload || 
        u.no_telp === (isTemu ? dataObj.id_penemu : dataObj.wa_pelapor)
    );

    let infoPelaporHTML = '';
    if (pelapor) {
        infoPelaporHTML = `
            <p><strong>NIM Mahasiswa:</strong> ${pelapor.username}</p>
            <p><strong>Nama Lengkap:</strong> ${pelapor.nama_lengkap}</p>
            <p><strong>No. Telp Terkini (Aktif):</strong> <span style="color:#25D366; font-weight:bold;">${pelapor.no_telp || 'Tidak Ada'}</span></p>
        `;
    } else {
        infoPelaporHTML = `
            <p style="color:#ef4444; font-size:12px;"><i>Data pelapor tidak terikat dengan akun mahasiswa manapun (Guest/Anonim).</i></p>
            <p><strong>Kontak Ditinggalkan:</strong> ${isTemu ? dataObj.id_penemu : dataObj.wa_pelapor}</p>
        `;
    }

    let infoBarangHTML = isTemu ? `
            <p><strong>ID:</strong> <span style="color:var(--orange); font-weight:bold;">${formatId}</span></p>
            <p><strong>Barang:</strong> ${dataObj.nama_barang} (${dataObj.kategori})</p>
            <p><strong>Status Saat Ini:</strong> ${dataObj.status_lokasi}</p>
            <p><strong>Lokasi Ditemukan:</strong> ${dataObj.lokasi_temuan}</p>
            <p><strong>Tanggal Catat:</strong> ${new Date(dataObj.created_at).toLocaleString('id-ID')}</p>
            <p><strong>Deskripsi Khusus:</strong> <br>${dataObj.deskripsi || '-'}</p>
        ` : `
            <p><strong>ID:</strong> <span style="color:#ef4444; font-weight:bold;">${formatId}</span></p>
            <p><strong>Barang Hilang:</strong> ${dataObj.nama_barang} (${dataObj.kategori})</p>
            <p><strong>Status Kasus:</strong> ${dataObj.status}</p>
            <p><strong>Lokasi Terakhir:</strong> ${dataObj.lokasi_terakhir}</p>
            <p><strong>Tanggal Hilang:</strong> ${dataObj.tanggal_hilang}</p>
            <p><strong>Ciri-ciri Fisik:</strong> <br>${dataObj.ciri_ciri || '-'}</p>
        `;

    const imgHTML = dataObj.image_url 
        ? `<img src="${dataObj.image_url}" style="width:100%; height:100%; object-fit:cover;">` 
        : `<i class="fas ${isTemu ? 'fa-box' : 'fa-search'} fa-4x" style="color:#cbd5e1;"></i>`;

    document.getElementById('detImgBox').outerHTML = `
        <div class="modal-body split-view" id="modalBodyReplace">
            <div class="left-col">
                <div class="detail-img-box" style="height: 180px; background: #f1f5f9; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; overflow:hidden;">
                    ${imgHTML}
                </div>
                <div class="info-card info-list">
                    <h4><i class="fas fa-user-circle"></i> Info Pelapor / Penemu</h4>
                    ${infoPelaporHTML}
                </div>
            </div>
            <div class="right-col">
                <div class="info-card info-list" style="height: 100%;">
                    <h4><i class="fas fa-info-circle"></i> Rincian Barang</h4>
                    ${infoBarangHTML}
                </div>
            </div>
        </div>
    `;

    const footer = document.getElementById('detFooter');
    let btns = '';
    
    if (isTemu) {
        if (dataObj.status_lokasi !== 'Sudah Dikembalikan') {
            btns += `<button class="btn-success" onclick="aksiSelesaikanKasus('${id}', 'temuan')"><i class="fas fa-check-double"></i> Tandai Sudah Dikembalikan (Case Closed)</button>`;
        } else {
            btns += `<span style="color:#15803d; font-weight:bold;"><i class="fas fa-lock"></i> Kasus Ini Telah Selesai</span>`;
        }
    } else {
        if (dataObj.status !== 'Selesai' && dataObj.status !== 'Case Closed') {
            btns += `<button class="btn-success" onclick="aksiSelesaikanKasus('${id}', 'hilang')"><i class="fas fa-check-double"></i> Tandai Barang Ditemukan (Case Closed)</button>`;
        } else {
            btns += `<span style="color:#15803d; font-weight:bold;"><i class="fas fa-lock"></i> Laporan Ini Telah Selesai</span>`;
        }
    }
    
    footer.innerHTML = btns;
    document.getElementById('modalDetail').classList.add('show');
}

// ==========================================
// FUNGSI CASE CLOSED (SISTEM UPDATE INSTAN TANPA REFRESH)
// ==========================================
window.aksiSelesaikanKasus = async (id, tipe) => {
    if(await confirmAction("Tandai kasus ini sebagai Selesai? Data tidak akan dihapus dan tetap masuk dalam riwayat/sejarah.")) {
        
        // Munculkan loading
        Swal.fire({ title: 'Memperbarui Status...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        let err = null;

        // 1. UPDATE KE DATABASE SUPABASE
        if (tipe === 'temuan') {
            const { error } = await supabaseClient.from('items').update({ status_lokasi: 'Sudah Dikembalikan' }).eq('id_item', id);
            err = error;
        } else {
            const { error } = await supabaseClient.from('barang_hilang').update({ status: 'Case Closed' }).eq('id_hilang', id);
            err = error;
        }

        if (err) {
            Swal.fire('Gagal!', err.message, 'error');
        } else {
            // 2. UPDATE DATA DI MEMORI LOKAL BROWSER (Ini rahasia agar instan!)
            if (tipe === 'temuan') {
                const idx = globalTemuan.findIndex(i => String(i.id_item) === String(id));
                if (idx !== -1) globalTemuan[idx].status_lokasi = 'Sudah Dikembalikan';
            } else {
                const idx = globalHilang.findIndex(i => String(i.id_hilang) === String(id));
                if (idx !== -1) globalHilang[idx].status = 'Case Closed';
            }

            // 3. GAMBAR ULANG TABEL & GRAFIK DIAGRAM SECARA OTOMATIS
            renderDashboardStats();
            renderTableTemuan();
            renderTableHilang();
            tutupModal('modalDetail');

            // 4. MUNCULKAN PESAN SUKSES
            Swal.fire('Berhasil!', 'Kasus telah diselesaikan (Case Closed).', 'success').then(() => {
                // Trik: Jika admin sedang mencari barang di Search Bar, terapkan filternya lagi
                const searchInput = document.getElementById('adminSearch');
                if(searchInput.value) searchInput.dispatchEvent(new Event('keyup'));
            });
        }
    }
}

async function confirmAction(text) {
    const res = await Swal.fire({ title: 'Konfirmasi Tutup Kasus', text: text, icon: 'info', showCancelButton: true, confirmButtonColor: '#16a34a', confirmButtonText: 'Ya, Selesaikan' });
    return res.isConfirmed;
}

// ==========================================
// PENCARIAN 
// ==========================================
function setupSearchBar() {
    const searchInput = document.getElementById('adminSearch');
    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);

    newSearch.addEventListener('keyup', function(e) {
        const keyword = e.target.value.toLowerCase();
        const activeSection = document.querySelector('.content-section.active');
        const rows = activeSection.querySelectorAll('.search-row');
        rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(keyword) ? '' : 'none'; });
    });
}