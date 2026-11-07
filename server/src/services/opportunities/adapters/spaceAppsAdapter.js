/**
 * NASA International Space Apps Challenge Adapter
 * Connects to open government / open data space challenge listings.
 */

import { OPPORTUNITY_CATEGORIES, LOGO_PERMISSION_STATUS, sanitizeText } from '../schema.js';

export async function fetchSpaceAppsEvents(source) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = source.endpoint || 'https://www.spaceappschallenge.org/resources/events.json';
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HookZ-Worldwide-Opportunities-Collector/1.0 (+https://hookz.in)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Space Apps API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const events = Array.isArray(data) ? data : (data.events || []);

    const opportunities = [];

    for (const item of events) {
      if (!item.name && !item.title) continue;
      const title = item.name || item.title;
      const url = item.url || item.registration_url || 'https://www.spaceappschallenge.org';

      opportunities.push({
        id: `opp-spaceapps-${item.id || item.slug || Math.abs(hashCode(url))}`,
        source_id: source.id,
        external_event_id: String(item.id || item.slug || url),
        title: title,
        organizer_name: 'NASA Earth Science & Space Apps Challenge',
        organizer_logo_url: null,
        logo_source_url: null,
        logo_permission_status: LOGO_PERMISSION_STATUS.TEXT_FALLBACK,
        description_summary: sanitizeText(item.description || 'Global hackathon using open NASA earth and space science data to solve real challenges on Earth and in space.', 1000),
        category: OPPORTUNITY_CATEGORIES.HACKATHON,
        subcategory: 'Open Science Hackathon',
        country: item.country || 'Worldwide',
        city: item.city || null,
        location: item.location || (item.city ? `${item.city}, ${item.country}` : 'Global Hybrid'),
        participation_mode: item.mode || 'HYBRID',
        start_date: item.start_date || '2026-10-03T00:00:00.000Z',
        end_date: item.end_date || '2026-10-04T23:59:59.000Z',
        registration_deadline: item.registration_deadline || item.start_date || '2026-10-02T23:59:59.000Z',
        registration_url: url,
        original_source_url: url,
        price_type: 'FREE',
        price_amount: 0,
        currency: 'FREE',
        certificate_available: true,
        eligibility: 'Open to coders, scientists, designers, storytellers, makers, builders, technologists, and students worldwide',
        skills_required: ['Space Tech', 'Open Science Data', 'Python', 'GIS', 'AI/ML'],
        status: item.is_cancelled ? 'CANCELLED' : 'APPROVED',
      });
    }

    return opportunities;
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`Space Apps Adapter error: ${err.message}`);
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

