/**
 * @file: listingEndpoints.ts
 * @description: İlan işlemleri için API endpoint fonksiyonları.
 * İlan oluşturma, güncelleme, silme ve detay alma işlemlerini yönetir.
 */

import apiClient from '../client';
import { API_CONFIG } from '../config';

export const listingEndpoints = {
    // Yeni ilan oluştur
    createListing: async (listingData: Record<string, unknown>) => {
        try {
            const response = await apiClient.post(
                (API_CONFIG as { endpoints?: { listings?: { create?: string } } }).endpoints?.listings?.create ?? '/listings',
                listingData
            );
            return response;
        } catch (error) {
            throw error;
        }
    },

    // İlan güncelle
    updateListing: async (listingId: string | number, listingData: Record<string, unknown>) => {
        try {
            const endpoint = (
                (API_CONFIG as { endpoints?: { listings?: { update?: string } } }).endpoints?.listings?.update ?? '/listings/:id'
            ).replace(':id', String(listingId));
            const response = await apiClient.put(endpoint, listingData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // İlan detaylarını getir
    getListing: async (listingId: string | number) => {
        try {
            const endpoint = (
                (API_CONFIG as { endpoints?: { listings?: { details?: string } } }).endpoints?.listings?.details ?? '/listings/:id'
            ).replace(':id', String(listingId));
            const response = await apiClient.get(endpoint);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // İlan sil
    deleteListing: async (listingId: string | number) => {
        try {
            const endpoint = (
                (API_CONFIG as { endpoints?: { listings?: { delete?: string } } }).endpoints?.listings?.delete ?? '/listings/:id'
            ).replace(':id', String(listingId));
            const response = await apiClient.delete(endpoint);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // İlan resimleri yükle
    uploadImages: async (formData: FormData) => {
        try {
            const response = await apiClient.post(
                (API_CONFIG as { endpoints?: { images?: { upload?: string } } }).endpoints?.images?.upload ?? '/listings/images',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response;
        } catch (error) {
            throw error;
        }
    },

    // İlan resmi sil
    deleteImage: async (imageId: string | number) => {
        try {
            const endpoint = (
                (API_CONFIG as { endpoints?: { images?: { delete?: string } } }).endpoints?.images?.delete ?? '/listings/images/:id'
            ).replace(':id', String(imageId));
            const response = await apiClient.delete(endpoint);
            return response;
        } catch (error) {
            throw error;
        }
    }
};
