// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve file statis (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Default route ke index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});