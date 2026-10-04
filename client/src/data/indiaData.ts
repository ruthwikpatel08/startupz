/**
 * Comprehensive Indian Locations (States & Districts) and Premier Institutions (IITs, NITs, Private Universities, NIAT)
 */

export interface LocationItem {
  district: string;
  state: string;
  country: string;
  label: string;
}

// 28 States and 8 Union Territories with their primary districts
export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  Telangana: [
    'Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri', 'Khammam', 'Warangal', 'Karimnagar',
    'Nizamabad', 'Nalgonda', 'Mahabubnagar', 'Sangareddy', 'Siddipet', 'Suryapet',
    'Jagtial', 'Mancherial', 'Bhadradri Kothagudem', 'Kamareddy', 'Adilabad', 'Peddapalli',
    'Nagarkurnool', 'Wanaparthy', 'Jogulamba Gadwal', 'Medak', 'Rajanna Sircilla',
    'Jangaon', 'Yadadri Bhuvanagiri', 'Vikarabad', 'Jayashankar Bhupalpally', 'Mahabubabad'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada (NTR)', 'Guntur', 'Tirupati', 'Kurnool', 'Kakinada',
    'Nellore', 'Anantapur', 'Kadapa (YSR)', 'Chittoor', 'East Godavari (Rajahmundry)',
    'West Godavari (Bhimavaram)', 'Eluru', 'Srikakulam', 'Vizianagaram', 'Prakasam (Ongole)',
    'Nandyal', 'Annamayya', 'Sri Sathya Sai', 'Palnadu', 'Bapatla', 'Konaseema', 'Parvathipuram Manyam'
  ],
  Karnataka: [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru (Dakshina Kannada)',
    'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi',
    'Bidar', 'Raichur', 'Vijayapura', 'Kolar', 'Mandya', 'Hassan', 'Chikkamagaluru',
    'Uttara Kannada', 'Chitradurga', 'Bagalkote', 'Gadag', 'Haveri', 'Yadgir', 'Koppal', 'Chamarajanagar'
  ],
  Maharashtra: [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Thane', 'Nagpur', 'Nashik', 'Chhatrapati Sambhaji Nagar (Aurangabad)',
    'Navi Mumbai', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Jalgaon', 'Akola', 'Latur',
    'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Satara', 'Raigad', 'Ratnagiri', 'Sangli', 'Wardha', 'Yavatmal'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli (Trichy)', 'Salem', 'Tirunelveli',
    'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Kanchipuram',
    'Chengalpattu', 'Tiruvallur', 'Tiruppur', 'Cuddalore', 'Karur', 'Nagercoil (Kanyakumari)', 'Hosur (Krishnagiri)'
  ],
  'Delhi (NCT)': [
    'New Delhi', 'Central Delhi', 'South Delhi', 'South West Delhi', 'North Delhi',
    'North West Delhi', 'East Delhi', 'West Delhi', 'North East Delhi', 'Shahdara'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Noida (Gautam Buddha Nagar)', 'Greater Noida', 'Ghaziabad', 'Kanpur', 'Varanasi',
    'Prayagraj (Allahabad)', 'Agra', 'Meerut', 'Bareilly', 'Aligarh', 'Gorakhpur', 'Moradabad',
    'Saharanpur', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Ayodhya (Faizabad)', 'Firozabad'
  ],
  Gujarat: [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar',
    'Junagadh', 'Anand', 'Navsari', 'Morbi', 'Bharuch', 'Porbandar', 'Mehsana', 'Kutch'
  ],
  Kerala: [
    'Thiruvananthapuram', 'Ernakulam (Kochi)', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad',
    'Malappuram', 'Kannur', 'Kottayam', 'Alappuzha', 'Idukki', 'Pathanamthitta', 'Kasaragod', 'Wayanad'
  ],
  Rajasthan: [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar',
    'Sikar', 'Bharatpur', 'Pali', 'Sri Ganganagar', 'Barmer', 'Chittorgarh', 'Jhunjhunu'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Darjeeling', 'Siliguri',
    'Asansol (Paschim Bardhaman)', 'Durgapur', 'Hooghly', 'Nadia', 'Malda', 'Murshidabad', 'Purba Medinipur'
  ],
  Punjab: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali (SAS Nagar)',
    'Hoshiarpur', 'Pathankot', 'Moga', 'Firozpur', 'Kapurtala', 'Sangrur'
  ],
  Haryana: [
    'Gurugram (Gurgaon)', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
    'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Rewari'
  ],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna',
    'Ratlam', 'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena'
  ],
  Bihar: [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif (Nalanda)',
    'Arrah (Bhojpur)', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Samastipur', 'Motihari'
  ],
  Odisha: [
    'Bhubaneswar (Khurda)', 'Cuttack', 'Rourkela (Sundargarh)', 'Berhampur (Ganjam)', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada (Mayurbhanj)', 'Angul', 'Jharsuguda'
  ],
  Jharkhand: [
    'Ranchi', 'Jamshedpur (East Singhbhum)', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh',
    'Giridih', 'Ramgarh', 'Medininagar (Palamu)', 'Dumka'
  ],
  Assam: [
    'Guwahati (Kamrup Metro)', 'Dibrugarh', 'Silchar (Cachar)', 'Jorhat', 'Nagaon',
    'Tinsukia', 'Tezpur (Sonitpur)', 'Bongaigaon', 'Barpeta'
  ],
  Chhattisgarh: [
    'Raipur', 'Bhilai-Durg', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur'
  ],
  Uttarakhand: [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Nainital', 'Rishikesh', 'Udham Singh Nagar', 'Pithoragarh'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala (Kangra)', 'Mandi', 'Solan', 'Kullu', 'Hamirpur', 'Bilaspur', 'Una'
  ],
  'Jammu & Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Pulwama', 'Kathua', 'Budgam'
  ],
  Goa: [
    'North Goa (Panaji)', 'South Goa (Margao)', 'Vasco da Gama', 'Ponda', 'Mapusa'
  ],
  Chandigarh: ['Chandigarh (UT)'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  Ladakh: ['Leh', 'Kargil'],
};

