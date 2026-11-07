/**
 * Microsoft Reactor & Learn Developer Workshops Adapter
 * Collects developer events, AI series, and cloud bootcamps.
 */

import { OPPORTUNITY_CATEGORIES, LOGO_PERMISSION_STATUS, sanitizeText } from '../schema.js';

export async function fetchMSReactorEvents(source) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = source.endpoint || 'https://developer.microsoft.com/api/reactor/events';
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HookZ-Worldwide-Opportunities-Collector/1.0 (+https://hookz.in)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Microsoft Reactor API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const events = Array.isArray(data) ? data : (data.events || []);

    const opportunities = [];

    for (const item of events) {
      if (!item.title && !item.name) continue;
      const title = item.title || item.name;
      const url = item.url || item.registrationUrl || 'https://developer.microsoft.com/reactor';

      const isOnline = Boolean(item.isOnline ?? true);

      opportunities.push({
        id: `opp-msreactor-${item.id || Math.abs(hashCode(url))}`,
        source_id: source.id,
        external_event_id: String(item.id || url),
        title: title,
        organizer_name: 'Microsoft Reactor',
        organizer_logo_url: null,
        logo_source_url: null,
        logo_permission_status: LOGO_PERMISSION_STATUS.TEXT_FALLBACK,
        description_summary: sanitizeText(item.description || 'Hands-on developer workshop hosted by Microsoft Cloud Advocates and community champions.', 1000),
        category: OPPORTUNITY_CATEGORIES.MICROSOFT_EVENT,
        subcategory: item.track || 'Developer Workshop',
        country: item.country || 'Worldwide',
        city: item.city || null,
        location: isOnline ? 'Online / Virtual' : `${item.city ? item.city + ', ' : ''}${item.country || 'Global'}`,
        participation_mode: isOnline ? 'ONLINE' : 'HYBRID',
        start_date: item.startDateTime || item.start_date || null,
        end_date: item.endDateTime || item.end_date || null,
        registration_deadline: item.endDateTime || item.startDateTime || null,
        registration_url: url,
        original_source_url: url,
        price_type: 'FREE',
        price_amount: 0,
        currency: 'FREE',
        certificate_available: true,
        eligibility: 'Free and open to all developers, founders, and students',
        skills_required: ['Azure', 'Generative AI', 'TypeScript', 'GitHub Copilot', 'C#/.NET'],
        status: item.isCancelled ? 'CANCELLED' : 'APPROVED',
      });
    }

    return opportunities;
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`Microsoft Reactor Adapter error: ${err.message}`);
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

