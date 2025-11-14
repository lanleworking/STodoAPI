import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { throwResponse } from './response';
import { EHttpCode, EStatusCodes } from '../types/http';
import { access } from 'fs/promises';

export const storeFile = async (userId: string, avtFile: File) => {
    try {
        const now = Date.now();
        const fileExt = avtFile.name.split('.').pop() || '';
        const fileName = `${userId}_${now}.${fileExt}`;
        // Convert File object to Buffer
        const buffer = Buffer.from(await avtFile.arrayBuffer());

        // Create directory path
        const userDir = join(process.cwd(), 'public', userId, 'avt');
        await mkdir(userDir, { recursive: true });

        // Create file path and save
        const filePath = join(userDir, fileName);
        await writeFile(filePath, buffer);

        // Return relative path for database storage
        return `public/${userId}/avt/${fileName}`;
    } catch (error) {
        console.error('Error storing file:', error);
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.SAVE_ERROR, 'Could not save the file!');
    }
};

export const removeLocalFile = async (path: string) => {
    try {
        const fullPath = join(process.cwd(), path);
        try {
            await access(fullPath);
            await unlink(fullPath);
        } catch {
            console.warn('File not found, skipping delete:', fullPath);
        }
    } catch (error) {
        console.error('Error removing file:', error);
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.DELETE_ERROR, 'Could not delete the file!');
    }
};
