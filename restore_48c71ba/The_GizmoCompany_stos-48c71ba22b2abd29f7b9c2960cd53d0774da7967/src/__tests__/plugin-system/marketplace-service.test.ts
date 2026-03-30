/**
 * Marketplace Service Tests
 */

import { MarketplaceService } from '@/plugin-system/marketplace/marketplace-service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockGet = jest.fn();
const mockPost = jest.fn();

mockedAxios.create.mockReturnValue({
  get: mockGet,
  post: mockPost,
} as any);

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({ get: mockGet, post: mockPost } as any);
    service = new MarketplaceService();
  });

  describe('search', () => {
    test('should return matching plugins', async () => {
      const plugins = [
        { id: 'p1', name: 'Plugin 1', version: '1.0.0', author: 'A', description: 'Desc', rating: 4.5, downloads: 100, tags: ['test'] },
      ];
      mockGet.mockResolvedValue({ data: { plugins } });

      const results = await service.search('test');

      expect(mockGet).toHaveBeenCalledWith('/plugins/search', { params: { q: 'test' } });
      expect(results).toEqual(plugins);
    });

    test('should pass filters', async () => {
      mockGet.mockResolvedValue({ data: { plugins: [] } });

      await service.search('test', { tag: 'ui' });

      expect(mockGet).toHaveBeenCalledWith('/plugins/search', { params: { q: 'test', tag: 'ui' } });
    });

    test('should throw on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      await expect(service.search('test')).rejects.toThrow('Network error');
    });
  });

  describe('getPlugin', () => {
    test('should return plugin details', async () => {
      const plugin = { id: 'p1', name: 'Plugin 1' };
      mockGet.mockResolvedValue({ data: plugin });

      const result = await service.getPlugin('p1');

      expect(mockGet).toHaveBeenCalledWith('/plugins/p1');
      expect(result).toEqual(plugin);
    });
  });

  describe('getFeatured', () => {
    test('should return featured plugins', async () => {
      const plugins = [{ id: 'f1', name: 'Featured' }];
      mockGet.mockResolvedValue({ data: { plugins } });

      const results = await service.getFeatured();

      expect(mockGet).toHaveBeenCalledWith('/plugins/featured');
      expect(results).toEqual(plugins);
    });

    test('should throw on error', async () => {
      mockGet.mockRejectedValue(new Error('Server error'));
      await expect(service.getFeatured()).rejects.toThrow('Server error');
    });
  });

  describe('postReview', () => {
    test('should post review', async () => {
      mockPost.mockResolvedValue({});

      await service.postReview('p1', 5, 'Great plugin!');

      expect(mockPost).toHaveBeenCalledWith('/plugins/p1/reviews', {
        rating: 5,
        comment: 'Great plugin!',
      });
    });

    test('should throw on failure', async () => {
      mockPost.mockRejectedValue(new Error('Unauthorized'));
      await expect(service.postReview('p1', 5, 'Test')).rejects.toThrow('Unauthorized');
    });
  });

  describe('checkUpdates', () => {
    test('should return latest version', async () => {
      mockGet.mockResolvedValue({ data: { latestVersion: '2.0.0' } });

      const result = await service.checkUpdates('p1', '1.0.0');

      expect(result).toBe('2.0.0');
    });

    test('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      const result = await service.checkUpdates('p1', '1.0.0');

      expect(result).toBeNull();
    });
  });

  describe('getReviews', () => {
    test('should return reviews', async () => {
      const reviews = [{ pluginId: 'p1', rating: 5, comment: 'Great', author: 'User', date: new Date() }];
      mockGet.mockResolvedValue({ data: { reviews } });

      const result = await service.getReviews('p1');

      expect(mockGet).toHaveBeenCalledWith('/plugins/p1/reviews');
      expect(result).toEqual(reviews);
    });
  });
});