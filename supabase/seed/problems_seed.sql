-- ==============================================================================
-- StartupZ: World-wide Problem Statements Seed Data (PostgreSQL)
-- Authoritative Challenges from UN SDGs, WHO, WEF, World Bank, FAO, Paris Agreement
-- ==============================================================================

-- 1. Insert Categories
INSERT INTO categories (id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Environment/Climate'),
  ('c1000000-0000-0000-0000-000000000002', 'Health & Disease'),
  ('c1000000-0000-0000-0000-000000000003', 'Food & Water'),
  ('c1000000-0000-0000-0000-000000000004', 'Energy & Infrastructure'),
  ('c1000000-0000-0000-0000-000000000005', 'Education & Skills'),
  ('c1000000-0000-0000-0000-000000000006', 'Economy & Inequality'),
  ('c1000000-0000-0000-0000-000000000007', 'Governance & Peace'),
  ('c1000000-0000-0000-0000-000000000008', 'Technology & Innovation'),
  ('c1000000-0000-0000-0000-000000000009', 'Women & Social'),
  ('c1000000-0000-0000-0000-000000000010', 'Other (Future Tech)'),
  ('c1000000-0000-0000-0000-000000000011', 'Business & Commerce'),
  ('c1000000-0000-0000-0000-000000000012', 'Supply Chain & Logistics'),
  ('c1000000-0000-0000-0000-000000000013', 'Agriculture & Farming')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Regions
INSERT INTO regions (id, name) VALUES
  ('r1000000-0000-0000-0000-000000000001', 'Global'),
  ('r1000000-0000-0000-0000-000000000002', 'Sub-Saharan Africa'),
  ('r1000000-0000-0000-0000-000000000003', 'South Asia'),
  ('r1000000-0000-0000-0000-000000000004', 'Southeast Asia'),
  ('r1000000-0000-0000-0000-000000000005', 'Latin America'),
  ('r1000000-0000-0000-0000-000000000006', 'Europe'),
  ('r1000000-0000-0000-0000-000000000007', 'North America'),
  ('r1000000-0000-0000-0000-000000000008', 'Middle East'),
  ('r1000000-0000-0000-0000-000000000009', 'Asia-Pacific')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Tags
INSERT INTO tags (id, name) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'Climate Change'),
  ('t1000000-0000-0000-0000-000000000002', 'Carbon'),
  ('t1000000-0000-0000-0000-000000000003', 'Emissions'),
  ('t1000000-0000-0000-0000-000000000004', 'Clean Energy'),
  ('t1000000-0000-0000-0000-000000000005', 'SDG 13'),
  ('t1000000-0000-0000-0000-000000000006', 'Clean Water'),
  ('t1000000-0000-0000-0000-000000000007', 'Sanitation'),
  ('t1000000-0000-0000-0000-000000000008', 'Rural Health'),
  ('t1000000-0000-0000-0000-000000000009', 'Filtration'),
  ('t1000000-0000-0000-0000-000000000010', 'SDG 6'),
  ('t1000000-0000-0000-0000-000000000011', 'Hunger'),
  ('t1000000-0000-0000-0000-000000000012', 'Agriculture'),
  ('t1000000-0000-0000-0000-000000000013', 'Food Security'),
  ('t1000000-0000-0000-0000-000000000014', 'Supply Chain'),
  ('t1000000-0000-0000-0000-000000000015', 'SDG 2'),
  ('t1000000-0000-0000-0000-000000000016', 'Infectious Diseases'),
  ('t1000000-0000-0000-0000-000000000017', 'Pandemics'),
  ('t1000000-0000-0000-0000-000000000018', 'Diagnostics'),
  ('t1000000-0000-0000-0000-000000000019', 'Public Health'),
  ('t1000000-0000-0000-0000-000000000020', 'SDG 3'),
  ('t1000000-0000-0000-0000-000000000021', 'Education'),
  ('t1000000-0000-0000-0000-000000000022', 'Literacy'),
  ('t1000000-0000-0000-0000-000000000023', 'Digital Divide'),
  ('t1000000-0000-0000-0000-000000000024', 'EdTech'),
  ('t1000000-0000-0000-0000-000000000025', 'SDG 4'),
  ('t1000000-0000-0000-0000-000000000026', 'Poverty'),
  ('t1000000-0000-0000-0000-000000000027', 'Financial Inclusion'),
  ('t1000000-0000-0000-0000-000000000028', 'Microfinance'),
  ('t1000000-0000-0000-0000-000000000029', 'Gig Economy'),
  ('t1000000-0000-0000-0000-000000000030', 'SDG 10'),
  ('t1000000-0000-0000-0000-000000000031', 'Digital Inclusion'),
  ('t1000000-0000-0000-0000-000000000032', 'AI for Good'),
  ('t1000000-0000-0000-0000-000000000033', 'Connectivity'),
  ('t1000000-0000-0000-0000-000000000034', 'Broadband'),
  ('t1000000-0000-0000-0000-000000000035', 'SDG 9'),
  ('t1000000-0000-0000-0000-000000000036', 'Gender Equality'),
  ('t1000000-0000-0000-0000-000000000037', 'Women Founders'),
  ('t1000000-0000-0000-0000-000000000038', 'Safety'),
  ('t1000000-0000-0000-0000-000000000039', 'Economic Empowerment'),
  ('t1000000-0000-0000-0000-000000000040', 'SDG 5'),
  ('t1000000-0000-0000-0000-000000000041', 'Renewable Energy'),
  ('t1000000-0000-0000-0000-000000000042', 'Solar'),
  ('t1000000-0000-0000-0000-000000000043', 'Battery Storage'),
  ('t1000000-0000-0000-0000-000000000044', 'Smart Grid'),
  ('t1000000-0000-0000-0000-000000000045', 'SDG 7'),
  ('t1000000-0000-0000-0000-000000000046', 'Mental Health'),
  ('t1000000-0000-0000-0000-000000000047', 'Depression'),
  ('t1000000-0000-0000-0000-000000000048', 'Therapy Access'),
  ('t1000000-0000-0000-0000-000000000049', 'Wellness')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert 10 World-wide Problem Statements