// Flattened list for quick autocomplete and lookup
export const ALL_INDIAN_LOCATIONS: LocationItem[] = Object.entries(INDIAN_STATES_AND_DISTRICTS).flatMap(
  ([state, districts]) =>
    districts.map((district) => ({
      district,
      state,
      country: 'India',
      label: `${district}, ${state}, India`,
    }))
);

// Comprehensive list of Colleges & Universities
export const INDIAN_COLLEGES_AND_UNIVERSITIES: string[] = [
  // Advanced Technology Institutes
  'NIAT (National Institute of Advanced Technologies)',
  'Newton School of Technology (NST)',
  'Scaler School of Technology (Bengaluru)',
  'Plaksha University (Technology & AI)',
  'IIST (Indian Institute of Space Science and Technology)',
  'IISc Bangalore (Indian Institute of Science)',
  'C-DAC (Centre for Development of Advanced Computing)',

  // All 23 Indian Institutes of Technology (IITs)
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'IIT Kanpur',
  'IIT Kharagpur',
  'IIT Roorkee',
  'IIT Guwahati',
  'IIT Hyderabad',
  'IIT BHU (Varanasi)',
  'IIT Indore',
  'IIT Gandhinagar',
  'IIT Bhubaneswar',
  'IIT Patna',
  'IIT Ropar',
  'IIT Mandi',
  'IIT Jodhpur',
  'IIT Tirupati',
  'IIT Palakkad',
  'IIT Goa',
  'IIT Dharwad',
  'IIT Bhilai',
  'IIT Jammu',
  'IIT (ISM) Dhanbad',

  // Top National Institutes of Technology (NITs)
  'NIT Trichy',
  'NIT Warangal',
  'NIT Surathkal (Karnataka)',
  'NIT Calicut',
  'NIT Rourkela',
  'NIT Kurukshetra',
  'VNIT Nagpur',
  'SVNIT Surat',
  'MNIT Jaipur',
  'MNNIT Allahabad',
  'NIT Durgapur',
  'NIT Silchar',
  'NIT Jalandhar',
  'NIT Meghalaya',
  'NIT Raipur',
  'NIT Patna',
  'MANIT Bhopal',
  'NIT Srinagar',
  'NIT Goa',
  'NIT Jamshedpur',
  'NIT Hamirpur',

  // Indian Institutes of Information Technology (IIITs)
  'IIIT Hyderabad',
  'IIIT Bangalore',
  'IIIT Delhi',
  'IIIT Allahabad',
  'IIIT Gwalior',
  'IIITDM Jabalpur',
  'IIITDM Kancheepuram',
  'IIIT Lucknow',
  'IIIT Sri City',
  'IIIT Vadodara',
  'IIIT Pune',
  'IIIT Kota',

  // BITS Pilani Campuses
  'BITS Pilani (Pilani Campus)',
  'BITS Pilani (Goa Campus)',
  'BITS Pilani (Hyderabad Campus)',

  // Premier Private Universities
  'VIT (Vellore Institute of Technology - Vellore)',
  'VIT Chennai',
  'VIT-AP (Andhra Pradesh)',
  'VIT Bhopal',
  'SRM Institute of Science and Technology (Kattankulathur)',
  'SRM Ramapuram (Chennai)',
  'SRM University AP',
  'Manipal Academy of Higher Education (MAHE Manipal)',
  'MIT Manipal (Manipal Institute of Technology)',
  'Manipal University Bengaluru',
  'Thapar Institute of Engineering & Technology (TIET Patiala)',
  'Shiv Nadar University (SNU Greater Noida)',
  'Ashoka University (Sonipat)',
  'Amity University (Noida)',
  'Amity University (Gurugram)',
  'Amity University (Jaipur)',
  'Amity University (Mumbai)',
  'Lovely Professional University (LPU Punjab)',
  'Chandigarh University (CU Mohali)',
  'Kalinga Institute of Industrial Technology (KIIT Bhubaneswar)',
  'Symbiosis International University (SIU Pune)',
  'Bennett University (Greater Noida)',
  'PES University (Bengaluru)',
  'UPES Dehradun',
  'BML Munjal University',
  'Chitkara University',
  'Nirma University (Ahmedabad)',
  'Dhirubhai Ambani Institute (DA-IICT Gandhinagar)',

  // Top State & City Engineering Colleges
  'RV College of Engineering (RVCE Bengaluru)',
  'BMS College of Engineering (BMSCE Bengaluru)',
  'MS Ramaiah Institute of Technology (MSRIT Bengaluru)',
  'College of Engineering Pune (COEP)',
  'VJTI Mumbai',
  'PSG College of Technology (Coimbatore)',
  'College of Engineering Guindy (Anna University Chennai)',
  'CBIT Hyderabad (Chaitanya Bharathi Institute of Technology)',
  'VNR VJIET (Hyderabad)',
  'JNTU Hyderabad (College of Engineering)',
  'Vasavi College of Engineering (Hyderabad)',
  'Osmania University College of Engineering (OU Hyderabad)',
  'AU College of Engineering (Visakhapatnam)',
  'Delhi Technological University (DTU Delhi)',
  'Netaji Subhas University of Technology (NSUT Delhi)',
  'Jadavpur University (Kolkata)',
  'HBTU Kanpur',
];

