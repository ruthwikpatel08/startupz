import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { realProblems } from './realData/problems.js';
import { realStartups } from './realData/startups.js';
import { realInvestors } from './realData/investors.js';
import { realMentors } from './realData/mentors.js';
import { realOpportunities } from './realData/opportunities.js';
import { realFailedStartups } from './realData/failedStartups.js';
import { demoAccounts } from './realData/demoAccounts.js';

export async function main() {
  console.log('🌱 Starting verified StartupZ real data & ecosystem seed...');

  // 1. CLEANUP IN SAFE FOREIGN-KEY ORDER
  console.log('🧹 Clearing previous database state for clean, idempotent rebuild...');
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

  // 2. SEED DEMO PRESENTATION ACCOUNTS (Strictly separated per Section 13)
  console.log('👤 Seeding clearly marked demo presentation accounts...');
  const userMap = new Map(); // email -> created User

  for (const acc of demoAccounts) {
    const createdUser = await prisma.user.create({
      data: {
        email: acc.email,
        password: defaultPassword,
        role: acc.role || 'FOUNDER',
        isAdmin: acc.isAdmin || false,
        isVerified: acc.isVerified !== undefined ? acc.isVerified : true,
        verificationBadge: acc.verificationBadge || 'Verified Member',
        profile: {
          create: {
            fullName: acc.profile.fullName,
            headline: acc.profile.headline || null,
            location: acc.profile.location || null,
            bio: acc.profile.bio || null,
            avatar: acc.profile.avatar || null,
            education: acc.profile.education || null,
            skills: acc.profile.skills || null,
            startupInterests: acc.profile.startupInterests || null,
            industries: acc.profile.industries || null,
            preferredRole: acc.profile.preferredRole || null,
            availability: acc.profile.availability || 'Full-time',
            startupExperience: acc.profile.startupExperience || null,
            achievements: acc.profile.achievements || null,
            openTo: acc.profile.openTo || null,
            profileCompletion: acc.profile.profileCompletion || 90,
          },
        },
      },
    });
    userMap.set(acc.email, createdUser);
  }
  console.log(`✅ Seeded ${userMap.size} presentation demo accounts.`);

  const adminUser = userMap.get('admin@startupz.com');
  const demoFounder = userMap.get('sarah.chen@aiagri.io') || Array.from(userMap.values())[0];

  // 3. SEED REAL VERIFIED STARTUPS (40 Companies)
  console.log('🏢 Seeding 40 verified real startups with official company data & problems solved...');
  const startupMap = new Map(); // name -> created Startup

  for (const s of realStartups) {
    const orgEmail = `contact@${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    let startupFounder = userMap.get(orgEmail);

    if (!startupFounder) {
      startupFounder = await prisma.user.create({
        data: {
          email: orgEmail,
          password: defaultPassword,
          role: 'STARTUP',
          isVerified: true,
          verificationBadge: 'Verified Company',
          profile: {
            create: {
              fullName: `${s.name} Team`,
              headline: `${s.oneLineDescription}`,
              location: s.location || 'Global',
              bio: `Official company profile for ${s.name}. Founded in ${s.location}. ${s.currentTraction || ''}`,
              avatar: s.logo || null,
              websiteUrl: s.website || null,
              skills: s.requiredSkills || null,
              industries: s.industry || null,
              profileCompletion: 100,
            },
          },
        },
      });
      userMap.set(orgEmail, startupFounder);
    }

    const createdStartup = await prisma.startup.create({
      data: {
        founderId: startupFounder.id,
        name: s.name,
        logo: s.logo || null,
        oneLineDescription: s.oneLineDescription,
        problem: s.problem,
        solution: s.solution,
        targetCustomers: s.targetCustomers || null,
        industry: s.industry,
        businessModel: s.businessModel || null,
        stage: s.stage || 'Growth',
        location: s.location || null,
        requiredSkills: s.requiredSkills || null,
        fundingStatus: s.fundingStatus || 'Venture Backed',
        fundingRequired: s.fundingRequired || null,
        currentTraction: s.currentTraction || null,
        website: s.website || null,
        demoLink: s.website || null,
        pitchDeckUrl: s.website || null,
        visibility: 'PUBLIC',
        isConfidential: false,
        isVerified: true,
        likesCount: Math.floor(Math.random() * 30) + 12,
        viewsCount: Math.floor(Math.random() * 300) + 150,
        followersCount: Math.floor(Math.random() * 80) + 25,
      },
    });
    startupMap.set(s.name, createdStartup);
  }
  console.log(`✅ Seeded ${startupMap.size} real startups with verified products & problems.`);

  // 4. SEED REAL VERIFIED INVESTORS (27 Institutions)
  console.log('💰 Seeding 27 verified venture capital and climate investment organizations...');
  const investorList = [];

  for (const inv of realInvestors) {
    const invEmail = `contact@${inv.organization.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    let invUser = userMap.get(invEmail);

    if (!invUser) {
      invUser = await prisma.user.create({
        data: {
          email: invEmail,
          password: defaultPassword,
          role: 'INVESTOR',
          isVerified: true,
          verificationBadge: 'Verified Investor',
          profile: {
            create: {
              fullName: inv.organization,
              headline: `${inv.investorType} • ${inv.location}`,
              location: inv.location,
              bio: inv.about,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inv.organization)}`,
              websiteUrl: inv.website || null,
              industries: inv.industries,
              profileCompletion: 100,
            },
          },
        },
      });
      userMap.set(invEmail, invUser);
    }

    const createdInv = await prisma.investor.create({
      data: {
        userId: invUser.id,
        organization: inv.organization,
        investorType: inv.investorType,
        industries: inv.industries,
        preferredStages: inv.preferredStages,
        minCheckSize: inv.minCheckSize || '$100,000',
        maxCheckSize: inv.maxCheckSize || '$5,000,000',
        location: inv.location,
        website: inv.website || null,
        portfolio: inv.portfolio || null,
        about: inv.about,
        isVerified: true,
      },
    });
    investorList.push(createdInv);
  }
  console.log(`✅ Seeded ${investorList.length} verified investment organizations.`);

  // 5. SEED REAL ECOSYSTEM MENTORS & INCUBATORS (20 Institutions)
  console.log('🎓 Seeding 20 verified ecosystem mentorship and accelerator programs...');
  const mentorList = [];

  for (const m of realMentors) {
    const mentorEmail = `advisory@${m.organization.toLowerCase().replace(/[^a-z0-9]/g, '')}.org`;
    let mentorUser = userMap.get(mentorEmail);

    if (!mentorUser) {
      mentorUser = await prisma.user.create({
        data: {
          email: mentorEmail,
          password: defaultPassword,
          role: 'MENTOR',
          isVerified: true,
          verificationBadge: 'Verified Mentor',
          profile: {
            create: {
              fullName: m.organization,
              headline: m.expertise,
              location: 'India / Global',
              bio: m.about,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.organization)}`,
              websiteUrl: m.website || null,
              industries: m.industries,
              profileCompletion: 100,
            },
          },
        },
      });
      userMap.set(mentorEmail, mentorUser);
    }

    const createdMentor = await prisma.mentor.create({
      data: {
        userId: mentorUser.id,
        expertise: m.expertise,
        industries: m.industries,
        yearsExperience: m.yearsExperience || 10,
        availableHours: m.availableHours || 'Official Portal',
        mentoringTopics: m.mentoringTopics,
        about: m.about,
        website: m.website || null,
        isVerified: true,
      },
    });
    mentorList.push(createdMentor);
  }
  console.log(`✅ Seeded ${mentorList.length} verified mentorship programs & incubators.`);

  // 6. SEED REAL VERIFIED OPPORTUNITIES (32 Programs & Roles)
  console.log('💼 Seeding 32 real opportunities (grants, accelerators, fellowships, and startup roles)...');
  const opportunityList = [];

  for (const opp of realOpportunities) {
    let startup = startupMap.get(opp.startupName);
    if (!startup) {
      // Default to first startup if matching name not found
      startup = Array.from(startupMap.values())[0];
    }

    const createdOpp = await prisma.startupOpportunity.create({
      data: {
        startupId: startup.id,
        role: opp.role,
        requiredSkills: opp.requiredSkills,
        commitment: opp.commitment || 'Full-time',
        compensation: opp.compensation || 'Paid + Equity',
        location: opp.location || 'Remote',
        workplaceType: opp.workplaceType || 'Remote',
        description: opp.description,
        status: opp.status || 'OPEN',
      },
    });
    opportunityList.push(createdOpp);
  }
  console.log(`✅ Seeded ${opportunityList.length} verified public opportunities and startup roles.`);

  // 7. SEED REAL DOCUMENTED FAILED STARTUPS (8 Cases)
  console.log('⚰️ Seeding 8 real historical startup post-mortems (Startup Graveyard)...');
  const graveyardList = [];

  for (const fs of realFailedStartups) {
    const createdFailed = await prisma.failedStartup.create({
      data: {
        name: fs.name,
        industry: fs.industry,
        peakFunding: fs.peakFunding,
        yearsActive: fs.yearsActive,
        logo: fs.logo || null,
        summary: fs.summary,
        whyItFailed: fs.whyItFailed,
        unsolvedProblem: fs.unsolvedProblem,
        lessonsLearned: fs.lessonsLearned,
        solutionsCount: fs.solutions ? fs.solutions.length : 0,
      },
    });
    graveyardList.push(createdFailed);

    if (fs.solutions && fs.solutions.length > 0) {
      for (const sol of fs.solutions) {
        const author = userMap.get(sol.authorEmail) || demoFounder;
        await prisma.raisedSolution.create({
          data: {
            failedStartupId: createdFailed.id,
            authorId: author.id,
            title: sol.title,
            description: sol.description,
            targetAudience: sol.targetAudience || null,
            differentiation: sol.differentiation || null,
            upvotesCount: sol.upvotesCount || 15,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${graveyardList.length} documented startup post-mortems with raised solutions.`);

  // 8. SEED CATEGORIES, REGIONS, TAGS & 57 AUTHORITATIVE PROBLEMS
  console.log('🌍 Seeding categories, regions, tags, and 57 authoritative worldwide problems...');
  const categoryNames = [
    'Environment/Climate',
    'Health & Disease',
    'Food & Water',
    'Agriculture & Farming',
    'Agriculture & Food',
    'Clean Energy',
    'Energy & Infrastructure',
    'Energy',
    'Education & Skills',
    'Education',
    'Economy & Inequality',
    'Poverty & Inequality',
    'Governance & Peace',
    'Technology & Innovation',
    'AI & Technology',
    'Cybersecurity',
    'Women & Social',
    'Business & Commerce',
    'Supply Chain & Logistics',
    'Transportation',
    'Waste Management',
    'Water & Sanitation',
    'Digital Access',
    'Rural Development',
    'Urban Planning & Housing',
    'Public Safety & Defense',
    'Other (Future Tech)',
  ];

  const categoryMap = new Map();
  for (const name of categoryNames) {
    const cat = await prisma.category.create({ data: { name } });
    categoryMap.set(name, cat.id);
  }

  const regionNames = [
    'Global',
    'Sub-Saharan Africa',
    'Africa',
    'South Asia',
    'Southeast Asia',
    'Latin America',
    'Europe',
    'North America',
    'Middle East',
    'East Asia',
    'Central Asia',
    'Australia',
    'Asia-Pacific',
  ];

  const regionMap = new Map();
  for (const name of regionNames) {
    const reg = await prisma.region.create({ data: { name } });
    regionMap.set(name, reg.id);
  }

  const tagMap = new Map();
  const getOrCreateTag = async (name) => {
    if (tagMap.has(name)) return tagMap.get(name);
    let tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name } });
    }
    tagMap.set(name, tag.id);
    return tag.id;
  };

  const createdProblems = [];

  for (const prob of realProblems) {
    const createdProb = await prisma.problem.create({
      data: {
        title: prob.title,
        description: prob.description,
        sourceUrl: prob.sourceUrl || null,
        impactLevel: prob.impactLevel || 8,
        createdBy: adminUser ? adminUser.id : null,
      },
    });
    createdProblems.push(createdProb);

    if (prob.categories) {
      for (const catName of prob.categories) {
        const catId = categoryMap.get(catName);
        if (catId) {
          await prisma.problemCategory.create({
            data: { problemId: createdProb.id, categoryId: catId },
          });
        }
      }
    }

    if (prob.regions) {
      for (const regName of prob.regions) {
        const regId = regionMap.get(regName);
        if (regId) {
          await prisma.problemRegion.create({
            data: { problemId: createdProb.id, regionId: regId },
          });
        }
      }
    }

    if (prob.tags) {
      for (const tagName of prob.tags) {
        const tagId = await getOrCreateTag(tagName);
        await prisma.problemTag.create({
          data: { problemId: createdProb.id, tagId },
        });
      }
    }
  }
  console.log(`✅ Seeded ${createdProblems.length} authoritative worldwide problem statements.`);

  // 9. SEED DEMO SOCIAL POSTS (Authored exclusively by demo accounts per Section 14)
  console.log('📝 Seeding community feed posts authored by demo presentation accounts...');
  const demoPosts = [
    {
      authorEmail: 'sarah.chen@aiagri.io',
      postType: 'UPDATE',
      title: 'Validating Cold Chain Spoilage Mitigation in Bihar',
      content: 'Reviewing the UN FAO report on 13.2% global food loss ($400B annual waste). We conducted farm-gate testing of solar-assisted evaporative pre-coolers with 25 tomato growers. Pre-cooling within 90 minutes of picking extended shelf-life by 4 days without grid electricity.',
      likesCount: 18,
      commentsCount: 3,
    },
    {
      authorEmail: 'marcus.dev@codeflow.dev',
      postType: 'ADVICE',
      title: 'Architecting Offline-First Edge Telemetry for Rural Agritech',
      content: 'When designing IoT telemetry for rural farms, assume cellular packet loss exceeds 40%. Use local SQLite buffering on low-power LoRaWAN gateways with exponential backoff synchronization to PostgreSQL once connectivity resumes.',
      likesCount: 24,
      commentsCount: 5,
    },
    {
      authorEmail: 'admin@startupz.com',
      postType: 'ANNOUNCEMENT',
      title: 'Startup India Seed Fund Scheme (SISFS) & BIRAC BIG Cohorts Open',
      content: 'Reminder to all early-stage hardware, biotech, and deeptech founders on StartupZ: applications for the Startup India Seed Fund Scheme (up to ₹50L) and BIRAC BIG (up to ₹50L non-dilutive) are actively reviewing proposals across national partner incubators.',
      likesCount: 35,
      commentsCount: 2,
    },
    {
      authorEmail: 'elena.investor@apexventures.vc',
      postType: 'ADVICE',
      title: 'Unit Economics and Hardware Standardization in ClimateTech',
      content: 'Reflecting on the Solyndra post-mortem in the Startup Graveyard: technological elegance cannot outrun commodity manufacturing cost curves. When evaluating battery and solar tech, prioritize compatibility with existing supply chains.',
      likesCount: 29,
      commentsCount: 4,
    },
    {
      authorEmail: 'dr.aravind@healthventures.in',
      postType: 'UPDATE',
      title: 'Clinical Diagnostics at the Primary Care Frontier',
      content: 'The ICMR data on rural pathology specimen degradation is sobering. Point-of-care automated microscopy (similar to SigTuple) and contactless biosignal monitoring (Dozee) are bridging the critical 100-mile gap to sub-district health centers.',
      likesCount: 21,
      commentsCount: 2,
    },
  ];

  const createdPosts = [];
  for (const dp of demoPosts) {
    const author = userMap.get(dp.authorEmail) || demoFounder;
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        postType: dp.postType,
        title: dp.title,
        content: dp.content,
        likesCount: dp.likesCount,
        commentsCount: dp.commentsCount,
      },
    });
    createdPosts.push(post);
  }
  console.log(`✅ Seeded ${createdPosts.length} community feed posts.`);

  // 10. SEED DEMO CONNECTIONS & SAVED ITEMS (Between demo accounts)
  console.log('🔗 Seeding demo account connections and saved items...');
  const demoUsers = [
    'sarah.chen@aiagri.io',
    'marcus.dev@codeflow.dev',
    'elena.investor@apexventures.vc',
    'admin@startupz.com',
    'dr.aravind@healthventures.in',
    'demo.founder@startupz.com',
    'demo.investor@startupz.com',
    'demo.mentor@startupz.com',
  ];

  for (let i = 0; i < demoUsers.length; i++) {
    for (let j = i + 1; j < demoUsers.length; j++) {
      const u1 = userMap.get(demoUsers[i]);
      const u2 = userMap.get(demoUsers[j]);
      if (u1 && u2) {
        try {
          await prisma.connection.create({
            data: {
              senderId: u1.id,
              receiverId: u2.id,
              status: 'ACCEPTED',
              note: 'Ecosystem collaboration on StartupZ',
            },
          });
        } catch { }
      }
    }
  }

  // Seed sample saved problems & startups for demo users
  for (const userEmail of ['sarah.chen@aiagri.io', 'demo.founder@startupz.com']) {
    const u = userMap.get(userEmail);
    if (u && createdProblems.length > 0) {
      for (const p of createdProblems.slice(0, 3)) {
        try {
          await prisma.savedItem.create({
            data: { userId: u.id, itemType: 'PROBLEM', itemId: p.id },
          });
        } catch { }
      }
    }
    if (u && opportunityList.length > 0) {
      try {
        await prisma.savedItem.create({
          data: { userId: u.id, itemType: 'OPPORTUNITY', itemId: opportunityList[0].id },
        });
      } catch { }
    }
  }

  // 11. SEED DEMO CONVERSATION & NOTIFICATIONS
  console.log('💬 Seeding demo walkthrough conversation & notifications...');
  const devUser = userMap.get('marcus.dev@codeflow.dev');
  const founderUser = userMap.get('sarah.chen@aiagri.io');

  if (devUser && founderUser) {
    const conv = await prisma.conversation.create({
      data: {
        participant1Id: devUser.id,
        participant2Id: founderUser.id,
        lastMessage: 'I reviewed the problem statement on post-harvest cold storage. Would love to prototype the edge gateway.',
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: devUser.id,
        receiverId: founderUser.id,
        content: 'Hi Sarah, saw your update on agricultural cold chain telemetry. Have you considered using LoRaWAN mesh nodes for farm clusters?',
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: founderUser.id,
        receiverId: devUser.id,
        content: 'Hi Marcus! Exactly what we need. Cellular coverage is patchy across our pilot cluster in Bihar. Let us schedule a sync.',
      },
    });
  }

  // Notifications for demo founder
  if (founderUser) {
    await prisma.notification.create({
      data: {
        userId: founderUser.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: 'New Candidate Application',
        message: 'Marcus Brody applied for Technical Lead on StartupZ.',
        link: '/opportunities',
      },
    });

    await prisma.notification.create({
      data: {
        userId: founderUser.id,
        type: 'SYSTEM',
        title: 'Verified Problem Added',
        message: 'A new UN-documented challenge in your sector has been published.',
        link: '/problems',
      },
    });
  }

  console.log('========================================================================');
  console.log('🎉 STARTUPZ REAL-WORLD DATABASE POPULATION COMPLETED SUCCESSFULLY!');
  console.log(`- Problems Documented: ${createdProblems.length} (UN, WHO, FAO, World Bank, NITI Aayog citations)`);
  console.log(`- Real Startups: ${startupMap.size} (DeHaat, Ninjacart, Ather, Recykal, SigTuple, Form Energy, etc.)`);
  console.log(`- Real Investors: ${investorList.length} (Peak XV, Omnivore, Blume, Accel, a16z, Lowercarbon, etc.)`);
  console.log(`- Ecosystem Mentors: ${mentorList.length} (Startup India MAARG, NITI AIM, IITMIC, YC Startup School)`);
  console.log(`- Real Opportunities: ${opportunityList.length} (SISFS, BIRAC BIG, NIDHI-PRAYAS, YC, AWS Activate)`);
  console.log(`- Failed Startups: ${graveyardList.length} (Theranos, WeWork, Better Place, Solyndra, Fast, etc.)`);
  console.log(`- Categories Seeded: ${categoryMap.size}`);
  console.log(`- Demo Presentation Accounts: ${userMap.size} (Tagged [Demo Account] with Password123!)`);
  console.log('========================================================================');
}

if (process.argv[1] && process.argv[1].includes('seed.js')) {
  main()
    .catch((err) => {
      console.error('❌ Seeding failed with error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
