import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SlugService {
  private readonly supabase = inject(SupabaseService);

  async checkSlugExists(
    table: 'routes' | 'crags' | 'areas' | 'indoor_centers',
    slug: string,
  ): Promise<boolean> {
    await this.supabase.whenReady();
    const { count, error } = await this.supabase.client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('slug', slug);
    if (error) return false;
    return (count ?? 0) > 0;
  }

  async getUniqueSlug(
    table: 'routes' | 'crags' | 'areas' | 'indoor_centers',
    baseSlug: string,
    fallbackSuffix?: string,
  ): Promise<string> {
    let slug = baseSlug;
    const exists = await this.checkSlugExists(table, slug);
    if (!exists) return slug;

    if (fallbackSuffix) {
      slug = `${baseSlug}-${fallbackSuffix}`;
      const existsFallback = await this.checkSlugExists(table, slug);
      if (!existsFallback) return slug;
    }

    let counter = 1;
    const originalBase = slug;
    while (await this.checkSlugExists(table, slug)) {
      slug = `${originalBase}-${counter}`;
      counter++;
    }
    return slug;
  }
}
