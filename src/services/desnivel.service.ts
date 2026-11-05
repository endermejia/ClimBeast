import { Injectable } from '@angular/core';

import { NewsItem } from '../models';

import { toProxiedDesnivelUrl } from '../utils';

interface WpMediaSize {
  source_url?: string;
}

interface WpFeaturedMedia {
  source_url: string;
  media_details?: {
    sizes?: Record<string, WpMediaSize>;
  };
}

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: WpFeaturedMedia[];
  };
}

function extractPostImage(post: WpPost): string | undefined {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return undefined;
  const sizes = media.media_details?.sizes;
  const rawUrl =
    sizes?.['post-thumbnail']?.source_url ||
    sizes?.['large']?.source_url ||
    sizes?.['medium_large']?.source_url ||
    sizes?.['full']?.source_url ||
    media.source_url;
  return toProxiedDesnivelUrl(rawUrl);
}

interface WpCategory {
  id: number;
  slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class DesnivelService {
  private readonly baseUrl = '/api/desnivel/wp-json/wp/v2';
  private categoryIdPromise: Promise<number | null> | null = null;

  async getLatestPosts(limit: number, page = 1): Promise<NewsItem[]> {
    try {
      const categoryId = await this.getCategoryId();
      if (categoryId === null) return [];

      const params = new URLSearchParams({
        categories: String(categoryId),
        per_page: String(limit),
        page: String(page),
        _embed: 'true',
      });
      const response = await fetch(`${this.baseUrl}/posts?${params}`);
      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          // Beyond last page in WP REST API
          return [];
        }
        console.error('Failed to fetch Desnivel posts', response.statusText);
        return [];
      }
      const posts: WpPost[] = await response.json();
      return posts.map((post) => ({
        kind: 'news',
        id: post.id,
        title: post.title.rendered,
        link: post.link,
        date: post.date,
        excerpt: post.excerpt.rendered,
        image: extractPostImage(post),
      }));
    } catch (error) {
      console.error('Error fetching Desnivel posts', error);
      return [];
    }
  }

  private getCategoryId(): Promise<number | null> {
    if (!this.categoryIdPromise) {
      this.categoryIdPromise = fetch(
        `${this.baseUrl}/categories?slug=escalada-roca`,
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch Desnivel category: ${response.status}`,
            );
          }
          const categories = (await response.json()) as WpCategory[];
          return (
            categories.find((category) => category.slug === 'escalada-roca')
              ?.id ?? null
          );
        })
        .catch((error: unknown) => {
          this.categoryIdPromise = null;
          throw error;
        });
    }

    return this.categoryIdPromise;
  }
}
