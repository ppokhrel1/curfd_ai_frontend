import CryptoJS from 'crypto-js';

/**
 * Encryption utility for sensitive data transmission
 * Uses AES-256 encryption with a shared secret key
 */

// Get encryption key from environment or generate a secure one
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'your-secure-encryption-key-change-this';

/**
 * Encrypt data before sending to backend
 */
export const encryptData = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt data received from backend
 */
export const decryptData = <T = any>(encryptedData: string): T => {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data');
    }
};

/**
 * Hash sensitive data (one-way, for passwords)
 */
export const hashData = (data: string): string => {
    return CryptoJS.SHA256(data).toString();
};

/**
 * Generate a random encryption key (for initial setup)
 */
export const generateEncryptionKey = (): string => {
    return CryptoJS.lib.WordArray.random(32).toString();
};

/**
 * Encrypt specific fields in an object
 */
export const encryptFields = <T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
): T => {
    const result = { ...data };

    fieldsToEncrypt.forEach((field) => {
        if (result[field] !== undefined) {
            result[field] = encryptData(result[field]) as any;
        }
    });

    return result;
};

/**
 * Encrypt password specifically (can add additional security layers)
 */
export const encryptPassword = (password: string): string => {
    // Add salt for extra security
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    const saltedPassword = password + salt;
    const encrypted = CryptoJS.AES.encrypt(saltedPassword, ENCRYPTION_KEY).toString();

    // Return encrypted password with salt
    return JSON.stringify({
        encrypted,
        salt
    });
};

/**
 * For RSA-style public key encryption (if backend provides public key)
 */
export const encryptWithPublicKey = (data: string, publicKey: string): string => {
    // This would require a library like jsencrypt for RSA
    // For now, using AES which is symmetric
    return encryptData(data);
};
