import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { decryptData, encryptData } from "../encryption";
import { api } from "./client";

interface EncryptedClientOptions {
  enableEncryption: boolean;
}

/**
 * Encrypted API client wrapper
 * Automatically encrypts request payloads and decrypts responses
 */
class EncryptedApiClient {
  private client: AxiosInstance;
  private enableEncryption: boolean;

  constructor(client: AxiosInstance, options: EncryptedClientOptions) {
    this.client = client;
    this.enableEncryption = options.enableEncryption;
  }

  /**
   * Helper to check for and decrypt response data
   */
  private handleDecryption(response: AxiosResponse): void {
    // Only attempt decryption if the flag is on AND the response claims to be encrypted
    if (
      this.enableEncryption &&
      response.data &&
      typeof response.data === "object" &&
      "encrypted" in response.data &&
      response.data.encrypted === true
    ) {
      try {
        response.data = decryptData((response.data as any).data);
      } catch (error) {
        console.error("Failed to decrypt response data", error);
      }
    }
  }

  /**
   * POST request with conditional encryption
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const payload =
      this.enableEncryption && data
        ? {
            encrypted: true,
            data: encryptData(data),
          }
        : data;

    const response = await this.client.post<T>(url, payload, config);
    this.handleDecryption(response);
    return response;
  }

  /**
   * PUT request with conditional encryption
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const payload =
      this.enableEncryption && data
        ? {
            encrypted: true,
            data: encryptData(data),
          }
        : data;

    const response = await this.client.put<T>(url, payload, config);
    this.handleDecryption(response);
    return response;
  }

  /**
   * PATCH request with conditional encryption
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const payload =
      this.enableEncryption && data
        ? {
            encrypted: true,
            data: encryptData(data),
          }
        : data;

    const response = await this.client.patch<T>(url, payload, config);
    this.handleDecryption(response);
    return response;
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.client.get<T>(url, config);
    this.handleDecryption(response);
    return response;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.client.delete<T>(url, config);
    this.handleDecryption(response);
    return response;
  }
}

// Instantiate with optional encryption logic
export const encryptedApi = new EncryptedApiClient(api, {
  // If VITE_ENABLE_ENCRYPTION is not set or is 'false', this defaults to false.
  enableEncryption: import.meta.env.VITE_ENABLE_ENCRYPTION === "true",
});