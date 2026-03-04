const express = require('express');
const path = require('path');
const supabase = require('./js/supabaseClient'); // Memanggil koneksi Supabase Backend
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- ROUTES UNTUK HALAMAN ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/sarpras', (req, res) => {
    res.sendFile(path.join(__dirname, 'login_sarpras.html'));
});

// --- API UNTUK LOGIN (MENGHUBUNGKAN KE SUPABASE) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            return res.status(401).json({ success: false, message: "Username atau Password salah!" });
        }

        // Kirim data user ke frontend jika berhasil
        res.json({ success: true, user: data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});

app.listen(PORT, () => {
    console.log(`Sistem FINDIT berjalan di http://localhost:${PORT}`);
});