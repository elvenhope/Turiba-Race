const express = require("express");
const path = require("path");
const app = express();

// Serve all static files (HTML, JS, images, etc.)
app.use(express.static(__dirname));

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Phaser game running on port ${PORT}`);
});