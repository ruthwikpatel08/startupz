import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

export async function main() {
  console.log('🌱 Starting StartupZ database seed...');

  await prisma.problemTag.deleteMany({});
  await prisma.problemCategory.deleteMany({});
  await prisma.problemRegion.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.region.deleteMany({});
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

  // ==============================================================================
  // Seed World-wide Problem Statements, Categories, Regions, and Tags
  // ==============================================================================
  console.log('🌍 Seeding World-wide Problem Statements...');
  const adminUser = userByEmail.get('admin@startupz.com');

  const categoriesList = [
    'Environment/Climate',
    'Health & Disease',
    'Food & Water',
    'Agriculture & Farming',
    'Energy & Infrastructure',
    'Education & Skills',
    'Economy & Inequality',
    'Governance & Peace',
    'Technology & Innovation',
    'Women & Social',
    'Business & Commerce',
    'Supply Chain & Logistics',
    'Other (Future Tech)',
  ];

  const categoryMap = new Map();
  for (const name of categoriesList) {
    const cat = await prisma.category.create({ data: { name } });
    categoryMap.set(name, cat.id);
  }

  const regionsList = [
    'Global',
    'Sub-Saharan Africa',
    'South Asia',
    'Southeast Asia',
    'Latin America',
    'Europe',
    'North America',
    'Middle East',
    'Asia-Pacific',
  ];

  const regionMap = new Map();
  for (const name of regionsList) {
    const reg = await prisma.region.create({ data: { name } });
    regionMap.set(name, reg.id);
  }

  const tagsList = [
    'Climate Change', 'Carbon', 'Emissions', 'Clean Energy', 'SDG 13',
    'Clean Water', 'Sanitation', 'Rural Health', 'Filtration', 'SDG 6',
    'Hunger', 'Agriculture', 'Food Security', 'Supply Chain', 'SDG 2',
    'Infectious Diseases', 'Pandemics', 'Diagnostics', 'Public Health', 'SDG 3',
    'Education', 'Literacy', 'Digital Divide', 'EdTech', 'SDG 4',
    'Poverty', 'Financial Inclusion', 'Microfinance', 'Gig Economy', 'SDG 10',
    'Digital Inclusion', 'AI for Good', 'Connectivity', 'Broadband', 'SDG 9',
    'Gender Equality', 'Women Founders', 'Safety', 'Economic Empowerment', 'SDG 5',
    'Renewable Energy', 'Solar', 'Battery Storage', 'Smart Grid', 'SDG 7',
    'Mental Health', 'Depression', 'Therapy Access', 'Wellness',
    'Fintech', 'B2B Payments', 'SME Finance', 'Cash Flow', 'Invoicing',
    'Logistics', 'Freight', 'IoT', 'Cold Chain', 'Cybersecurity', 'Ransomware',
    'Enterprise SaaS', 'AI Defense', 'Information Security', 'Remittances',
    'Cross-Border Payments', 'Stablecoins', 'FX', 'E-Commerce', 'Reverse Logistics',
    'Retail Tech', 'Circular Economy', 'Inventory Management', 'RegTech',
    'Tax Compliance', 'LegalTech', 'Cross-Border Trade', 'Climate Tech',
    'Scope 3 Emissions', 'ESG Compliance', 'Carbon Accounting', 'Enterprise AI',
    'Data Silos', 'Workflow Automation', 'Knowledge Management', 'ERP Integration',
    'AgriTech', 'Cold Storage', 'Marketplaces', 'Farmer Prosperity',
    'HealthTech', 'BioTech', 'Clinical Trials', 'Patient Matching', 'R&D Acceleration',
    'Soil Health', 'Regenerative Agriculture', 'Biochar', 'Water Scarcity', 'Irrigation',
    'Drip Irrigation', 'Aquifers', 'Pest Control', 'Crop Diseases', 'CGIAR', 'Computer Vision',
    'AgriFintech', 'Crop Insurance', 'Satellite NDVI', 'Methane', 'Livestock', 'Alternative Feed',
    'Seaweed', 'Emissions Reduction', 'Maritime Logistics', 'Port Operations', 'Procurement',
    'Fraud Detection', 'ERP Audit', 'FinOps', 'Cloud Infrastructure', 'GPU Optimization',
    'Enterprise Tech', 'AI Infrastructure', 'Inventory Tracking', 'RFID', 'Loss Prevention',
    'Omnichannel', 'Remote Work', 'HR Tech', 'Global Payroll', 'Future of Work'
  ];

  const tagMap = new Map();
  for (const name of tagsList) {
    const tag = await prisma.tag.create({ data: { name } });
    tagMap.set(name, tag.id);
  }

  const problemsData = [
    {
      title: 'Limit global warming to 1.5°C (Paris Agreement goal)',
      description: 'According to the IPCC and Paris Agreement, limiting global warming to 1.5°C requires cutting global greenhouse gas emissions by 45% by 2030 and reaching net zero by 2050. Without rapid and deep transformations across energy, industry, transport, and food systems, catastrophic climate disruptions, extreme weather events, and ecosystem collapses will severely jeopardize human civilization. Startups innovating in carbon capture, grid decarbonization, industrial electrification, and climate intelligence are urgently required.',
      sourceUrl: 'https://unfccc.int/process-and-meetings/the-paris-agreement',
      impactLevel: 10,
      categories: ['Environment/Climate', 'Energy & Infrastructure'],
      regions: ['Global', 'Europe', 'North America'],
      tags: ['Climate Change', 'Carbon', 'Emissions', 'Clean Energy', 'SDG 13'],
    },
    {
      title: 'Ensure clean water and sanitation for all',
      description: 'Over 2 billion people worldwide live in water-stressed countries, and approximately 2.3 billion lack basic sanitation facilities. Water contamination triggers widespread waterborne diseases such as cholera, dysentery, and typhoid, heavily affecting children under five. Affordable decentralized water purification, smart IoT leak detection, atmospheric water generators, and biological waste treatment technologies can radically change lives in vulnerable rural and peri-urban communities.',
      sourceUrl: 'https://www.who.int/water-sanitation-health',
      impactLevel: 9,
      categories: ['Food & Water', 'Health & Disease'],
      regions: ['Sub-Saharan Africa', 'South Asia', 'Latin America', 'Global'],
      tags: ['Clean Water', 'Sanitation', 'Rural Health', 'Filtration', 'SDG 6'],
    },
    {
      title: 'End hunger and malnutrition by 2030',
      description: 'As highlighted by the UN FAO, over 828 million people suffer from chronic hunger, exacerbated by climate shocks, conflict, and post-harvest losses of up to 40% in emerging economies. Transforming food systems through precision agriculture, drought-resistant bio-solutions, localized cold-chain logistics, and alternative protein production is essential to achieving Zero Hunger (UN SDG 2).',
      sourceUrl: 'https://www.fao.org/state-of-food-security-nutrition',
      impactLevel: 9,
      categories: ['Food & Water', 'Economy & Inequality'],
      regions: ['Sub-Saharan Africa', 'South Asia', 'Global'],
      tags: ['Hunger', 'Agriculture', 'Food Security', 'Supply Chain', 'SDG 2'],
    },
    {
      title: 'Reduce threat of infectious and re-emerging diseases',
      description: 'Infectious disease outbreaks and antimicrobial resistance (AMR) threaten global public health and economic stability. Vector-borne pathogens like Dengue, malaria, and novel viral strains spread faster due to urbanization and climate disruption. Urgent solutions are required in AI-powered syndromic surveillance, rapid point-of-care diagnostics, decentralized cold chains for vaccines, and novel antimicrobial alternatives.',
      sourceUrl: 'https://www.who.int/emergencies/diseases/en',
      impactLevel: 9,
      categories: ['Health & Disease', 'Technology & Innovation'],
      regions: ['Global', 'Southeast Asia', 'Sub-Saharan Africa'],
      tags: ['Infectious Diseases', 'Pandemics', 'Diagnostics', 'Public Health', 'SDG 3'],
    },
    {
      title: 'Improve quality and access to education',
      description: 'More than 250 million children and youth remain out of school, and hundreds of millions more lack foundational literacy and numeracy due to underfunded infrastructure and teacher shortages. High-quality offline-first personalized learning platforms, AI tutoring assistants tailored to local dialects, and accessible vocational upskilling programs are needed to democratize human potential.',
      sourceUrl: 'https://www.unesco.org/en/education',
      impactLevel: 8,
      categories: ['Education & Skills', 'Technology & Innovation'],
      regions: ['South Asia', 'Sub-Saharan Africa', 'Latin America', 'Global'],
      tags: ['Education', 'Literacy', 'Digital Divide', 'EdTech', 'SDG 4'],
    },
    {
      title: 'Reduce wealth and income inequality',
      description: 'The top 1% of the world\'s population holds nearly half of all global wealth, while billions struggle to access fair banking, credit, and dignified livelihoods. Fintech innovations in micro-lending, transparent decentralized financial rails, cooperative ownership tools, and equitable marketplace protocols can bridge the economic divide and unlock upward mobility.',
      sourceUrl: 'https://www.worldbank.org/en/topic/inequality',
      impactLevel: 8,
      categories: ['Economy & Inequality', 'Governance & Peace'],
      regions: ['Global', 'Latin America', 'South Asia'],
      tags: ['Poverty', 'Financial Inclusion', 'Microfinance', 'Gig Economy', 'SDG 10'],
    },
    {
      title: 'Ensure ICT/AI access works for everyone',
      description: 'Approximately 2.6 billion people remain completely offline, missing the benefits of digital education, telehealth, and economic opportunities. Moreover, the rapid rise of Artificial Intelligence risks exacerbating the cognitive and economic divide if compute and advanced AI tools are not made accessible, open, and multilingual. Next-gen satellite internet, edge-computing AI devices, and open-source models optimized for low-bandwidth environments can bridge this divide.',
      sourceUrl: 'https://www.itu.int/hub/2023/11/facts-and-figures-2023',
      impactLevel: 8,
      categories: ['Technology & Innovation', 'Education & Skills'],
      regions: ['Global', 'South Asia', 'Sub-Saharan Africa'],
      tags: ['Digital Inclusion', 'AI for Good', 'Connectivity', 'Broadband', 'SDG 9'],
    },
    {
      title: 'Empower women and gender equality',
      description: 'Achieving full gender equality could add $12 trillion to global GDP by 2025. Yet women face disproportionate barriers in access to capital, personal safety, healthcare, and equal workplace representation. Startups addressing women\'s health (FemTech), digital safety networks, collateral-free credit scoring for female micro-entrepreneurs, and transparent wage parity systems can drive profound societal progress.',
      sourceUrl: 'https://www.unwomen.org/en/digital-library/publications',
      impactLevel: 8,
      categories: ['Women & Social', 'Economy & Inequality'],
      regions: ['Global', 'South Asia', 'Middle East', 'Sub-Saharan Africa'],
      tags: ['Gender Equality', 'Women Founders', 'Safety', 'Economic Empowerment', 'SDG 5'],
    },
    {
      title: 'Provide affordable, sustainable energy for all',
      description: 'Over 675 million people still have no access to electricity, mostly in Sub-Saharan Africa and rural Asia, relying on polluting kerosene and biomass. Affordable mini-grids, pay-as-you-go solar systems, distributed energy storage, and smart microgrid orchestration can leapfrog traditional carbon-intensive utility grids and power economic resilience.',
      sourceUrl: 'https://www.iea.org/reports/sdg7-data-and-projections',
      impactLevel: 9,
      categories: ['Energy & Infrastructure', 'Environment/Climate'],
      regions: ['Sub-Saharan Africa', 'South Asia', 'Global'],
      tags: ['Renewable Energy', 'Solar', 'Battery Storage', 'Smart Grid', 'SDG 7'],
    },
    {
      title: 'Improve global mental health',
      description: 'Over 280 million people worldwide suffer from depression, and nearly 1 billion live with a mental disorder. Stigma, severe shortage of certified practitioners, and high costs leave more than 75% of people in low- and middle-income countries without any mental healthcare support. Evidence-based digital therapeutics, accessible peer-support ecosystems, and empathetic AI behavioral coaching can provide timely interventions at scale.',
      sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/depression',
      impactLevel: 8,
      categories: ['Health & Disease', 'Women & Social'],
      regions: ['Global', 'North America', 'Europe', 'Asia-Pacific'],
      tags: ['Mental Health', 'Depression', 'Therapy Access', 'Wellness', 'SDG 3'],
    },
    {
      title: 'SME Cash Flow Crisis & Delayed B2B Invoicing',
      description: 'Small and medium-sized enterprises (SMEs) face critical liquidity crunches, with over $3 trillion in delayed B2B payments globally (World Bank & IFC SME Finance). Over 60% of small businesses suffer chronic cash flow volatility due to rigid 60-90 day net payment terms and slow manual reconciliation. Autonomous invoice factoring, dynamic supplier early-payment discounting, and real-time bank settlement rails are urgently required to eliminate unnecessary SME insolvencies.',
      sourceUrl: 'https://www.worldbank.org/en/topic/smefinance',
      impactLevel: 9,
      categories: ['Business & Commerce', 'Economy & Inequality'],
      regions: ['Global', 'North America', 'South Asia', 'Europe'],
      tags: ['Fintech', 'B2B Payments', 'SME Finance', 'Cash Flow', 'Invoicing'],
    },
    {
      title: 'Global Supply Chain Opacity & Cold-Chain Logistics Wastage',
      description: 'Global freight and distribution ecosystems suffer from extreme fragmentation, leading to over $160 billion of temperature-sensitive pharmaceuticals and perishable food being spoiled annually in transit (FAO / McKinsey Operations). Lack of end-to-end telemetry and manual customs paperwork creates costly port bottlenecks. Real-time IoT condition monitoring, predictive multi-modal routing, and automated customs compliance platforms are vital for global commerce resilience.',
      sourceUrl: 'https://www.mckinsey.com/capabilities/operations/our-insights',
      impactLevel: 9,
      categories: ['Supply Chain & Logistics', 'Technology & Innovation'],
      regions: ['Global', 'Asia-Pacific', 'North America', 'Europe'],
      tags: ['Supply Chain', 'Logistics', 'Freight', 'IoT', 'Cold Chain'],
    },
    {
      title: 'Enterprise Cybersecurity & AI-Driven Ransomware Defense',
      description: 'Cybercrime damages are projected to exceed $10.5 trillion annually by 2025 (World Economic Forum Global Cybersecurity Outlook). Automated phishing, polymorphic malware, zero-day vulnerabilities, and deepfake executive impersonations disproportionately disrupt mid-market enterprises lacking 24/7 security operations teams. Autonomous AI defense mesh networks, zero-trust cryptographic access, and rapid remediation pipelines are essential to safeguard business continuity.',
      sourceUrl: 'https://www.weforum.org/reports/global-cybersecurity-outlook-2024',
      impactLevel: 10,
      categories: ['Business & Commerce', 'Technology & Innovation'],
      regions: ['Global', 'North America', 'Europe', 'Asia-Pacific'],
      tags: ['Cybersecurity', 'Ransomware', 'Enterprise SaaS', 'AI Defense', 'Information Security'],
    },
    {
      title: 'High Cross-Border Remittance & Merchant Settlement Fees',
      description: 'Cross-border remittances and international merchant transactions incur an average fee of 6.25% and take 3–5 business days to settle through correspondent banking networks (Bank for International Settlements). High FX markups drain over $45 billion annually from migrant workers, micro-exporters, and cross-border startups. Open-banking protocols, stablecoin liquidity corridors, and instant peer-to-peer settlement networks can democratize global capital flows.',
      sourceUrl: 'https://www.bis.org/cpmi/cross_border.htm',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Economy & Inequality'],
      regions: ['Global', 'Latin America', 'Sub-Saharan Africa', 'South Asia'],
      tags: ['Fintech', 'Remittances', 'Cross-Border Payments', 'Stablecoins', 'FX'],
    },
    {
      title: 'E-Commerce Reverse Logistics & Excessive Retail Returns Waste',
      description: 'Over 20% of all online retail purchases are returned, costing global retailers $816 billion annually and sending over 5.8 billion pounds of returned inventory straight into landfills (National Retail Federation & Reverse Logistics Association). Predictive virtual sizing engines, circular liquidation marketplaces, and automated refurbishing networks can turn this massive margin-drain into a sustainable profit center.',
      sourceUrl: 'https://nrf.com/research-insights/consumer-merchandise-returns',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Environment/Climate'],
      regions: ['North America', 'Europe', 'Asia-Pacific', 'Global'],
      tags: ['E-Commerce', 'Reverse Logistics', 'Retail Tech', 'Circular Economy', 'Inventory Management'],
    },
    {
      title: 'Fragmented Regulatory Compliance & Cross-Border Tax Friction',
      description: 'Cross-border expansion exposes growing companies to hundreds of regional tax jurisdictions, VAT/GST filing mandates, data localization laws (GDPR, CCPA), and export controls. Growing businesses spend up to 7% of gross revenue on manual compliance overhead (OECD Forum on Tax Administration). Unified API-driven tax calculation engines, automated statutory filing pipelines, and continuous compliance audit telemetry can unlock borderless commerce.',
      sourceUrl: 'https://www.oecd.org/tax/forum-on-tax-administration/',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Governance & Peace'],
      regions: ['Global', 'Europe', 'North America', 'Asia-Pacific'],
      tags: ['RegTech', 'Tax Compliance', 'LegalTech', 'Cross-Border Trade'],
    },
    {
      title: 'Scope 3 Corporate Carbon Accounting & Supply Chain Decarbonization',
      description: 'Over 70% to 90% of an enterprise\'s total emissions footprint stems from Scope 3 upstream suppliers and downstream logistics (World Business Council for Sustainable Development). With incoming EU CSRD, California climate disclosure laws, and global ESG mandates, companies risk massive fines and contract loss. Standardized primary carbon telemetry exchange, supplier emissions benchmarking, and localized green procurement marketplaces are urgently needed.',
      sourceUrl: 'https://www.wbcsd.org/Programs/Climate-and-Energy/Climate/Pathways/Scope-3',
      impactLevel: 9,
      categories: ['Business & Commerce', 'Environment/Climate', 'Supply Chain & Logistics'],
      regions: ['Europe', 'North America', 'Global', 'Asia-Pacific'],
      tags: ['Climate Tech', 'Scope 3 Emissions', 'ESG Compliance', 'Carbon Accounting', 'Supply Chain'],
    },
    {
      title: 'Enterprise Legacy System Integration & Unstructured Data Silos',
      description: 'Over 80% of enterprise operational knowledge remains locked in legacy on-premise ERPs, scanned PDF contracts, isolated data warehouses, and employee communication threads (Gartner Enterprise Software Benchmarks). Knowledge workers waste nearly 20% of their time searching for internal data. Multimodal enterprise agents, zero-ETL data federation, and contextual AI workflows can unlock trillions in organizational productivity.',
      sourceUrl: 'https://www.gartner.com/en/newsroom/press-releases',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Technology & Innovation'],
      regions: ['Global', 'North America', 'Europe'],
      tags: ['Enterprise AI', 'Data Silos', 'Workflow Automation', 'Knowledge Management', 'ERP Integration'],
    },
    {
      title: 'Agricultural Post-Harvest Loss & Cold Chain Market Disconnect',
      description: 'Up to 40% of agricultural harvests in developing regions spoil before reaching consumer markets due to a complete lack of localized cold storage and transparent spot pricing (UN FAO & Rockefeller Foundation). Smallholder farmers suffer devastating income volatility while urban centers face high food inflation. Decentralized solar-powered cold storage lockers, farm-gate digital auctions, and bio-friendly shelf-life extension coatings can protect food security.',
      sourceUrl: 'https://www.fao.org/food-loss-and-food-waste',
      impactLevel: 9,
      categories: ['Food & Water', 'Supply Chain & Logistics', 'Economy & Inequality'],
      regions: ['Sub-Saharan Africa', 'South Asia', 'Latin America'],
      tags: ['AgriTech', 'Cold Storage', 'Marketplaces', 'Farmer Prosperity', 'Food Security'],
    },
    {
      title: 'Clinical Trial Recruitment Delays & Pharmaceutical R&D Bottlenecks',
      description: 'More than 80% of global clinical trials fail to recruit required patient cohorts within target deadlines, delaying life-saving cures and costing biotechnology sponsors upwards of $8 million for every day of delay (National Institutes of Health & Tufts CSDD). Precision electronic health record matching, decentralized trial monitoring, and synthetic control cohorts can compress pharmaceutical commercialization timelines from years to months.',
      sourceUrl: 'https://www.nih.gov/health-information/nih-clinical-research-trials-you',
      impactLevel: 9,
      categories: ['Health & Disease', 'Technology & Innovation', 'Business & Commerce'],
      regions: ['North America', 'Europe', 'Global'],
      tags: ['HealthTech', 'BioTech', 'Clinical Trials', 'Patient Matching', 'R&D Acceleration'],
    },
    {
      title: 'Soil Degradation & Loss of Arable Farmland',
      description: 'Over 33% of the Earth\'s soils are moderately to severely degraded due to erosion, salinization, compaction, and synthetic chemical acidification (UN FAO Global Soil Partnership). By 2050, 90% of Earth\'s topsoil could be at risk, directly threatening crop yields while global food demand surges. Autonomous precision soil microbiome diagnostics, biochar carbon sequestration, and regenerative microbial soil inoculants are urgently required to rebuild soil fertility.',
      sourceUrl: 'https://www.fao.org/soils-portal/about',
      impactLevel: 10,
      categories: ['Agriculture & Farming', 'Food & Water', 'Environment/Climate'],
      regions: ['Global', 'Sub-Saharan Africa', 'South Asia', 'North America'],
      tags: ['Agriculture', 'Soil Health', 'Regenerative Agriculture', 'Biochar', 'AgriTech'],
    },
    {
      title: 'Groundwater Over-Extraction & Agricultural Water Scarcity',
      description: 'Agriculture accounts for 70% of all global freshwater withdrawals, causing the rapid depletion of critical underground aquifers across major breadbaskets from California to the Indo-Gangetic Plain (World Bank Water Global Practice). Inefficient flood irrigation wastes up to 50% of applied water. AI-driven precision drip irrigation, automated subsurface moisture sensing, and drought-tolerant crop cultivars are essential to avoid catastrophic agricultural water crises.',
      sourceUrl: 'https://www.worldbank.org/en/topic/water-in-agriculture',
      impactLevel: 9,
      categories: ['Agriculture & Farming', 'Food & Water', 'Environment/Climate'],
      regions: ['South Asia', 'North America', 'Middle East', 'Sub-Saharan Africa'],
      tags: ['Water Scarcity', 'Irrigation', 'Drip Irrigation', 'Aquifers', 'AgriTech'],
    },
    {
      title: 'Crop Disease & Invasive Pest Outbreaks from Climate Shifts',
      description: 'Invasive agricultural pests like Fall Armyworm and fungal blights like Wheat Stem Rust destroy 20–40% of global crop yields annually, costing the global economy over $220 billion (CGIAR & CABI). Warming temperatures accelerate pest migration into previously temperate farming zones. Edge-AI smartphone crop disease scanners, pheromone bio-disruption systems, and robotic micro-pesticide spot sprayers can halt crop devastation with minimal chemical runoff.',
      sourceUrl: 'https://www.cgiar.org/research/crop-health',
      impactLevel: 9,
      categories: ['Agriculture & Farming', 'Food & Water', 'Technology & Innovation'],
      regions: ['Sub-Saharan Africa', 'Latin America', 'South Asia', 'Global'],
      tags: ['Pest Control', 'Crop Diseases', 'CGIAR', 'Food Security', 'Computer Vision'],
    },
    {
      title: 'Smallholder Farmer Financing & Climate Crop Insurance Gap',
      description: 'Over 500 million smallholder family farms produce 80% of food in developing countries, yet less than 10% have access to formal agricultural credit or weather-index insurance (IFC & CGAP). A single drought or unseasonal flood pushes entire farming communities into generational poverty. Parametric satellite-triggered micro-insurance, alternative credit scoring based on satellite vegetation health (NDVI), and digital grain receipts can unlock financial resilience for farmers.',
      sourceUrl: 'https://www.cgap.org/topics/collections/smallholder-finance',
      impactLevel: 9,
      categories: ['Agriculture & Farming', 'Business & Commerce', 'Economy & Inequality'],
      regions: ['Sub-Saharan Africa', 'South Asia', 'Latin America'],
      tags: ['AgriFintech', 'Crop Insurance', 'Microfinance', 'Satellite NDVI', 'Farmer Prosperity'],
    },
    {
      title: 'Livestock Enteric Methane Emissions & Sustainable Alternative Feeds',
      description: 'Enteric fermentation from ruminant livestock accounts for approximately 32% of global human-caused methane emissions, a greenhouse gas 80 times more potent than CO2 over a 20-year timeline (UNEP Global Methane Assessment). Replacing traditional grain and soy feed with red seaweed (Asparagopsis) supplements, insect-based mealworm proteins, and bio-fermented feed additives can slash methane emissions by up to 80% while preserving pasture land.',
      sourceUrl: 'https://www.unep.org/resources/report/global-methane-assessment',
      impactLevel: 8,
      categories: ['Environment/Climate', 'Agriculture & Farming', 'Technology & Innovation'],
      regions: ['Global', 'North America', 'Europe', 'Latin America'],
      tags: ['Methane', 'Livestock', 'Alternative Feed', 'Seaweed', 'Emissions Reduction'],
    },
    {
      title: 'Fragmented Global Ocean Shipping & Port Demurrage Bottlenecks',
      description: 'Global ocean shipping and container logistics remain plagued by paper bill-of-lading workflows, demurrage disputes, and empty container repositioning, costing world trade over $30 billion annually in demurrage penalties alone (WTO & World Shipping Council). Standardized electronic Bills of Lading (eBL), automated container triangulation marketplaces, and predictive port arrival coordination platforms can streamline international supply chains.',
      sourceUrl: 'https://www.wto.org/english/tratop_e/tradfa_e/tradfa_e.htm',
      impactLevel: 8,
      categories: ['Supply Chain & Logistics', 'Business & Commerce'],
      regions: ['Global', 'Asia-Pacific', 'North America', 'Europe'],
      tags: ['Maritime Logistics', 'Port Operations', 'Supply Chain', 'Cross-Border Trade', 'Freight'],
    },
    {
      title: 'B2B Procurement Fraud & Vendor Payment Duplication',
      description: 'Organizations lose an estimated 5% of gross revenue annually to procurement fraud, unauthorized vendor alterations, and duplicate vendor billing (Association of Certified Fraud Examiners Report to the Nations). Traditional ERP three-way matching fails to detect sophisticated synthetic vendor fraud or kickback schemes. Graph neural networks for vendor relational mapping, autonomous invoice anomaly auditing, and cryptographic vendor bank-verification APIs can eliminate billions in corporate leakage.',
      sourceUrl: 'https://www.acfe.com/report-to-the-nations/',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Technology & Innovation'],
      regions: ['Global', 'North America', 'Europe'],
      tags: ['Procurement', 'Fraud Detection', 'ERP Audit', 'Enterprise SaaS', 'Fintech'],
    },
    {
      title: 'Corporate Cloud Infrastructure Waste & AI Compute Cost Escalation',
      description: 'Enterprises waste over 32% of cloud computing budgets on over-provisioned idle instances and inefficient GPU utilization for AI training and inference (Gartner & FinOps Foundation State of Cloud). With enterprise AI workloads surging, uncontrolled cloud infrastructure bills are eroding software margins. Autonomous FinOps agents, dynamic GPU virtualization, and automated cluster right-sizing can reduce cloud operating expenditure by 40%.',
      sourceUrl: 'https://www.finops.org/insights/',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Technology & Innovation'],
      regions: ['Global', 'North America', 'Europe'],
      tags: ['FinOps', 'Cloud Infrastructure', 'GPU Optimization', 'Enterprise Tech', 'AI Infrastructure'],
    },
    {
      title: 'Retail Inventory Shrinkage & Omnichannel Stock Inaccuracy',
      description: 'Retail shrink—encompassing supply chain theft, in-store shoplifting, and administrative inventory errors—reached $112 billion in 2023 (National Retail Federation National Security Survey). Meanwhile, store-level inventory accuracy hovers at only 65%, sabotaging buy-online-pickup-in-store (BOPIS) fulfillment. RFID micro-tagging infrastructure, computer vision shelf monitoring, and edge-AI shrinkage detection can restore profitability to brick-and-mortar and omnichannel retailers.',
      sourceUrl: 'https://nrf.com/research-insights/national-retail-security-survey',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Technology & Innovation'],
      regions: ['North America', 'Europe', 'Global'],
      tags: ['Retail Tech', 'Inventory Tracking', 'RFID', 'Loss Prevention', 'Omnichannel'],
    },
    {
      title: 'Global High-Skill Remote Talent Payroll & Compliance Friction',
      description: 'Over 45% of tech and knowledge startups hire remote international workers across 30+ jurisdictions, yet 72% struggle with misclassification risks, localized mandatory benefits, cross-border tax withholding, and IP assignment validity (ILO World Employment and Social Outlook). Unified global employer of record (EOR) automation, automated statutory contractor classification, and localized equity incentive rails enable borderless company building.',
      sourceUrl: 'https://www.ilo.org/global/research/global-reports/weso/',
      impactLevel: 8,
      categories: ['Business & Commerce', 'Governance & Peace', 'Education & Skills'],
      regions: ['Global', 'Latin America', 'South Asia', 'Europe', 'North America'],
      tags: ['Remote Work', 'HR Tech', 'Global Payroll', 'Compliance', 'Future of Work'],
    },
  ];

  for (const prob of problemsData) {
    const createdProb = await prisma.problem.create({
      data: {
        title: prob.title,
        description: prob.description,
        sourceUrl: prob.sourceUrl,
        impactLevel: prob.impactLevel,
        createdBy: adminUser ? adminUser.id : null,
      },
    });

    for (const catName of prob.categories) {
      const catId = categoryMap.get(catName);
      if (catId) {
        await prisma.problemCategory.create({
          data: {
            problemId: createdProb.id,
            categoryId: catId,
          },
        });
      }
    }

    for (const regName of prob.regions) {
      const regId = regionMap.get(regName);
      if (regId) {
        await prisma.problemRegion.create({
          data: {
            problemId: createdProb.id,
            regionId: regId,
          },
        });
      }
    }

    for (const tagName of prob.tags) {
      const tagId = tagMap.get(tagName);
      if (tagId) {
        await prisma.problemTag.create({
          data: {
            problemId: createdProb.id,
            tagId: tagId,
          },
        });
      }
    }
  }

  console.log('✅ StartupZ database seeded successfully!');
}

if (process.argv[1] && process.argv[1].includes('seed.js')) {
  main()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