INSERT INTO problems (id, title, description, source_url, impact_level, created_at, updated_at) VALUES
(
  'p1000000-0000-0000-0000-000000000001',
  'Limit global warming to 1.5°C (Paris Agreement goal)',
  'According to the IPCC and the Paris Agreement, limiting global warming to 1.5°C requires cutting global greenhouse gas emissions by 45% by 2030 and reaching net zero by 2050. Without rapid and deep transformations across energy, industry, transport, and food systems, catastrophic climate disruptions, extreme weather events, and ecosystem collapses will severely jeopardize human civilization. Startups innovating in carbon capture, grid decarbonization, industrial electrification, and climate intelligence are urgently required.',
  'https://unfccc.int/process-and-meetings/the-paris-agreement',
  10,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000002',
  'Ensure clean water and sanitation for all',
  'Over 2 billion people worldwide live in water-stressed countries, and approximately 2.3 billion lack basic sanitation facilities. Water contamination triggers widespread waterborne diseases such as cholera, dysentery, and typhoid, heavily affecting children under five. Affordable decentralized water purification, smart IoT leak detection, atmospheric water generators, and biological waste treatment technologies can radically change lives in vulnerable rural and peri-urban communities.',
  'https://www.who.int/water-sanitation-health',
  9,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000003',
  'End hunger and malnutrition by 2030',
  'As highlighted by the UN FAO, over 828 million people suffer from chronic hunger, exacerbated by climate shocks, conflict, and post-harvest losses of up to 40% in emerging economies. Transforming food systems through precision agriculture, drought-resistant bio-solutions, localized cold-chain logistics, and alternative protein production is essential to achieving Zero Hunger (UN SDG 2).',
  'https://www.fao.org/state-of-food-security-nutrition',
  9,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000004',
  'Reduce threat of infectious and re-emerging diseases',
  'Infectious disease outbreaks and antimicrobial resistance (AMR) threaten global public health and economic stability. Vector-borne pathogens like Dengue, malaria, and novel viral strains spread faster due to urbanization and climate disruption. Urgent solutions are required in AI-powered syndromic surveillance, rapid point-of-care diagnostics, decentralized cold chains for vaccines, and novel antimicrobial alternatives.',
  'https://www.who.int/emergencies/diseases/en',
  9,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000005',
  'Improve quality and access to education',
  'More than 250 million children and youth remain out of school, and hundreds of millions more lack foundational literacy and numeracy due to underfunded infrastructure and teacher shortages. High-quality offline-first personalized learning platforms, AI tutoring assistants tailored to local dialects, and accessible vocational upskilling programs are needed to democratize human potential.',
  'https://www.unesco.org/en/education',
  8,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000006',
  'Reduce wealth and income inequality',
  'The top 1% of the world''s population holds nearly half of all global wealth, while billions struggle to access fair banking, credit, and dignified livelihoods. Fintech innovations in micro-lending, transparent decentralized financial rails, cooperative ownership tools, and equitable marketplace protocols can bridge the economic divide and unlock upward mobility.',
  'https://www.worldbank.org/en/topic/inequality',
  8,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000007',
  'Ensure ICT/AI access works for everyone',
  'Approximately 2.6 billion people remain completely offline, missing the benefits of digital education, telehealth, and economic opportunities. Moreover, the rapid rise of Artificial Intelligence risks exacerbating the cognitive and economic divide if compute and advanced AI tools are not made accessible, open, and multilingual. Next-gen satellite internet, edge-computing AI devices, and open-source models optimized for low-bandwidth environments can bridge this divide.',
  'https://www.itu.int/hub/2023/11/facts-and-figures-2023',
  8,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000008',
  'Empower women and gender equality',
  'Achieving full gender equality could add $12 trillion to global GDP by 2025. Yet women face disproportionate barriers in access to capital, personal safety, healthcare, and equal workplace representation. Startups addressing women''s health (FemTech), digital safety networks, collateral-free credit scoring for female micro-entrepreneurs, and transparent wage parity systems can drive profound societal progress.',
  'https://www.unwomen.org/en/digital-library/publications',
  8,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000009',
  'Provide affordable, sustainable energy for all',
  'Over 675 million people still have no access to electricity, mostly in Sub-Saharan Africa and rural Asia, relying on polluting kerosene and biomass. Affordable mini-grids, pay-as-you-go solar systems, distributed energy storage, and smart microgrid orchestration can leapfrog traditional carbon-intensive utility grids and power economic resilience.',
  'https://www.iea.org/reports/sdg7-data-and-projections',
  9,
  NOW(),
  NOW()
),
(
  'p1000000-0000-0000-0000-000000000010',
  'Improve global mental health',
  'Over 280 million people worldwide suffer from depression, and nearly 1 billion live with a mental disorder. Stigma, severe shortage of certified practitioners, and high costs leave more than 75% of people in low- and middle-income countries without any mental healthcare support. Evidence-based digital therapeutics, accessible peer-support ecosystems, and empathetic AI behavioral coaching can provide timely interventions at scale.',
  'https://www.who.int/news-room/fact-sheets/detail/depression',
  8,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  source_url = EXCLUDED.source_url,
  impact_level = EXCLUDED.impact_level,
  updated_at = NOW();

-- 5. Associate Categories to Problems
INSERT INTO problem_categories (problem_id, category_id) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004'),
  ('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000006'),
  ('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000008'),
  ('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005'),
  ('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000008'),
  ('p1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006'),
  ('p1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000007'),
  ('p1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000008'),
  ('p1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000005'),
  ('p1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000009'),
  ('p1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000006'),
  ('p1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000004'),
  ('p1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000009')
ON CONFLICT DO NOTHING;

-- 6. Associate Regions to Problems
INSERT INTO problem_regions (problem_id, region_id) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000001', 'r1000000-0000-0000-0000-000000000006'),
  ('p1000000-0000-0000-0000-000000000002', 'r1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000002', 'r1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000004', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000004', 'r1000000-0000-0000-0000-000000000004'),
  ('p1000000-0000-0000-0000-000000000005', 'r1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000005', 'r1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000006', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000006', 'r1000000-0000-0000-0000-000000000005'),
  ('p1000000-0000-0000-0000-000000000007', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000008', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000008', 'r1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000009', 'r1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000009', 'r1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000010', 'r1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000010', 'r1000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;

-- 7. Associate Tags to Problems
INSERT INTO problem_tags (problem_id, tag_id) VALUES
  ('p1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001'),
  ('p1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000002'),
  ('p1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000003'),
  ('p1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000004'),
  ('p1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000005'),

  ('p1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000006'),
  ('p1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000007'),
  ('p1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000008'),
  ('p1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000009'),
  ('p1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000010'),

  ('p1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000011'),
  ('p1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000012'),
  ('p1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000013'),
  ('p1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000014'),
  ('p1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000015'),

  ('p1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000016'),
  ('p1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000017'),
  ('p1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000018'),
  ('p1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000019'),
  ('p1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000020'),

  ('p1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000021'),
  ('p1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000022'),
  ('p1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000023'),
  ('p1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000024'),
  ('p1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000025'),

  ('p1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000026'),
  ('p1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000027'),
  ('p1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000028'),
  ('p1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000029'),
  ('p1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000030'),

  ('p1000000-0000-0000-0000-000000000007', 't1000000-0000-0000-0000-000000000031'),
  ('p1000000-0000-0000-0000-000000000007', 't1000000-0000-0000-0000-000000000032'),
  ('p1000000-0000-0000-0000-000000000007', 't1000000-0000-0000-0000-000000000033'),
  ('p1000000-0000-0000-0000-000000000007', 't1000000-0000-0000-0000-000000000034'),
  ('p1000000-0000-0000-0000-000000000007', 't1000000-0000-0000-0000-000000000035'),

  ('p1000000-0000-0000-0000-000000000008', 't1000000-0000-0000-0000-000000000036'),
  ('p1000000-0000-0000-0000-000000000008', 't1000000-0000-0000-0000-000000000037'),
  ('p1000000-0000-0000-0000-000000000008', 't1000000-0000-0000-0000-000000000038'),
  ('p1000000-0000-0000-0000-000000000008', 't1000000-0000-0000-0000-000000000039'),
  ('p1000000-0000-0000-0000-000000000008', 't1000000-0000-0000-0000-000000000040'),

  ('p1000000-0000-0000-0000-000000000009', 't1000000-0000-0000-0000-000000000041'),
  ('p1000000-0000-0000-0000-000000000009', 't1000000-0000-0000-0000-000000000042'),
  ('p1000000-0000-0000-0000-000000000009', 't1000000-0000-0000-0000-000000000043'),
  ('p1000000-0000-0000-0000-000000000009', 't1000000-0000-0000-0000-000000000044'),
  ('p1000000-0000-0000-0000-000000000009', 't1000000-0000-0000-0000-000000000045'),

  ('p1000000-0000-0000-0000-000000000010', 't1000000-0000-0000-0000-000000000046'),
  ('p1000000-0000-0000-0000-000000000010', 't1000000-0000-0000-0000-000000000047'),
  ('p1000000-0000-0000-0000-000000000010', 't1000000-0000-0000-0000-000000000048'),
  ('p1000000-0000-0000-0000-000000000010', 't1000000-0000-0000-0000-000000000049')
ON CONFLICT DO NOTHING;
