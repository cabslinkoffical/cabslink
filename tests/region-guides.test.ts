import { describe, expect, it } from 'vitest';
import fixtures from './region-destinations.fixture.json';
import { buildRegionContent, indexableRegionPaths, REGION_INDEX_MIN_WORDS } from '@/lib/seo/region-content';
import { regionGuide } from '@/content/region-guides';
import { estimateDrive, MAIN_AIRPORTS } from '@/lib/drive-estimate';

describe('approved region indexing from active destination snapshot', () => {
  it('retains the 300-word indexing threshold', () => expect(REGION_INDEX_MIN_WORDS).toBe(300));
  it.each(fixtures)('$region passes the shared page and sitemap indexing rule', ({region, places}) => {
    const c = buildRegionContent(region, places);
    expect(c.indexable).toBe(true);
    expect(c.uniqueWords).toBeGreaterThanOrEqual(300);
    const rows = places.map(p => ({...p, region, seo_tier: 1}));
    expect(indexableRegionPaths(rows, p => places.find(row => row.slug === p.slug)?.href ?? '')).toEqual([`/areas/region/${region.toLowerCase()}`]);
  });
  it.each(fixtures)('$region records the actual editorial revision date for lastmod', ({region, places}) => {
    expect(regionGuide(region, places)?.updatedAt).toBe('2026-11-20T12:07:00Z');
  });
  it('does not treat missing approved destinations as reviewed coverage', () => {
    expect(regionGuide('Fife', [])).toBeNull();
    expect(buildRegionContent('Wales', []).indexable).toBe(false);
  });
  it('uses the saved Cardiff coordinates with the existing 65 km/h estimate', () => {
    expect(estimateDrive(51.396667, -3.343333, MAIN_AIRPORTS[0])).toEqual({miles: 409, mins: 610});
  });
});
