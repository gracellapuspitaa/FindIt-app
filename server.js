const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve file statis (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Default route ke index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Route untuk halaman login sarpras
app.get('/sarpras.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'sarpras.html'));
});

// Alternatif: route dengan nama yang lebih simple
app.get('/sarpras', (req, res) => {
    res.sendFile(path.join(__dirname, 'sarpras.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- Login Mahasiswa: http://localhost:${PORT}/`);
    console.log(`- Login Sarpras: http://localhost:${PORT}/sarpras`);
});