/**
 * Intelligent location resolver that takes district or state or alias
 * and resolves it to standard formatted label with State and District.
 */
export function resolveIndianLocation(query: string): LocationItem | null {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();

  // 1. Direct match in flattened district list
  const match = ALL_INDIAN_LOCATIONS.find(
    (loc) =>
      loc.district.toLowerCase() === q ||
      loc.district.toLowerCase().includes(q) ||
      q.includes(loc.district.toLowerCase())
  );
  if (match) return match;

  // 2. Direct match on state name
  for (const [state, districts] of Object.entries(INDIAN_STATES_AND_DISTRICTS)) {
    if (state.toLowerCase().includes(q) || q.includes(state.toLowerCase())) {
      return {
        district: districts[0] || state,
        state,
        country: 'India',
        label: `${state}, India`,
      };
    }
  }

  return null;
}

/**
 * Search locations for autocomplete suggestions
 */
export function searchLocations(query: string, maxResults = 8): LocationItem[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  const results: LocationItem[] = [];
  for (const loc of ALL_INDIAN_LOCATIONS) {
    if (
      loc.district.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q) ||
      loc.label.toLowerCase().includes(q)
    ) {
      results.push(loc);
      if (results.length >= maxResults) break;
    }
  }

  // Also include general States if matched
  if (results.length < maxResults) {
    for (const [state, districts] of Object.entries(INDIAN_STATES_AND_DISTRICTS)) {
      if (state.toLowerCase().includes(q) && !results.some((r) => r.state === state)) {
        results.push({
          district: districts[0],
          state,
          country: 'India',
          label: `${state}, India`,
        });
        if (results.length >= maxResults) break;
      }
    }
  }

  return results;
}

