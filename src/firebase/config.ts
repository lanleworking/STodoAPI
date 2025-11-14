import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const keyPath = path.join(process.cwd(), 'firebase-key.json');

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ | Firebase admin initialized');
} catch (error) {
    console.error('Error initializing Firebase admin:', error);
}

export const messaging = admin.messaging();
