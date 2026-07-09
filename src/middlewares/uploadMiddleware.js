const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mimeExtMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '../../public/uploads/tickets');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = mimeExtMap[file.mimetype] || '.bin';
    cb(null, 'ticket-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (mimeExtMap[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Hanya diperbolehkan mengunggah berkas gambar (JPG/PNG/GIF/WEBP)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
