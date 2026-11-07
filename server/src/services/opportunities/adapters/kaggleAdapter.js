/**
 * Kaggle Machine Learning Competitions Adapter
 * Collects public machine learning competitions from public community feeds.
 */

import { OPPORTUNITY_CATEGORIES, LOGO_PERMISSION_STATUS, sanitizeText } from '../schema.js';

export async function fetchKaggleCompetitions(source) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = source.endpoint || 'https://www.kaggle.com/api/v1/competitions/list';
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HookZ-Worldwide-Opportunities-Collector/1.0 (+https://hookz.in)',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Kaggle API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const competitions = Array.isArray(data) ? data : (data.competitions || []);

    const opportunities = [];

    for (const item of competitions) {
      if (!item.title && !item.name) continue;
      const title = item.title || item.name;
      const url = item.url ? (item.url.startsWith('http') ? item.url : `https://www.kaggle.com/c/${item.ref || item.url}`) : 'https://www.kaggle.com/competitions';

      opportunities.push({
        id: `opp-kaggle-${item.id || item.ref || Math.abs(hashCode(url))}`,
        source_id: source.id,
        external_event_id: String(item.id || item.ref || url),
        title: title,
        organizer_name: 'Kaggle (Google LLC)',
        organizer_logo_url: null,
        logo_source_url: null,
        logo_permission_status: LOGO_PERMISSION_STATUS.TEXT_FALLBACK,
        description_summary: sanitizeText(item.description || item.overview || 'Worldwide data science and machine learning challenge with global leaderboards, cash rewards, and certificates.', 1000),
        category: OPPORTUNITY_CATEGORIES.AI_ML_EVENT,
        subcategory: 'Machine Learning Competition',
        country: 'Worldwide',
        city: null,
        location: 'Online / Virtual',
        participation_mode: 'ONLINE',
        start_date: item.enabledDate || item.start_date || null,
        end_date: item.deadline || item.end_date || null,
        registration_deadline: item.deadline || null,
        registration_url: url,
        original_source_url: url,
        price_type: 'FREE',
        price_amount: 0,
        currency: 'FREE',
        certificate_available: true,
        eligibility: 'Open to all data scientists, ML engineers, researchers, and students globally',
        skills_required: ['Machine Learning', 'Python', 'PyTorch', 'Data Analysis', 'Deep Learning'],
        status: item.is_cancelled ? 'CANCELLED' : 'APPROVED',
      });
    }

    return opportunities;
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`Kaggle Adapter error: ${err.message}`);
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

