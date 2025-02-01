import multer from 'multer';
import path from 'path';
import fs from 'fs';
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

const uploadDir = path.join('./data/uploads/');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// const storage = multer.diskStorage({
//   destination: function (_req, _file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (_req, file, cb) {
//     const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, uniquePrefix + '-' + file.originalname);
//   },
// });

const FILE_TYPES = ['video/mp4', 'video/webm'];

// export const upload = multer({
//   storage,
//   limits: {
//     fileSize: 1024 * 1024 * 200, // 200 MB in bytes
//   },
//   fileFilter: (_req, file, cb) => {
//     if (FILE_TYPES.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type'));
//     }
//   },
// });
const s3 = new S3Client({
  credentials: {
    accessKeyId: "AKIAU5LH55ZKQYO7FNMR",
    secretAccessKey: "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"
  },
  region: "eu-north-1"
})

const s3Storage = multerS3({
  s3: s3,
  bucket: "nkx-video-87hy238h9g78f",
  acl: "public-read",
  metadata: (_req, file, cb) => {
    cb(null, { fieldname: file.fieldname })
  },
  key: (_req, file, cb) => {
    const fileName = Date.now() + "_" + file.fieldname + "_" + file.originalname;
    cb(null, fileName);
  }
});

export const upload = multer({
  storage: s3Storage,
  limits: {
    fileSize: 1024 * 1024 * 200, // 200 MB in bytes 
  },
  fileFilter(_req, file, cb) {
    if (FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});