export type StartupStage = 'Idea' | 'Validation' | 'MVP' | 'Early Revenue' | 'Growth' | 'Fundraising' | string;
export type UserRole = 'FOUNDER' | 'COFOUNDER' | 'INVESTOR' | 'MENTOR' | 'DEVELOPER' | 'DESIGNER' | 'MARKETER' | 'ADMIN' | string;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  verificationBadge?: string | null;
  isSuspended: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
  profile?: Profile;
  startups?: Startup[];
  investorProfile?: Investor;
  mentorProfile?: Mentor;
  matchScore?: number;
  matchPercentage?: number;
  matchReasons?: string[];
  matchExplanation?: string;
  recommendationReason?: string;
  aiExplanation?: string;
  keySynergies?: string[];
  connectionStatus?: { status: string; isSender: boolean; connectionId: string } | null;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
  avatar?: string | null;
  education?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  skills?: string | null;
  startupInterests?: string | null;
  industries?: string | null;
  preferredRole?: string | null;
  availability?: string | null;
  startupExperience?: string | null;
  achievements?: string | null;
  openTo?: string | null;
  profileCompletion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StartupMember {
  id: string;
  startupId: string;
  userId: string;
  user?: User;
  role: string;
  joinedAt: string;
}

export interface Startup {
  id: string;
  founderId: string;
  founder?: User;
  name: string;
  logo?: string | null;
  oneLineDescription: string;
  problem: string;
  solution: string;
  targetCustomers?: string | null;
  industry: string;
  businessModel?: string | null;
  stage: StartupStage;
  location?: string | null;
  requiredSkills?: string | null;
  fundingStatus?: string | null;
  fundingRequired?: string | null;
  currentTraction?: string | null;
  website?: string | null;
  demoLink?: string | null;
  pitchDeckUrl?: string | null;
  images?: string | null;
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE' | string;
  isConfidential: boolean;
  isVerified: boolean;
  likesCount: number;
  viewsCount: number;
  followersCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowed?: boolean;
  teamSize?: number;
  recommendationReason?: string;
  createdAt: string;
  updatedAt?: string;
  members?: StartupMember[];
  opportunities?: StartupOpportunity[];
  posts?: Post[];
}

export interface StartupOpportunity {
  id: string;
  startupId: string;
  startup?: Startup;
  role: string;
  requiredSkills: string;
  commitment: string;
  compensation: string;
  location: string;
  workplaceType: string;
  description: string;
  status: 'OPEN' | 'CLOSED' | string;
  createdAt: string;
  updatedAt?: string;
  hasApplied?: boolean;
  isSaved?: boolean;
  applications?: OpportunityApplication[];
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  opportunity?: StartupOpportunity;
  applicantId: string;
  applicant?: User;
  coverLetter?: string | null;
  resumeUrl?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  createdAt: string;
}

export interface Connection {
  id: string;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  note?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StartupProposal {
  id: string;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  ideaTitle: string;
  pitchDescription: string;
  proposedRole: string;
  proposedEquity: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  updatedAt?: string;
}

export interface VideoMeeting {
  id: string;
  hostId: string;
  host?: User;
  guestId: string;
  guest?: User;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  roomCode: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FailedStartup {
  id: string;
  name: string;
  industry: string;
  peakFunding: string;
  yearsActive: string;
  logo?: string | null;
  summary: string;
  whyItFailed: string;
  unsolvedProblem: string;
  lessonsLearned: string;
  solutionsCount: number;
  createdAt: string;
  updatedAt?: string;
  solutions?: RaisedSolution[];
}

export interface RaisedSolution {
  id: string;
  failedStartupId: string;
  failedStartup?: FailedStartup;
  authorId: string;
  author?: User;
  title: string;
  description: string;
  targetAudience?: string | null;
  differentiation?: string | null;
  upvotesCount: number;
  startupId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author?: User;
  startupId?: string | null;
  startup?: Startup | null;
  postType: 'UPDATE' | 'LAUNCH' | 'MILESTONE' | 'FUNDING' | 'HIRING' | 'COFOUNDER' | 'ADVICE' | 'ACHIEVEMENT' | 'EVENT' | string;
  title?: string | null;
  content: string;
  images?: string | null;
  links?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt?: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author?: User;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Like {
  id: string;
  userId: string;
  postId?: string | null;
  startupId?: string | null;
  createdAt: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  itemType: 'STARTUP' | 'USER' | 'INVESTOR' | 'OPPORTUNITY' | 'POST' | 'PROBLEM' | string;
  itemId: string;
  createdAt: string;
  details?: any;
  data?: any;
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant?: User;
  lastMessage?: string | null;
  lastMessageAt: string;
  unreadCount?: number;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Investor {
  id: string;
  userId: string;
  user?: User;
  organization: string;
  investorType: string;
  industries: string;
  preferredStages: string;
  minCheckSize?: string | null;
  maxCheckSize?: string | null;
  location: string;
  website?: string | null;
  portfolio?: string | null;
  about: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  isSaved?: boolean;
}

export interface Mentor {
  id: string;
  userId: string;
  user?: User;
  expertise: string;
  industries: string;
  yearsExperience: number;
  availableHours: string;
  mentoringTopics: string;
  about: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  requests?: MentorshipRequest[];
}

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  mentor?: Mentor;
  founderId: string;
  founder?: User;
  mentorUserId: string;
  mentorUser?: User;
  topic: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId?: string | null;
  sender?: User | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporter?: User;
  targetType: 'USER' | 'POST' | 'STARTUP' | 'INVESTOR';
  targetId: string;
  reason: string;
  description?: string | null;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  user?: User;
  startupId?: string | null;
  startup?: Startup | null;
  type: 'FOUNDER' | 'STARTUP' | 'INVESTOR' | 'MENTOR';
  businessDetails: string;
  website?: string | null;
  documentUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string | null;
  createdAt: string;
}

export interface ProblemCategory {
  id: string;
  name: string;
}

export interface ProblemRegion {
  id: string;
  name: string;
}

export interface ProblemTag {
  id: string;
  name: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string | null;
  source_url?: string | null;
  impactLevel: number;
  impact_level?: number;
  categories: string[];
  regions: string[];
  tags: string[];
  categoryIds?: string[];
  regionIds?: string[];
  tagIds?: string[];
  isSaved?: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  creator?: {
    id: string;
    email: string;
    fullName?: string;
    avatar?: string | null;
  } | null;
}

export interface AISolutionIdea {
  title: string;
  description: string;
}

export interface AISolutionsResult {
  ideas: AISolutionIdea[];
  needed_skills: string[];
}

export interface AIMatchResult {
  matchScore: number;
  reason: string;
}

export interface AICategorizeResult {
  categories: string[];
  tags: string[];
}

