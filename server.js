const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// supaya bisa akses css, js, images
app.use(express.static(__dirname));

// route halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});