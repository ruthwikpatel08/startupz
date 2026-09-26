import { GoogleGenAI } from '@google/genai';
import {
  SolutionSuggestionSchema,
  UserMatchSchema,
  ProblemCategorizationSchema,
} from '../schemas/problemSchemas.js';

const SYSTEM_PROMPT =
  'You are StartupZ AI, an assistant helping startup founders analyze global problem statements. When given a problem description, you provide practical, unbiased, structured insights in JSON format. Never suggest something illegal or unethical. Base responses only on the information given. Do not mention you are an AI or the system. Focus on the problem context and possible startup solutions or relevant analysis. Output valid JSON matching the requested schema.';

let genAIClient = null;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!genAIClient) {
    try {
      genAIClient = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.warn('⚠️ GoogleGenAI initialization warning:', e.message);
      return null;
    }
  }
  return genAIClient;
}

/**
 * Clean and parse JSON from LLM markdown fences
 */
function cleanJsonOutput(text) {
  if (!text) return null;
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    // Attempt greedy search for first '{' to last '}'
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    throw err;
  }
}

/**
 * 15.2 Solution Suggestions using Gemini
 */
export async function generateProblemSolutions(problem) {
  const ai = getGenAI();
  const prompt = `A startup founder is reading this problem statement. Provide 2-3 innovative, venture-scalable startup ideas or technological solutions that could help solve it. Return JSON { "ideas": [ { "title": string, "description": string } ], "needed_skills": ["skill1", ...] }.\n\nProblem Title: ${problem.title}\nProblem Context & Details: ${problem.description}`;

  if (ai) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
      });

      const parsed = cleanJsonOutput(response.text);
      const validated = SolutionSuggestionSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      console.warn('AI solutions schema validation warning, falling back to heuristic generation:', validated.error.issues);
    } catch (err) {
      console.error('Gemini API call failed for problem solutions:', err.message);
    }
  }

  // Domain-specific intelligent fallback based on problem themes
  return generateDeterministicSolutions(problem);
}

/**
 * 15.3 User-Problem Matching using Gemini
 */
export async function matchUserToProblem(problem, user) {
  const ai = getGenAI();
  const profile = user.profile || {};
  const userSummary = `
User Role: ${user.role || 'FOUNDER'}
Full Name: ${profile.fullName || 'Builder'}
Headline: ${profile.headline || 'Startup Enthusiast'}
Skills: ${profile.skills || 'Product Management, Software Development, Strategy'}
Interests: ${profile.startupInterests || profile.industries || 'Impact Tech, Sustainability, SaaS'}
Background: ${profile.bio || profile.startupExperience || 'Experienced builder'}
`;

  const prompt = `Given a user profile with skills and interests, and a problem description, evaluate how well the user could contribute to solving this problem. Output JSON { "matchScore": 0-100, "reason": string }.\n\nUser Profile:\n${userSummary}\n\nProblem Title: ${problem.title}\nProblem Description: ${problem.description}`;

  if (ai) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
      });

      const parsed = cleanJsonOutput(response.text);
      const validated = UserMatchSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      console.warn('AI match schema validation warning, falling back to heuristic match:', validated.error.issues);
    } catch (err) {
      console.error('Gemini API call failed for problem user match:', err.message);
    }
  }

  return generateDeterministicUserMatch(problem, user);
}

/**
 * 15.1 Problem Categorization using Gemini
 */
export async function categorizeProblemAI(title, description) {
  const ai = getGenAI();
  const prompt = `Classify the following problem statement into up to 3 standard global categories (e.g. Environment/Climate, Health & Disease, Food & Water, Energy & Infrastructure, Education & Skills, Economy & Inequality, Governance & Peace, Technology & Innovation, Women & Social) and up to 5 tags (keywords). Provide JSON with fields { "categories": [...], "tags": [...] }.\n\nProblem Title: ${title}\nProblem: ${description}`;

  if (ai) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
      });

      const parsed = cleanJsonOutput(response.text);
      const validated = ProblemCategorizationSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
    } catch (err) {
      console.error('Gemini API call failed for categorization:', err.message);
    }
  }

  return generateDeterministicCategorization(title, description);
}

/**
 * Intelligent deterministic fallback generators
 */
