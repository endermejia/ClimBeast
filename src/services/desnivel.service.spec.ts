import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DesnivelService } from './desnivel.service';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => body,
  } as Response;
}

describe('DesnivelService', () => {
  let service: DesnivelService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new DesnivelService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads posts from the escalada-roca category resolved by slug', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: 27, slug: 'escalada-roca' }]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 123,
            date: '2026-10-30T10:00:00',
            link: 'https://www.desnivel.com/article/',
            title: { rendered: 'Noticia de escalada' },
            excerpt: { rendered: '<p>Resumen</p>' },
            _embedded: {
              'wp:featuredmedia': [
                { source_url: 'https://example.com/image.jpg' },
              ],
            },
          },
        ]),
      );

    const posts = await service.getLatestPosts(12);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/desnivel/wp-json/wp/v2/categories?slug=escalada-roca',
    );
    const postsUrl = new URL(fetchMock.mock.calls[1][0], 'https://local.test');
    expect(postsUrl.pathname).toBe('/api/desnivel/wp-json/wp/v2/posts');
    expect(postsUrl.searchParams.get('categories')).toBe('27');
    expect(postsUrl.searchParams.get('per_page')).toBe('12');
    expect(postsUrl.searchParams.get('_embed')).toBe('true');
    expect(posts).toEqual([
      {
        kind: 'news',
        id: 123,
        title: 'Noticia de escalada',
        link: 'https://www.desnivel.com/article/',
        date: '2026-10-30T10:00:00',
        excerpt: '<p>Resumen</p>',
        image: 'https://example.com/image.jpg',
      },
    ]);
  });

  it('reuses the category lookup for subsequent pages', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: 27, slug: 'escalada-roca' }]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    await service.getLatestPosts(12, 1);
    await service.getLatestPosts(12, 2);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const secondPageUrl = new URL(
      fetchMock.mock.calls[2][0],
      'https://local.test',
    );
    expect(secondPageUrl.searchParams.get('page')).toBe('2');
  });

  it('rewrites desnivel image URLs and prefers post-thumbnail when available', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: 27, slug: 'escalada-roca' }]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 456,
            date: '2026-11-05T10:00:00',
            link: 'https://www.desnivel.com/article-2/',
            title: { rendered: 'Noticia con foto' },
            excerpt: { rendered: '<p>Foto</p>' },
            _embedded: {
              'wp:featuredmedia': [
                {
                  source_url: 'https://www.desnivel.com/images/full.jpg',
                  media_details: {
                    sizes: {
                      'post-thumbnail': {
                        source_url:
                          'https://www.desnivel.com/images/thumb-750x440.jpg',
                      },
                    },
                  },
                },
              ],
            },
          },
        ]),
      );

    const posts = await service.getLatestPosts(1);
    expect(posts[0]?.image).toBe('/api/desnivel/images/thumb-750x440.jpg');
  });

  it('returns no posts if the category slug cannot be resolved', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await expect(service.getLatestPosts(12)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
