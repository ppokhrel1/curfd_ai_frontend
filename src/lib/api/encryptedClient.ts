import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { decryptData, encryptData } from "../encryption";
import { api } from "./client";

/**
 * Encrypted API client wrapper
 * Automatically encrypts request payloads and decrypts responses
 */
class EncryptedApiClient {
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  /**
   * POST request with automatic encryption
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const encryptedPayload = data
      ? {
          encrypted: true,
          data: encryptData(data),
        }
      : undefined;

    const response = await this.client.post<T>(url, encryptedPayload, config);

    if (
      response.data &&
      typeof response.data === "object" &&
      "encrypted" in response.data
    ) {
      response.data = decryptData((response.data as any).data);
    }

    return response;
  }

  /**
   * PUT request with automatic encryption
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const encryptedPayload = data
      ? {
          encrypted: true,
          data: encryptData(data),
        }
      : undefined;

    const response = await this.client.put<T>(url, encryptedPayload, config);

    if (
      response.data &&
      typeof response.data === "object" &&
      "encrypted" in response.data
    ) {
      response.data = decryptData((response.data as any).data);
    }

    return response;
  }

  /**
   * PATCH request with automatic encryption
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const encryptedPayload = data
      ? {
          encrypted: true,
          data: encryptData(data),
        }
      : undefined;

    const response = await this.client.patch<T>(url, encryptedPayload, config);

    if (
      response.data &&
      typeof response.data === "object" &&
      "encrypted" in response.data
    ) {
      response.data = decryptData((response.data as any).data);
    }

    return response;
  }

  /**
   * GET request (no encryption needed for GET)
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.client.get<T>(url, config);

    if (
      response.data &&
      typeof response.data === "object" &&
      "encrypted" in response.data
    ) {
      response.data = decryptData((response.data as any).data);
    }

    return response;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}

export const encryptedApi = new EncryptedApiClient(api);
