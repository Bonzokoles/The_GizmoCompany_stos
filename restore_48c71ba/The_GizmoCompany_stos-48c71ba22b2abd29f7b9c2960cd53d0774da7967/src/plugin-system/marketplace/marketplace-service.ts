/**
 * Marketplace Service - Manages plugin discovery, ratings, and updates
 */

import axios from 'axios';

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  repository?: string;
  downloads: number;
  rating: number;
  reviews: number;
  tags: string[];
  latest: string;
  releaseDate: Date;
}

export interface PluginReview {
  pluginId: string;
  rating: number;
  comment: string;
  author: string;
  date: Date;
}

export class MarketplaceService {
  private marketplaceUrl = process.env.REACT_APP_MARKETPLACE_URL || 'https://marketplace.zeno-browser.io';
  private client = axios.create({
    baseURL: this.marketplaceUrl,
    timeout: 10000,
  });

  /**
   * Search for plugins
   */
  async search(query: string, filters?: Record<string, any>): Promise<MarketplacePlugin[]> {
    try {
      const response = await this.client.get('/plugins/search', {
        params: { q: query, ...filters },
      });
      return response.data.plugins;
    } catch (error) {
      console.error('Failed to search marketplace:', error);
      throw error;
    }
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<MarketplacePlugin> {
    try {
      const response = await this.client.get(`/plugins/${pluginId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get plugin details:', error);
      throw error;
    }
  }

  /**
   * Get featured plugins
   */
  async getFeatured(): Promise<MarketplacePlugin[]> {
    try {
      const response = await this.client.get('/plugins/featured');
      return response.data.plugins;
    } catch (error) {
      console.error('Failed to get featured plugins:', error);
      throw error;
    }
  }

  /**
   * Get trending plugins
   */
  async getTrending(): Promise<MarketplacePlugin[]> {
    try {
      const response = await this.client.get('/plugins/trending');
      return response.data.plugins;
    } catch (error) {
      console.error('Failed to get trending plugins:', error);
      throw error;
    }
  }

  /**
   * Post review
   */
  async postReview(pluginId: string, rating: number, comment: string): Promise<void> {
    try {
      await this.client.post(`/plugins/${pluginId}/reviews`, {
        rating,
        comment,
      });
    } catch (error) {
      console.error('Failed to post review:', error);
      throw error;
    }
  }

  /**
   * Get plugin reviews
   */
  async getReviews(pluginId: string): Promise<PluginReview[]> {
    try {
      const response = await this.client.get(`/plugins/${pluginId}/reviews`);
      return response.data.reviews;
    } catch (error) {
      console.error('Failed to get reviews:', error);
      throw error;
    }
  }

  /**
   * Check for updates
   */
  async checkUpdates(pluginId: string, currentVersion: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/plugins/${pluginId}/updates`, {
        params: { version: currentVersion },
      });
      return response.data.latestVersion;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  }

  /**
   * Download plugin
   */
  async downloadPlugin(pluginId: string, version?: string): Promise<Blob> {
    try {
      const response = await this.client.get(`/plugins/${pluginId}/download`, {
        params: { version },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to download plugin:', error);
      throw error;
    }
  }
}

export const marketplaceService = new MarketplaceService();