export interface CollegeItem {
  name: string;
  category: string;
  city?: string;
  state?: string;
}

/**
 * Search colleges for autocomplete suggestions
 */
export function searchColleges(query: string, maxResults = 8): CollegeItem[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  const results: CollegeItem[] = [];
  for (const college of INDIAN_COLLEGES_AND_UNIVERSITIES) {
    if (college.toLowerCase().includes(q)) {
      let category = 'University';
      const low = college.toLowerCase();
      if (low.includes('niat')) category = 'NIAT Tech';
      else if (low.includes('iit') || low.includes('indian institute of technology')) category = 'IIT';
      else if (low.includes('nit') || low.includes('national institute of technology')) category = 'NIT';
      else if (low.includes('iiit')) category = 'IIIT';
      else if (low.includes('bits')) category = 'BITS';
      else if (low.includes('vit') || low.includes('srm') || low.includes('manipal') || low.includes('amity') || low.includes('thapar')) category = 'Private Univ';

      results.push({ name: college, category });
      if (results.length >= maxResults) break;
    }
  }
  return results;
}

// Typo & Misspelling Correction Dictionary for AI Scout
export const TYPO_DICTIONARY: Record<string, string> = {
  // Districts & Locations
  wrangal: 'Warangal',
  warngal: 'Warangal',
  warnagal: 'Warangal',
  hydrabad: 'Hyderabad',
  hydrabaad: 'Hyderabad',
  hyd: 'Hyderabad',
  banglore: 'Bengaluru',
  benguluru: 'Bengaluru',
  bengalore: 'Bengaluru',
  blr: 'Bengaluru',
  chenai: 'Chennai',
  chennay: 'Chennai',
  mumbay: 'Mumbai',
  bombay: 'Mumbai',
  delhy: 'Delhi',
  dilli: 'Delhi',
  khamam: 'Khammam',
  khamm: 'Khammam',
  kolkatta: 'Kolkata',
  calcutta: 'Kolkata',
  puna: 'Pune',
  poona: 'Pune',
  visakapatnam: 'Visakhapatnam',
  vizag: 'Visakhapatnam',
  coimbator: 'Coimbatore',
  coimbatur: 'Coimbatore',
  ernakulam: 'Ernakulam',
  kochi: 'Ernakulam',
  cochin: 'Ernakulam',
  telengana: 'Telangana',
  andhra: 'Andhra Pradesh',
  karnatka: 'Karnataka',
  maharastra: 'Maharashtra',
  tamilnadu: 'Tamil Nadu',
  up: 'Uttar Pradesh',

  // Professions & Roles
  stuent: 'Student',
  studnt: 'Student',
  studet: 'Student',
  collegian: 'Student',
  saleman: 'Salesman',
  salesmn: 'Salesman',
  salsman: 'Salesman',
  salesperson: 'Salesman',
  foundr: 'Founder',
  funder: 'Founder',
  foudner: 'Founder',
  cofoundr: 'Co-Founder',
  cofunder: 'Co-Founder',
  devloper: 'Developer',
  develper: 'Developer',
  devlpor: 'Developer',
  coder: 'Developer',
  desgner: 'Designer',
  desiner: 'Designer',
  uiux: 'Designer',
  investr: 'Investor',
  invstr: 'Investor',
  mntr: 'Mentor',
  mentr: 'Mentor',

  // Colleges & Tech Institutes
  nat: 'NIAT',
  naat: 'NIAT',
  itt: 'IIT',
  iits: 'IIT',
  nitt: 'NIT',
  nits: 'NIT',
  bit: 'BITS Pilani',
  bits: 'BITS Pilani',
  vt: 'VIT',
  vitt: 'VIT',
  srmm: 'SRM',
};

/**
 * Adjusts query by correcting common spelling mistakes and typos
 */
export function fuzzyAdjustQuery(text: string): { adjustedText: string; corrections: { from: string; to: string }[] } {
  if (!text || !text.trim()) return { adjustedText: text, corrections: [] };

  const words = text.split(/\s+/);
  const corrections: { from: string; to: string }[] = [];

  const adjustedWords = words.map((rawWord) => {
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (TYPO_DICTIONARY[cleanWord]) {
      const match = TYPO_DICTIONARY[cleanWord];
      corrections.push({ from: rawWord, to: match });
      return match;
    }
    return rawWord;
  });

  return {
    adjustedText: adjustedWords.join(' '),
    corrections,
  };
}
