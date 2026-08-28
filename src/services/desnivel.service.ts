import { Injectable } from '@angular/core';

import { NewsItem } from '../models';

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string }[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class DesnivelService {
  private readonly baseUrl = 'https://www.desnivel.com/wp-json/wp/v2/posts';

  async getLatestPosts(limit: number, page = 1): Promise<NewsItem[]> {
    const url = `${this.baseUrl}?categories=4&per_page=${limit}&page=${page}&_embed`;
    try {
      const response = await fetch(url);
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
        image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      }));
    } catch (error) {
      console.error('Error fetching Desnivel posts', error);
      return [];
    }
  }
}