function generateDeterministicSolutions(problem) {
  const text = `${problem.title} ${problem.description}`.toLowerCase();

  let ideas = [];
  let needed_skills = [];

  if (text.includes('water') || text.includes('sanitation')) {
    ideas = [
      {
        title: 'Solar-Powered Atmospheric Water Generation & Smart Filtration',
        description: 'A modular, low-cost decentralized water purification and atmospheric extraction unit designed for off-grid rural communities with remote IoT monitoring.',
      },
      {
        title: 'Community Water Quality Sensing Grid',
        description: 'Low-cost optical and electrochemical sensor nodes deployed at public taps and wells, relaying contamination alerts via cellular telemetry to local clinics and authorities.',
      },
      {
        title: 'Circular Waste-to-Resource Sanitation Pods',
        description: 'Self-contained off-grid biological waste treatment facilities converting organic waste into certified agricultural biochar and clean irrigation water.',
      },
    ];
    needed_skills = ['IoT Firmware Development', 'Environmental Engineering', 'Microbiology', 'Operations Logistics', 'Hardware Prototyping'];
  } else if (text.includes('climate') || text.includes('warming') || text.includes('emission') || text.includes('carbon')) {
    ideas = [
      {
        title: 'Automated Industrial Emissions MRV Protocol',
        description: 'An AI-powered Measurement, Reporting, and Verification (MRV) platform utilizing satellite remote sensing and facility IoT telemetry to verify real-time carbon abatement.',
      },
      {
        title: 'Distributed Microgrid Energy Management & Storage',
        description: 'AI grid-edge orchestrator balancing residential battery systems and solar arrays into high-resilience virtual power plants.',
      },
      {
        title: 'Bio-Engineered Carbon Sequestration Materials',
        description: 'Carbon-negative aggregate and bio-composite building materials that trap atmospheric carbon permanently in structural concrete.',
      },
    ];
    needed_skills = ['Climate Science', 'Full-Stack Software Engineering', 'Geospatial Data Modeling', 'Energy Systems Design', 'Venture Finance'];
  } else if (text.includes('hunger') || text.includes('food') || text.includes('agriculture')) {
    ideas = [
      {
        title: 'Precision Micro-Cold Chain Network',
        description: 'Solar-powered cold storage hubs placed at rural collection centers, accessible via pay-as-you-chill mobile micro-payments to reduce post-harvest decay.',
      },
      {
        title: 'Hyper-Local Agronomic Copilot for Smallholders',
        description: 'Voice-first multi-lingual mobile app using computer vision to diagnose crop pests and optimize localized micro-fertilizer application.',
      },
      {
        title: 'Decentralized Crop Yield Insurance Rail',
        description: 'Parametric micro-insurance platform that automatically disburses payouts based on algorithmic satellite drought and rainfall thresholds.',
      },
    ];
    needed_skills = ['AgTech Product Design', 'Computer Vision', 'Micro-Logistics', 'Mobile Engineering', 'Agricultural Economics'];
  } else if (text.includes('disease') || text.includes('infectious') || text.includes('health') || text.includes('mental')) {
    ideas = [
      {
        title: 'Edge AI Syndromic Disease Early-Warning Network',
        description: 'Point-of-care rapid testing diagnostic devices synced with a cloud epidemiological dashboard to detect localized viral outbreaks before regional spread.',
      },
      {
        title: 'Decentralized Cold-Chain Vaccine & Specimen Logistics',
        description: 'Automated solar-refrigerated drone lockers with blockchain custody verification ensuring last-mile delivery of temperature-sensitive pharmaceuticals.',
      },
      {
        title: 'Culturally Adapted Cognitive Behavioral Digital Companion',
        description: 'Evidence-based conversational therapeutic companion delivering personalized mental health interventions in regional dialects with licensed clinical escalation paths.',
      },
    ];
    needed_skills = ['Biomedical Engineering', 'Clinical Informatics', 'AI & Machine Learning', 'Regulatory Compliance', 'Mobile UX Design'];
  } else if (text.includes('education') || text.includes('literacy') || text.includes('school')) {
    ideas = [
      {
        title: 'Offline-First Adaptive Learning Tablet Ecosystem',
        description: 'Ultra-low-power tablets with localized offline AI interactive tutors that periodically synchronize student learning progress via mesh networks.',
      },
      {
        title: 'Micro-Credentialed Vocational Skill Marketplaces',
        description: 'Peer-to-peer apprenticeship matching engine connecting under-resourced youth with project-based remote digital task training and direct gig payouts.',
      },
      {
        title: 'Voice-Driven Multilingual Early Literacy Assistant',
        description: 'Interactive audio storytelling application that teaches phonics and numeracy through gamified conversational dialogues in native languages.',
      },
    ];
    needed_skills = ['EdTech Pedagogy', 'Offline-First React/Native Development', 'Speech Recognition & NLP', 'Instructional Design'];
  } else {
    ideas = [
      {
        title: 'Autonomous Systems & Edge AI Infrastructure',
        description: 'Hardware-agnostic software platform enabling low-bandwidth communities to deploy and manage automated operational intelligence solutions.',
      },
      {
        title: 'Transparent Micro-Economic Incentive Protocol',
        description: 'Decentralized coordination protocol that financially rewards local community members for collecting verified real-world operational data.',
      },
      {
        title: 'AI Diagnostic Copilot & Workflow Automation',
        description: 'Specialized foundational model tuned on domain-specific public guidelines, reducing human operational latency by 70%.',
      },
    ];
    needed_skills = ['Full-Stack Development', 'System Architecture', 'Product Design', 'Domain Expertise', 'Growth Marketing'];
  }

  return { ideas, needed_skills };
}

