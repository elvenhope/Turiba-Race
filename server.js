const express = require("express");
const path = require("path");
const app = express();

// Serve static files with correct MIME types
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// ONLY serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Phaser game running on port ${PORT}`);
});