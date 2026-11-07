/**
 * ETHGlobal Hackathons Adapter
 * Connects to public hackathon calendar.
 */

import { OPPORTUNITY_CATEGORIES, LOGO_PERMISSION_STATUS, sanitizeText } from '../schema.js';

export async function fetchETHGlobalEvents(source) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = source.endpoint || 'https://ethglobal.com/events.json';
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HookZ-Worldwide-Opportunities-Collector/1.0 (+https://hookz.in)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`ETHGlobal API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const events = Array.isArray(data) ? data : (data.events || []);

    const opportunities = [];

    for (const item of events) {
      if (!item.name && !item.title) continue;
      const title = item.name || item.title;
      const url = item.url ? (item.url.startsWith('http') ? item.url : `https://ethglobal.com${item.url}`) : 'https://ethglobal.com/events';

      const isVirtual = Boolean(item.virtual || item.is_virtual || item.type === 'virtual');

      opportunities.push({
        id: `opp-ethglobal-${item.id || item.slug || Math.abs(hashCode(url))}`,
        source_id: source.id,
        external_event_id: String(item.id || item.slug || url),
        title: title,
        organizer_name: 'ETHGlobal',
        organizer_logo_url: null,
        logo_source_url: null,
        logo_permission_status: LOGO_PERMISSION_STATUS.TEXT_FALLBACK,
        description_summary: sanitizeText(item.description || 'Global Ethereum ecosystem hackathon featuring web3 developer bounties, workshops, and mentorship from industry leaders.', 1000),
        category: OPPORTUNITY_CATEGORIES.HACKATHON,
        subcategory: 'Web3 & Distributed Systems',
        country: item.country || (isVirtual ? 'Worldwide' : 'United States'),
        city: item.city || null,
        location: isVirtual ? 'Online / Virtual' : `${item.city ? item.city + ', ' : ''}${item.country || 'Global'}`,
        participation_mode: isVirtual ? 'ONLINE' : (item.hybrid ? 'HYBRID' : 'OFFLINE'),
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        registration_deadline: item.application_deadline || item.start_date || null,
        registration_url: url,
        original_source_url: url,
        price_type: 'FREE',
        price_amount: 0,
        currency: 'FREE',
        certificate_available: true,
        eligibility: 'Open to builders, engineers, and designers building decentralized applications',
        skills_required: ['Solidity', 'Smart Contracts', 'Web3', 'TypeScript', 'Cryptography'],
        status: item.cancelled ? 'CANCELLED' : 'APPROVED',
      });
    }

    return opportunities;
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`ETHGlobal Adapter error: ${err.message}`);
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