function generateDeterministicUserMatch(problem, user) {
  const profile = user.profile || {};
  const userText = `${user.role || ''} ${profile.headline || ''} ${profile.skills || ''} ${profile.industries || ''} ${profile.startupInterests || ''}`.toLowerCase();
  const probText = `${problem.title} ${problem.description}`.toLowerCase();

  let score = 65;
  const matchHighlights = [];

  const techKeywords = ['react', 'node', 'python', 'ai', 'machine learning', 'data', 'cloud', 'iot', 'hardware', 'full stack', 'mobile'];
  techKeywords.forEach((kw) => {
    if (userText.includes(kw) && (probText.includes(kw) || probText.includes('technology') || probText.includes('smart') || probText.includes('digital'))) {
      score += 6;
      matchHighlights.push(`Technical strength in ${kw.toUpperCase()}`);
    }
  });

  const domainKeywords = ['climate', 'energy', 'water', 'health', 'education', 'agriculture', 'fintech', 'social'];
  domainKeywords.forEach((kw) => {
    if (userText.includes(kw) && probText.includes(kw)) {
      score += 10;
      matchHighlights.push(`Direct experience in ${kw.charAt(0).toUpperCase() + kw.slice(1)} domain`);
    }
  });

  if (user.role === 'FOUNDER' || user.role === 'COFOUNDER') {
    score += 8;
    matchHighlights.push('Founder mindset and venture builder experience');
  }

  const finalScore = Math.min(96, Math.max(68, score));
  const reasonsText = matchHighlights.length > 0
    ? matchHighlights.slice(0, 3).join('. ') + '.'
    : 'Your background in building digital products and entrepreneurial interests align with early-stage venture execution for this global challenge.';

  return {
    matchScore: finalScore,
    reason: `Match Score ${finalScore}%: ${reasonsText}`,
  };
}

function generateDeterministicCategorization(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const categories = [];
  const tags = [];

  if (text.includes('climate') || text.includes('carbon') || text.includes('warming') || text.includes('emission')) {
    categories.push('Environment/Climate');
    tags.push('Climate Change', 'Carbon', 'SDG 13');
  }
  if (text.includes('water') || text.includes('sanitation') || text.includes('filtration')) {
    categories.push('Food & Water', 'Health & Disease');
    tags.push('Clean Water', 'Sanitation', 'SDG 6');
  }
  if (text.includes('health') || text.includes('disease') || text.includes('medical') || text.includes('mental')) {
    if (!categories.includes('Health & Disease')) categories.push('Health & Disease');
    tags.push('Public Health', 'Diagnostics', 'SDG 3');
  }
  if (text.includes('energy') || text.includes('solar') || text.includes('grid')) {
    categories.push('Energy & Infrastructure');
    tags.push('Renewable Energy', 'Clean Energy', 'SDG 7');
  }
  if (text.includes('education') || text.includes('school') || text.includes('literacy')) {
    categories.push('Education & Skills');
    tags.push('Education', 'Digital Divide', 'SDG 4');
  }

  if (categories.length === 0) {
    categories.push('Technology & Innovation', 'Economy & Inequality');
    tags.push('AI for Good', 'Innovation', 'SDG 9');
  }

  return {
    categories: categories.slice(0, 3),
    tags: tags.slice(0, 5),
  };
}
