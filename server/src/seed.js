import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

export async function main() {
  console.log('🌱 Starting StartupZ database seed...');

  await prisma.raisedSolution.deleteMany({});
  await prisma.failedStartup.deleteMany({});
  await prisma.videoMeeting.deleteMany({});
  await prisma.startupProposal.deleteMany({});
  await prisma.startupFollow.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.savedItem.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.verificationRequest.deleteMany({});
  await prisma.opportunityApplication.deleteMany({});
  await prisma.startupOpportunity.deleteMany({});
  await prisma.startupMember.deleteMany({});
  await prisma.mentorshipRequest.deleteMany({});
  await prisma.mentor.deleteMany({});
  await prisma.investor.deleteMany({});
  await prisma.startup.deleteMany({});
  await prisma.connection.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  const usersData = [
    {
      email: 'admin@startupz.com',
      role: 'ADMIN',
      isAdmin: true,
      isVerified: true,
      verificationBadge: 'Platform Admin',
      profile: {
        fullName: 'Alex Vance',
        headline: 'StartupZ Ecosystem Lead | Community Architect',
        location: 'San Francisco, CA',
        bio: 'Passionate about connecting early-stage founders with world-class builders, operators, and capital.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        skills: 'Ecosystem Building, Startup Strategy, Venture Capital, Product Architecture',
        industries: 'AI, B2B SaaS, FinTech, DeepTech',
        openTo: 'Collaboration,Mentorship',
        startupExperience: 'Serial Founder',
        profileCompletion: 100,
      },
    },
    {
      email: 'sarah.chen@aiagri.io',
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      profile: {
        fullName: 'Sarah Chen',
        headline: 'Founder @ FarmConnect | AgTech & AI Enthusiast | Looking for Technical Co-Founder',
        location: 'Austin, TX',
        bio: 'Building AI systems to empower smallholder and commercial farmers with real-time agronomic insights. Previously product manager at an AgriTech unicorn.',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
        skills: 'Product Management, AgTech, Go-To-Market, Customer Discovery, Fundraising',
        startupInterests: 'AgTech, ClimateTech, AI, Sustainability',
        industries: 'AgTech, Artificial Intelligence, ClimateTech',
        preferredRole: 'CEO / Business Co-Founder',
        availability: 'Full-time',
        startupExperience: 'First-time Founder',
        achievements: 'Secured $100K state climate grant, partnered with 15 pilot farms.',
        openTo: 'Co-Founder,Startup Team,Investment,Mentorship',
        profileCompletion: 95,
      },
    },
    {
      email: 'marcus.dev@codeflow.dev',
      role: 'DEVELOPER',
      isVerified: true,
      verificationBadge: 'Verified Member',
      profile: {
        fullName: 'Marcus Brody',
        headline: 'Staff Full-Stack Engineer | React + Node + Rust | Looking to join Early-Stage Team',
        location: 'Seattle, WA',
        bio: '7+ years architecting scalable cloud services and developer tooling. Built systems processing 50M+ requests/day. Hungry to build zero-to-one ventures.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        skills: 'React, Node.js, TypeScript, Rust, PostgreSQL, GraphQL, Docker, AWS',
        startupInterests: 'Developer Tools, AI Infrastructure, Cloud, B2B SaaS',
        industries: 'Developer Tools, AI, B2B SaaS',
        preferredRole: 'Technical Co-Founder / Founding CTO',
        availability: 'Full-time',
        startupExperience: 'Early Employee',
        githubUrl: 'https://github.com',
        linkedinUrl: 'https://linkedin.com',
        openTo: 'Co-Founder,Startup Team,Equity only',
        profileCompletion: 90,
      },
    },
    {
      email: 'priya.design@pixelcraft.studio',
      role: 'DESIGNER',
      isVerified: true,
      verificationBadge: 'Verified Member',
      profile: {
        fullName: 'Priya Sharma',
        headline: 'Product Designer & Design Systems Lead | Open to Design Co-Founder Roles',
        location: 'New York, NY',
        bio: 'Crafting clean, conversion-focused interfaces for high-growth startups. Led UX at two YC-backed companies. Passionate about AI-native workflows.',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        skills: 'UI/UX Design, Figma, User Research, Prototyping, Design Systems, Frontend Basics',
        startupInterests: 'AI Products, FinTech, Creator Economy, Consumer Tech',
        industries: 'Design, Consumer Tech, FinTech',
        preferredRole: 'Design Co-Founder / Head of Design',
        availability: 'Part-time',
        portfolioUrl: 'https://behance.net',
        openTo: 'Co-Founder,Startup Team,Collaboration',
        profileCompletion: 85,
      },
    },
    {
      email: 'david.kim@healthpulse.ai',
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      profile: {
        fullName: 'Dr. David Kim',
        headline: 'Founder @ MedPulse AI | MD + Informatics | Building Clinical Copilots',
        location: 'Boston, MA',
        bio: 'Practicing clinician and biomedical informatics researcher. Developing an AI-driven clinical workflow assistant to reduce doctor burnout by 50%.',
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
        skills: 'Healthcare IT, Clinical AI, Bio-informatics, Medical Device Regulation, Pitching',
        startupInterests: 'HealthTech, MedTech, AI, Regulatory',
        industries: 'HealthTech, Artificial Intelligence, BioTech',
        preferredRole: 'Founder / CEO',
        availability: 'Full-time',
        startupExperience: 'First-time Founder',
        openTo: 'Co-Founder,Investment,Mentorship',
        profileCompletion: 92,
      },
    },
    {
      email: 'elena.investor@apexventures.vc',
      role: 'INVESTOR',
      isVerified: true,
      verificationBadge: 'Verified Investor',
      profile: {
        fullName: 'Elena Rostova',
        headline: 'Partner @ Apex Ventures | Pre-Seed & Seed | AI & B2B SaaS',
        location: 'San Francisco, CA',
        bio: 'Investing $100K - $1M in high-conviction technical founders reimagining enterprise workflows and generative AI architectures.',
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
        skills: 'Venture Capital, Term Sheets, Growth Strategy, Cap Table Management, Board Governance',
        startupInterests: 'Artificial Intelligence, B2B SaaS, Cybersecurity, DevOps',
        industries: 'Artificial Intelligence, B2B SaaS, FinTech',
        openTo: 'Investment,Collaboration',
        profileCompletion: 95,
      },
    },
    {
      email: 'james.mentor@scaleadvisors.com',
      role: 'MENTOR',
      isVerified: true,
      verificationBadge: 'Verified Mentor',
      profile: {
        fullName: 'James Sterling',
        headline: 'Startup Mentor & 2x Exited Founder | Ex-YC W16 | Advisory & Founder Coaching',
        location: 'Denver, CO',
        bio: 'Scaled two SaaS companies from zero to $20M+ ARR and successful acquisitions. Helping early founders avoid classic pitfalls in GTM, hiring, and pitching.',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
        skills: 'Founder Mentorship, Pitch Deck Review, Go-to-Market, Enterprise Sales, Series A Prep',
        startupInterests: 'Enterprise SaaS, Marketplaces, Vertical Software',
        industries: 'B2B SaaS, Enterprise Software, Marketplaces',
        openTo: 'Mentorship,Advisory',
        profileCompletion: 95,
      },
    },
    {
      email: 'liam.ops@greenbyte.earth',
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      profile: {
        fullName: "Liam O'Connor",
        headline: 'Founder @ GreenByte | Carbon Accounting for Tech Startups | ClimateTech',
        location: 'London / Remote',
        bio: 'Environmental systems scientist turned tech founder. GreenByte makes Scope 1, 2, and 3 emissions tracking automatic for digital businesses.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        skills: 'ClimateTech, Carbon Accounting, SaaS Architecture, Regulatory Compliance',
        startupInterests: 'ClimateTech, Clean Energy, ESG, Enterprise',
        industries: 'ClimateTech, Enterprise Software, CleanTech',
        preferredRole: 'Founder / CEO',
        availability: 'Full-time',
        startupExperience: 'Serial Founder',
        openTo: 'Co-Founder,Startup Team,Investment',
        profileCompletion: 90,
      },
    },
    {
      email: 'maya.edu@eduspark.learn',
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      profile: {
        fullName: 'Maya Patel',
        headline: 'Founder @ EduSpark | AI-Powered Adaptive Learning for K-12 and STEM',
        location: 'Chicago, IL',
        bio: 'Former educator and curriculum designer. Building an AI companion that adapts curriculum pacing to each student’s unique mastery curve.',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80',
        skills: 'EdTech, Curriculum Design, Adaptive Learning, Pedagogy, Community Building',
        startupInterests: 'EdTech, AI, Future of Work, Social Impact',
        industries: 'EdTech, Artificial Intelligence, Consumer',
        preferredRole: 'Founder / CEO',
        availability: 'Full-time',
        startupExperience: 'First-time Founder',
        openTo: 'Co-Founder,Startup Team,Investment',
        profileCompletion: 89,
      },
    },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const { profile, ...userData } = u;
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: defaultPassword,
        profile: { create: profile },
      },
      include: { profile: true },
    });
    createdUsers.push(user);
  }

  const userByEmail = new Map(createdUsers.map((u) => [u.email, u]));

  const startupsData = [
    {
      founderEmail: 'sarah.chen@aiagri.io',
      name: 'FarmConnect',
      logo: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80',
      oneLineDescription: 'AI-powered agronomic advisory platform delivering real-time crop disease detection & yield forecasting.',
      problem: 'Small and mid-sized farmers lack access to specialized agronomists, resulting in 20-30% preventable crop losses annually.',
      solution: 'A mobile-first computer vision and micro-climate AI assistant that detects plant diseases in seconds from photos.',
      targetCustomers: 'Commercial grain & specialty crop farmers, farming cooperatives, and agricultural insurers.',
      industry: 'AgTech',
      businessModel: 'B2B SaaS ($49/month/farm)',
      stage: 'MVP',
      location: 'Austin, TX',
      requiredSkills: 'AI Developer, Full Stack Developer, Growth Marketing Partner',
      fundingStatus: 'Seeking Funding',
      fundingRequired: '$250,000',
      currentTraction: '18 active pilot farms, 14,000 satellite & leaf scans analyzed, 94% diagnostic accuracy',
      website: 'https://farmconnect-ai.example.com',
      demoLink: 'https://demo.farmconnect-ai.example.com',
      isVerified: true,
      likesCount: 38,
      viewsCount: 312,
    },
    {
      founderEmail: 'david.kim@healthpulse.ai',
      name: 'MedPulse AI',
      logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=80',
      oneLineDescription: 'Clinical copilot automating medical charting and real-time drug interaction safeguards for physicians.',
      problem: 'Doctors spend 2+ hours on electronic health record (EHR) data entry for every 1 hour of patient care.',
      solution: 'Ambient voice AI that listens during patient encounters, drafts structured SOAP notes, and flags contraindications.',
      targetCustomers: 'Outpatient clinics, private medical practices, and regional hospital systems.',
      industry: 'HealthTech',
      businessModel: 'B2B Subscription ($199/physician/month)',
      stage: 'Validation',
      location: 'Boston, MA',
      requiredSkills: 'Healthcare Compliance Lead, Senior Python/NLP Engineer, Seed Stage Co-Founder',
      fundingStatus: 'Pre-Seed',
      fundingRequired: '$500,000',
      currentTraction: 'LOIs signed with 3 clinical networks (45 physicians), IRB approval for clinical trials',
      website: 'https://medpulse-ai.example.com',
      isVerified: true,
      likesCount: 52,
      viewsCount: 420,
    },
    {
      founderEmail: 'liam.ops@greenbyte.earth',
      name: 'GreenByte',
      logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200&auto=format&fit=crop&q=80',
      oneLineDescription: 'Automated carbon accounting API and ESG reporting dashboard for digital businesses and tech SMBs.',
      problem: 'New regulations require SMEs to report vendor emissions, but hiring ESG consultants costs $40k+.',
      solution: 'Plug-and-play API integrating with AWS, GCP, Stripe, and QuickBooks to compute real-time carbon footprints.',
      targetCustomers: 'Series A-C startups, digital agencies, and modern e-commerce brands needing compliance.',
      industry: 'ClimateTech',
      businessModel: 'Usage-based SaaS ($99 to $890/month)',
      stage: 'Early Revenue',
      location: 'London / Remote',
      requiredSkills: 'Full-Stack TypeScript Engineer, B2B Enterprise Sales Lead',
      fundingStatus: 'Seed',
      fundingRequired: '$750,000',
      currentTraction: '$14,200 MRR, 28 paying customers including 4 funded tech companies',
      website: 'https://greenbyte.earth',
      isVerified: true,
      likesCount: 29,
      viewsCount: 260,
    },
    {
      founderEmail: 'maya.edu@eduspark.learn',
      name: 'EduSpark',
      logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&auto=format&fit=crop&q=80',
      oneLineDescription: 'Socratic AI tutor that turns complex STEM concepts into interactive, bite-sized gamified experiments.',
      problem: 'Traditional remote learning has an 85% drop-off rate because static video lectures fail to actively engage students.',
      solution: 'Interactive micro-simulations where an adaptive AI mentor prompts students to discover scientific formulas.',
      targetCustomers: 'High school students, homeschooling parents, and supplementary tutoring centers.',
      industry: 'EdTech',
      businessModel: 'Freemium ($14.99/month for unlimited simulations & parent dashboard)',
      stage: 'MVP',
      location: 'Chicago, IL',
      requiredSkills: 'React/Three.js Interactive Engineer, EdTech Growth Marketer',
      fundingStatus: 'Bootstrapped',
      fundingRequired: '$150,000',
      currentTraction: '3,200 organic monthly active students, 42 school teachers using it for homework assignments',
      website: 'https://eduspark.learn',
      isVerified: false,
      likesCount: 24,
      viewsCount: 195,
    },
  ];

  const createdStartups = [];
  for (const s of startupsData) {
    const founder = userByEmail.get(s.founderEmail);
    const { founderEmail, ...startupInfo } = s;
    const startup = await prisma.startup.create({
      data: {
        ...startupInfo,
        founderId: founder.id,
      },
    });
    createdStartups.push(startup);
  }

  const startupByName = new Map(createdStartups.map((s) => [s.name, s]));

  // Opportunities
  const opportunitiesData = [
    {
      startupName: 'FarmConnect',
      role: 'Founding AI / Computer Vision Engineer',
      requiredSkills: 'Python, PyTorch, OpenCV, Computer Vision, FastAPI',
      commitment: 'Full-time',
      compensation: 'Paid + Equity',
      location: 'Austin, TX / Remote',
      workplaceType: 'Remote',
      description: 'Lead the computer vision architecture for our leaf pathology detector. You will optimize inference models for low-bandwidth mobile devices.',
    },
    {
      startupName: 'FarmConnect',
      role: 'Growth Marketing Co-Founder',
      requiredSkills: 'Growth Hacking, AgTech, Performance Marketing, B2B Partnerships',
      commitment: 'Full-time',
      compensation: 'Equity only',
      location: 'Austin, TX',
      workplaceType: 'Hybrid',
      description: 'Join as a business partner to scale our commercial farmer onboarding and establish distribution deals with cooperatives.',
    },
    {
      startupName: 'MedPulse AI',
      role: 'Full Stack Healthcare Engineer',
      requiredSkills: 'React, Node.js, HIPAA Compliance, FHIR/HL7, PostgreSQL',
      commitment: 'Full-time',
      compensation: 'Paid + Equity',
      location: 'Boston, MA / Remote',
      workplaceType: 'Remote',
      description: 'Build EHR integration pipelines connecting our ambient listening service with hospital record databases.',
    },
    {
      startupName: 'GreenByte',
      role: 'Senior TypeScript / Backend Architect',
      requiredSkills: 'TypeScript, Node.js, AWS Lambda, GraphQL, REST APIs',
      commitment: 'Full-time',
      compensation: 'Paid',
      location: 'London, UK / Remote',
      workplaceType: 'Remote',
      description: 'Own our carbon computation engine and accounting API integrations.',
    },
    {
      startupName: 'EduSpark',
      role: 'Interactive WebGL / React Developer',
      requiredSkills: 'React, Three.js, Canvas API, WebGL, UI Animation',
      commitment: 'Part-time',
      compensation: 'Paid + Equity',
      location: 'Chicago, IL / Remote',
      workplaceType: 'Remote',
      description: 'Help us design tactile physics and chemistry simulations in the browser.',
    },
  ];

  for (const opp of opportunitiesData) {
    const startup = startupByName.get(opp.startupName);
    const { startupName, ...oppInfo } = opp;
    await prisma.startupOpportunity.create({
      data: {
        ...oppInfo,
        startupId: startup.id,
      },
    });
  }

  // Investors
  const elena = userByEmail.get('elena.investor@apexventures.vc');
  await prisma.investor.create({
    data: {
      userId: elena.id,
      organization: 'Apex Ventures',
      investorType: 'Venture Capital',
      industries: 'Artificial Intelligence, B2B SaaS, Cloud Infrastructure, Developer Tools',
      preferredStages: 'Pre-Seed, Seed, Series A',
      minCheckSize: '$250k',
      maxCheckSize: '$1.5M',
      location: 'San Francisco, CA',
      website: 'https://apexventures.example.com',
      portfolio: 'Runway, Synthetix, Pinecone, ScaleDev',
      about: 'Early-stage venture fund backing exceptional technical founders building the intelligent enterprise stack.',
      isVerified: true,
    },
  });

  // Mentors
  const james = userByEmail.get('james.mentor@scaleadvisors.com');
  await prisma.mentor.create({
    data: {
      userId: james.id,
      expertise: 'Product-Market Fit, Enterprise Sales, Fundraising Pitch, YC Application',
      industries: 'B2B SaaS, Enterprise Software, Marketplaces',
      yearsExperience: 14,
      availableHours: '4 hrs/month',
      mentoringTopics: 'Pitch Deck Review, Founder Mindset, Scaling from $0 to $1M ARR, Pricing Strategy',
      about: 'Ex-founder who has been in your shoes. I focus on actionable feedback, ruthlessly cutting fluff from your deck.',
      isVerified: true,
    },
  });

  // Connections
  const sarah = userByEmail.get('sarah.chen@aiagri.io');
  const marcus = userByEmail.get('marcus.dev@codeflow.dev');
  const priya = userByEmail.get('priya.design@pixelcraft.studio');
  const david = userByEmail.get('david.kim@healthpulse.ai');

  await prisma.connection.create({
    data: {
      senderId: sarah.id,
      receiverId: marcus.id,
      status: 'ACCEPTED',
      note: 'Loved your GitHub projects on distributed sensor feeds. Would love to connect regarding FarmConnect!',
    },
  });

  await prisma.connection.create({
    data: {
      senderId: priya.id,
      receiverId: sarah.id,
      status: 'ACCEPTED',
      note: 'Inspiring vision on FarmConnect. Connecting to follow your AgTech journey!',
    },
  });

  await prisma.connection.create({
    data: {
      senderId: david.id,
      receiverId: elena.id,
      status: 'ACCEPTED',
      note: 'Elena, great meeting your syndicate colleagues at the MedTech summit.',
    },
  });

  // Posts
  const fc = startupByName.get('FarmConnect');
  const p1 = await prisma.post.create({
    data: {
      authorId: sarah.id,
      startupId: fc.id,
      postType: 'LAUNCH',
      title: 'Excited to announce our FarmConnect MVP Beta! 🌾',
      content: 'After 6 months of field testing with 18 pilot farmers in Texas, we are launching FarmConnect v0.8! Our vision model is detecting rust fungus and nutrient deficiencies 4 days faster than visual inspection. Looking for feedback and a passionate technical co-founder to join the journey.',
      likesCount: 24,
      commentsCount: 2,
    },
  });

  await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: marcus.id,
      content: 'Huge congrats Sarah! The speed improvement on edge detection looks formidable.',
    },
  });

  await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: elena.id,
      content: 'Impressive traction on the pilot farms. Sending you a note on your pitch.',
    },
  });

  const p2 = await prisma.post.create({
    data: {
      authorId: marcus.id,
      postType: 'COFOUNDER',
      title: 'Looking for a Business Co-Founder in B2B SaaS / DevTools',
      content: 'I have spent the last 7 years as a staff backend/infrastructure engineer. I am ready to go all-in full-time on building developer platforms or AI infrastructure. If you are a sales/operations powerhouse with domain insights, let’s grab a virtual coffee!',
      likesCount: 19,
      commentsCount: 1,
    },
  });

  await prisma.comment.create({
    data: {
      postId: p2.id,
      authorId: james.id,
      content: 'Marcus is one of the sharpest engineers in the ecosystem. Founders looking for a CTO should connect.',
    },
  });

  // Conversation & message
  const [u1, u2] = [sarah.id, marcus.id].sort();
  const conv = await prisma.conversation.create({
    data: {
      participant1Id: u1,
      participant2Id: u2,
      lastMessage: 'Sounds great! I reviewed the technical architecture and would love to dive deeper.',
      lastMessageAt: new Date(),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: sarah.id,
      receiverId: marcus.id,
      content: 'Hi Marcus, saw your background in low-latency infrastructure. We are building the edge vision pipeline for FarmConnect and would love to collaborate!',
      isRead: true,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: marcus.id,
      receiverId: sarah.id,
      content: 'Sounds great! I reviewed the technical architecture and would love to dive deeper.',
      isRead: false,
    },
  });

  // Seed Failed Startups & Post-Mortems
  const quibi = await prisma.failedStartup.create({
    data: {
      name: 'Quibi',
      industry: 'Media & Mobile Streaming',
      peakFunding: '$1.75 Billion',
      yearsActive: '2018 - 2020',
      logo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&auto=format&fit=crop&q=80',
      summary: 'Short-form, premium Hollywood video streaming platform built strictly for mobile phones.',
      whyItFailed: 'Failed to recognize that TikTok and YouTube offered organic viral content for free. Banned screenshots and memes on social media, killing viral discovery. Locked users out of TV screens during lockdowns.',
      unsolvedProblem: 'People crave bite-sized, high-production storytelling during quick commutes, but incumbent streaming giants only produce 50-minute episodes.',
      lessonsLearned: 'Never compete with free user-generated feeds using locked walled gardens. Organic distribution and community sharing are non-negotiable.',
      solutionsCount: 1,
    },
  });

  const fast = await prisma.failedStartup.create({
    data: {
      name: 'Fast.co',
      industry: 'Fintech & Checkout',
      peakFunding: '$120 Million',
      yearsActive: '2019 - 2022',
      logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80',
      summary: 'One-click checkout button attempting to become the universal shopping identity across the open web.',
      whyItFailed: 'Astronomical cash burn rate ($10M/month) with less than $600k annual revenue. Over-hired before achieving product-market fit. Merchant integration friction was high and Stripe/Shopify already dominated.',
      unsolvedProblem: 'Consumers still abandon 70% of online shopping carts because entering address and payment details on mobile web is slow and clunky.',
      lessonsLearned: 'Do not subsidize checkout without sustainable merchant transaction take rates. Distribution requires merchant lock-in, not vanity sponsorship billboards.',
      solutionsCount: 2,
    },
  });

  const zume = await prisma.failedStartup.create({
    data: {
      name: 'Zume Pizza',
      industry: 'Robotics & FoodTech',
      peakFunding: '$445 Million',
      yearsActive: '2015 - 2020',
      logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80',
      summary: 'Automated pizza-making trucks with robotic ovens that cooked food en route to customers.',
      whyItFailed: 'Massive capital expenditure maintaining robotic food trucks. The pizzas shifted in transit and cooking en route caused uneven quality. Cloud kitchens and DoorDash proved far cheaper to scale.',
      unsolvedProblem: 'Fresh, piping-hot food delivery still suffers from soggy transit, high delivery driver fees, and food arriving cold.',
      lessonsLearned: 'Hardware and robotics in high-vibration mobile vehicles create massive failure rates. Software orchestration of localized hub-and-spoke prep is far superior to cooking in moving vans.',
      solutionsCount: 0,
    },
  });

  await prisma.raisedSolution.create({
    data: {
      failedStartupId: quibi.id,
      authorId: sarah.id,
      title: 'MicroCinema: AI Interactive 3-Minute Episodics',
      description: 'A community-driven platform where indie filmmakers and game writers create branching 3-minute interactive interactive narratives with native TikTok sharing and creator revenue share.',
      targetAudience: 'Commuters, Gen-Z mobile gamers, and webtoon readers.',
      differentiation: 'Unlike Quibi, MicroCinema is web-accessible, allows instant meme sharing, and lets viewers choose branching story paths.',
      upvotesCount: 18,
    },
  });

  console.log('✅ StartupZ database seeded successfully!');
}

if (process.argv[1] && process.argv[1].includes('seed.js')) {
  main()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
