// ==========================================
// VARIABEL GLOBAL UNTUK MENYIMPAN DATA SEMENTARA
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
    
    // Load semua data di awal
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
// FUNGSI LOAD DATA TERPUSAT
// ==========================================
async function reloadAllData() {
    Swal.fire({ title: 'Memuat Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const [resUsers, resItems, resHilang] = await Promise.all([
        supabaseClient.from('users').select('*').eq('role', 'Mahasiswa'),
        supabaseClient.from('items').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('barang_hilang').select('*').order('created_at', { ascending: false })
    ]);

    globalUsers = resUsers.data || [];
    globalTemuan = resItems.data || [];
    globalHilang = resHilang.data || [];

    Swal.close();
    
    // Refresh Tampilan yang sedang aktif
    renderDashboardStats();
    renderTableMahasiswa();
    renderTableTemuan();
    renderTableHilang();
}

// ==========================================
// SPA ROUTING
// ==========================================
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
            setupSearchBar(); // Reset search logic
        });
    });
}

// ==========================================
// DASHBOARD & CHARTS
// ==========================================
let myCharts = {};

function renderDashboardStats() {
    const selesaiTemuan = globalTemuan.filter(i => i.status_lokasi === 'Sudah Dikembalikan').length;
    const selesaiHilang = globalHilang.filter(i => i.status === 'Selesai').length;

    document.getElementById('countMhs').innerText = globalUsers.length;
    document.getElementById('countTemuan').innerText = globalTemuan.length;
    document.getElementById('countHilang').innerText = globalHilang.length;
    document.getElementById('countSelesai').innerText = selesaiTemuan + selesaiHilang;

    const catCounts = { Elektronik: 0, Dokumen: 0, Aksesoris: 0, Perlengkapan: 0 };
    globalTemuan.concat(globalHilang).forEach(obj => { if(catCounts[obj.kategori] !== undefined) catCounts[obj.kategori]++; });

    let statusCounts = { 'Di Sarpras': 0, 'Dibawa Penemu': 0, 'Selesai': selesaiTemuan + selesaiHilang };
    globalTemuan.forEach(i => {
        if(i.status_lokasi === 'Di Sarpras') statusCounts['Di Sarpras']++;
        if(i.status_lokasi === 'Dibawa Penemu') statusCounts['Dibawa Penemu']++;
    });

    renderDonutChart('chartStatus', ['Di Sarpras', 'Dibawa Penemu', 'Selesai'], Object.values(statusCounts), ['#0284c7', '#ca8a04', '#16a34a']);
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
// CRUD MAHASISWA
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
                    <button class="btn-action btn-delete" title="Hapus Data" onclick="hapusMahasiswa('${user.id_user}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// 1. Tambah Mahasiswa Manual
window.bukaModalMhs = () => { document.getElementById('modalMhs').classList.add('show'); }
window.tutupModal = (id) => { document.getElementById(id).classList.remove('show'); }

window.simpanMahasiswaBaru = async () => {
    const nim = document.getElementById('mhsNim').value;
    const nama = document.getElementById('mhsNama').value;
    const telp = document.getElementById('mhsTelp').value;
    const pass = document.getElementById('mhsPass').value;

    if(!nim || !nama || !pass) return Swal.fire('Error', 'NIM, Nama, dan Password wajib diisi', 'error');

    Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
    const { error } = await supabaseClient.from('users').insert([{ username: nim, nama_lengkap: nama, no_telp: telp, password: pass, role: 'Mahasiswa' }]);
    
    if(error) Swal.fire('Gagal', error.message, 'error');
    else { Swal.fire('Berhasil', 'Data ditambahkan', 'success'); tutupModal('modalMhs'); reloadAllData(); }
}

// 2. Import CSV (NIM,Nama,NoTelp,Password)
window.prosesImportCSV = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        // Parsing CSV sederhana (Pemisah Koma)
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const dataToInsert = [];
        
        // Asumsi Format Baris: NIM, NAMA, TELP, PASSWORD (Abaikan baris pertama jika header)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].length >= 2 && rows[i][0] !== "") {
                dataToInsert.push({
                    username: rows[i][0],
                    nama_lengkap: rows[i][1],
                    no_telp: rows[i][2] || null,
                    password: rows[i][3] || '123456',
                    role: 'Mahasiswa'
                });
            }
        }

        if(dataToInsert.length > 0) {
            Swal.fire({ title: 'Menyimpan '+dataToInsert.length+' data...', didOpen: () => Swal.showLoading() });
            const { error } = await supabaseClient.from('users').insert(dataToInsert);
            if(error) Swal.fire('Gagal', 'Ada data ganda (NIM sudah terdaftar) atau format salah.', 'error');
            else { Swal.fire('Berhasil', 'Import data selesai', 'success'); reloadAllData(); }
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// 3. Reset Password
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

// 4. Hapus Mahasiswa
window.hapusMahasiswa = async (id) => {
    if(await confirmAction("Yakin ingin menghapus mahasiswa ini?")) {
        await supabaseClient.from('users').delete().eq('id_user', id);
        reloadAllData();
    }
}

// ==========================================
// RENDER TABEL BARANG (TEMUAN & HILANG)
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
                <td><button class="btn-action btn-edit" onclick="bukaDetailBarang('${item.id_item}', 'temuan')">Detail & Aksi</button></td>
            </tr>`;
    });
}

function renderTableHilang() {
    const tbody = document.getElementById('tableHilang');
    tbody.innerHTML = '';
    globalHilang.forEach(item => {
        const formatId = "HL-" + String(item.id_hilang).padStart(3, '0');
        let badgeCls = item.status === 'Selesai' ? 'badge-selesai' : 'badge-penemu';
        tbody.innerHTML += `
            <tr class="search-row">
                <td><strong>${formatId}</strong></td>
                <td>${item.nama_barang}</td>
                <td>${item.kategori}</td>
                <td>${item.lokasi_terakhir}</td>
                <td><span class="badge-status ${badgeCls}">${item.status}</span></td>
                <td><button class="btn-action btn-edit" onclick="bukaDetailBarang('${item.id_hilang}', 'hilang')">Detail & Aksi</button></td>
            </tr>`;
    });
}

// ==========================================
// MODAL DETAIL LENGKAP & AKSI BARANG
// ==========================================
window.bukaDetailBarang = function(id, tipe) {
    const isTemu = tipe === 'temuan';
    const dataObj = isTemu ? globalTemuan.find(i => String(i.id_item) === String(id)) : globalHilang.find(i => String(i.id_hilang) === String(id));
    
    if(!dataObj) return;

    const formatId = (isTemu ? "BR-" : "HL-") + String(id).padStart(3, '0');
    
    // Set Gambar
    const imgBox = document.getElementById('detImgBox');
    imgBox.innerHTML = dataObj.image_url 
        ? `<img src="${dataObj.image_url}">` 
        : `<i class="fas ${isTemu ? 'fa-box' : 'fa-search'} fa-4x" style="color:#cbd5e1;"></i>`;

    // Set Info
    const infoBox = document.getElementById('detInfo');
    if (isTemu) {
        infoBox.innerHTML = `
            <p><strong>ID Laporan:</strong> <span style="color:var(--orange); font-weight:bold;">${formatId}</span></p>
            <p><strong>Nama Barang:</strong> ${dataObj.nama_barang}</p>
            <p><strong>Status Saat Ini:</strong> ${dataObj.status_lokasi}</p>
            <p><strong>Kategori:</strong> ${dataObj.kategori}</p>
            <p><strong>Lokasi Temu:</strong> ${dataObj.lokasi_temuan}</p>
            <p><strong>Deskripsi:</strong> ${dataObj.deskripsi || '-'}</p>
        `;
    } else {
        infoBox.innerHTML = `
            <p><strong>ID Laporan:</strong> <span style="color:#ef4444; font-weight:bold;">${formatId}</span></p>
            <p><strong>Nama Barang:</strong> ${dataObj.nama_barang}</p>
            <p><strong>Status:</strong> ${dataObj.status}</p>
            <p><strong>Kategori:</strong> ${dataObj.kategori}</p>
            <p><strong>Lokasi Terakhir:</strong> ${dataObj.lokasi_terakhir}</p>
            <p><strong>Kontak Pelapor:</strong> ${dataObj.wa_pelapor}</p>
            <p><strong>Ciri Ciri:</strong> ${dataObj.ciri_ciri || '-'}</p>
        `;
    }

    // Set Tombol Footer
    const footer = document.getElementById('detFooter');
    let btns = `<button class="btn-action btn-delete" style="font-size:14px; padding:8px 15px;" onclick="aksiHapusBarang('${id}', '${tipe}')"><i class="fas fa-trash"></i> Hapus Laporan</button>`;
    
    // Tombol Update Status Khusus Temuan
    if (isTemu && dataObj.status_lokasi !== 'Sudah Dikembalikan') {
        btns += `<button class="btn-success" onclick="aksiSelesaiTemuan('${id}')"><i class="fas fa-check-circle"></i> Tandai Dikembalikan</button>`;
    }
    footer.innerHTML = btns;

    document.getElementById('modalDetail').classList.add('show');
}

// Aksi Khusus dalam Modal
window.aksiSelesaiTemuan = async (id) => {
    if(await confirmAction("Tandai barang ini sudah dikembalikan ke pemiliknya?")) {
        await supabaseClient.from('items').update({ status_lokasi: 'Sudah Dikembalikan' }).eq('id_item', id);
        tutupModal('modalDetail'); reloadAllData();
    }
}

window.aksiHapusBarang = async (id, tipe) => {
    if(await confirmAction("Data ini akan dihapus permanen dari sistem. Lanjutkan?")) {
        const tabel = tipe === 'temuan' ? 'items' : 'barang_hilang';
        const kolom = tipe === 'temuan' ? 'id_item' : 'id_hilang';
        await supabaseClient.from(tabel).delete().eq(kolom, id);
        tutupModal('modalDetail'); reloadAllData();
    }
}

// Helper SweetAlert Confirm
async function confirmAction(text) {
    const res = await Swal.fire({ title: 'Konfirmasi', text: text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#004E98', confirmButtonText: 'Ya, Lanjutkan' });
    return res.isConfirmed;
}

// ==========================================
// PENCARIAN
// ==========================================
function setupSearchBar() {
    const searchInput = document.getElementById('adminSearch');
    // Hapus event listener lama dengan menukar elemen (clone) agar tidak bentrok
    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);

    newSearch.addEventListener('keyup', function(e) {
        const keyword = e.target.value.toLowerCase();
        const activeSection = document.querySelector('.content-section.active');
        const rows = activeSection.querySelectorAll('.search-row');
        rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(keyword) ? '' : 'none'; });
    });
}