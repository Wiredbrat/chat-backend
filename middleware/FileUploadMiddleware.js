import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';

    if(!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }

    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalName}_${Date.now()}`)
  },
  limits: {fileSize: 5 * 1024 * 1024}
});

const upload = multer({ storage: storage })