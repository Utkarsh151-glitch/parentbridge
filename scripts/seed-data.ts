/* Synthetic demo data — every family and parent here is fictional. */

export type AmbSeed = {
  code: string;
  name: string;
  child_name: string;
  child_year: number;
  university: string;
  campus_city: string;
  district: string;
  state: "Andhra Pradesh" | "Telangana";
  languages: string[];
  bio: string;
  active?: boolean;
  consent_given?: boolean;
  calls_this_week?: number;
};

const CDU = "Chaitanya (Deemed to be University)";
const ADU = "Aurora Deemed University";
const NRI = "NRI University";
const ANU = "Annamacharya University";
const BIU = "BEST Innovation University";
const TS = "Telangana" as const;
const AP = "Andhra Pradesh" as const;

export const AMBASSADORS: AmbSeed[] = [
  { code: "amb_01", name: "Srinivas Rao Kandukuri", child_name: "Harika", child_year: 2, university: ADU, campus_city: "Hyderabad", district: "Hyderabad", state: TS, languages: ["te", "hi", "en"],
    bio: "My daughter Harika is in 2nd year. I also asked 'is the programme a college or a coaching centre?'. I went to the campus, saw her classes and her university ID card, then decided. Happy to tell you exactly what I checked." },
  { code: "amb_02", name: "Ayesha Begum", child_name: "Sameer", child_year: 1, university: CDU, campus_city: "Hyderabad", district: "Hyderabad", state: TS, languages: ["hi", "te", "en"],
    bio: "Mera beta Sameer first year mein hai. Fees do jagah jaati hai, yeh sun ke mujhe bhi shak hua tha — counsellor ne dono receipts samjhaye. Hostel aur khana maine khud jaa ke dekha." },
  { code: "amb_03", name: "Venkata Lakshmi Pothula", child_name: "Pranay", child_year: 3, university: CDU, campus_city: "Hyderabad", district: "Hyderabad", state: TS, languages: ["te", "en"],
    bio: "Pranay is in 3rd year. Relatives said a private university degree has no value, so we checked the university's approvals ourselves. I tell parents honestly that placements are not proven yet — I share what he builds every week." },
  { code: "amb_04", name: "Raghavendra Reddy Bommu", child_name: "Sindhu", child_year: 2, university: ADU, campus_city: "Hyderabad", district: "Rangareddy", state: TS, languages: ["te", "en"],
    bio: "Daughter Sindhu, 2nd year. Hostel safety was my biggest fear — I visited once in the evening, met the warden and saw the CCTV. We live near Shamshabad, so I understand travel worries too." },
  { code: "amb_05", name: "Padmaja Gundlapalli", child_name: "Rohit", child_year: 1, university: CDU, campus_city: "Hyderabad", district: "Rangareddy", state: TS, languages: ["te", "hi", "en"], calls_this_week: 3,
    bio: "Rohit started this year. ₹3 lakh a year felt too much for us; we compared it with a local EAMCET seat before deciding. I can share how we planned the money." },
  { code: "amb_06", name: "Nageswara Rao Tummala", child_name: "Sai Kiran", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "Guntur", state: AP, languages: ["te", "en"],
    bio: "Farmer from the Tenali side. Like you, I thought 'the programme is not a college, so who gives the degree?'. I asked the university office directly — the B.Tech is from the university. Sai Kiran is in 2nd year now." },
  { code: "amb_07", name: "Lakshmi Prasanna Kommineni", child_name: "Bhavana", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "Guntur", state: AP, languages: ["te", "en"],
    bio: "My daughter Bhavana is in 2nd year at NRI. I was worried the degree was distance mode — she attends regular full-time classes every day. My cousin also said private colleges don't place; I tell parents what I have seen, not promises." },
  { code: "amb_08", name: "Ramesh Chowdary Nallapati", child_name: "Vamsi", child_year: 3, university: NRI, campus_city: "Vijayawada", district: "Guntur", state: AP, languages: ["te", "hi", "en"],
    bio: "Vamsi is in 3rd year. Paying fees to two places confused me — the university fee and provider fee come with separate receipts and I keep both in one file. Happy to show other parents how it works." },
  { code: "amb_09", name: "Durga Bhavani Vemuri", child_name: "Teja", child_year: 1, university: NRI, campus_city: "Vijayawada", district: "NTR (Vijayawada)", state: AP, languages: ["te", "en"],
    bio: "Teja just finished his first semester. As a mother I was scared about hostel food and safety; the campus is in our own city so he comes home on Sundays." },
  { code: "amb_10", name: "Koteswara Rao Pinnamaneni", child_name: "Keerthi", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "NTR (Vijayawada)", state: AP, languages: ["te", "en"],
    bio: "Retired bank employee. I read every line of the fee structure and was not convinced until I understood which part goes to the university and which to the programme provider. Keerthi codes daily now. I answer honestly, including what is not known yet." },
  { code: "amb_11", name: "Saleem Shaik", child_name: "Ayaan", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "NTR (Vijayawada)", state: AP, languages: ["te", "hi", "en"],
    bio: "Ayaan, 2nd year. Relatives asked 'the first batch hasn't passed out, how can you trust it?'. That is true and I say so — we decided based on what he learns every week." },
  { code: "amb_12", name: "Anuradha Yarlagadda", child_name: "Charan", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "Krishna", state: AP, languages: ["te", "en"],
    bio: "We are from Machilipatnam, about 70 km from the campus. Distance was my worry and I also doubted whether the programme is a real college. Charan manages well in the hostel now." },
  { code: "amb_13", name: "Appala Naidu Bonthu", child_name: "Mounika", child_year: 2, university: ADU, campus_city: "Hyderabad", district: "Visakhapatnam", state: AP, languages: ["te", "en"],
    bio: "From Gajuwaka. Sending my daughter 600 km away to Hyderabad was hard. Hostel safety and distance were our doubts; I can tell you how we handled them." },
  { code: "amb_14", name: "Sujatha Varma Datla", child_name: "Akhil", child_year: 3, university: CDU, campus_city: "Hyderabad", district: "Visakhapatnam", state: AP, languages: ["te", "hi", "en"],
    bio: "Akhil, 3rd year. Our neighbour's son from a big engineering college is still searching for a job, so I was sceptical of every college. I share what the training looks like day to day — no promises." },
  { code: "amb_15", name: "Mallesham Gajula", child_name: "Shiva", child_year: 2, university: CDU, campus_city: "Hyderabad", district: "Warangal", state: TS, languages: ["te", "en"],
    bio: "Shiva is the first engineer in our weaver family. ₹2 lakh a year was big for us and we took an education loan. I can explain how we thought about the money." },
  { code: "amb_16", name: "Swapna Rani Erra", child_name: "Deekshitha", child_year: 1, university: CDU, campus_city: "Hyderabad", district: "Warangal", state: TS, languages: ["te", "en"], active: false,
    bio: "Mother of Deekshitha, 1st year. I asked twice whether the degree is valid for government jobs and higher studies, and verified the answers with the university." },
  { code: "amb_17", name: "Thirupathi Goud Ponnam", child_name: "Nikhil", child_year: 2, university: ADU, campus_city: "Hyderabad", district: "Karimnagar", state: TS, languages: ["te", "en"],
    bio: "Nikhil's cousin works in TCS and warned us that private colleges don't place. We visited the campus and spoke to seniors before deciding. I say clearly: placements are not proven yet." },
  { code: "amb_18", name: "Rajitha Kodam", child_name: "Sravya", child_year: 1, university: CDU, campus_city: "Hyderabad", district: "Karimnagar", state: TS, languages: ["te", "en"],
    bio: "Daughter Sravya, 1st year. The hostel and travel from Karimnagar were my doubts. I can tell you what the first months were really like." },
  { code: "amb_19", name: "Venkateswarlu Bandi", child_name: "Gopi", child_year: 2, university: NRI, campus_city: "Vijayawada", district: "Khammam", state: TS, languages: ["te", "en"],
    bio: "From Kothagudem. Gopi studies at NRI in Vijayawada; distance and money were our worries. At first I also thought the programme was just a coaching centre." },
  { code: "amb_20", name: "Kavitha Thota", child_name: "Harshini", child_year: 3, university: ADU, campus_city: "Hyderabad", district: "Khammam", state: TS, languages: ["te", "hi", "en"], consent_given: false,
    bio: "Harshini, 3rd year. We paid in two parts and the two receipts confused me too. I'll explain how the payments worked for us." },
  { code: "amb_21", name: "Subba Reddy Allam", child_name: "Lokesh", child_year: 2, university: ANU, campus_city: "Rajampet", district: "Nellore", state: AP, languages: ["te", "en"],
    bio: "Lokesh, 2nd year at Annamacharya. We doubted whether a campus near a small town can teach the latest technology. I show parents his weekly projects." },
  { code: "amb_22", name: "Revathi Mekala", child_name: "Divya", child_year: 1, university: NRI, campus_city: "Vijayawada", district: "Nellore", state: AP, languages: ["te", "en"],
    bio: "Mother of Divya. Hostel safety for a girl was my main fear, so I went and checked the hostel myself before she joined. Happy to talk mother to mother." },
  { code: "amb_23", name: "Murugan Selvaraj", child_name: "Karthik", child_year: 2, university: ANU, campus_city: "Rajampet", district: "Tirupati", state: AP, languages: ["ta", "te", "en"],
    bio: "Tamil family settled in Tirupati. Karthik is in 2nd year. I also thought 'the programme is not a college' until I saw the university admission letter in his name. I can speak Tamil or Telugu." },
  { code: "amb_24", name: "Hemalatha Chittem", child_name: "Yashwanth", child_year: 1, university: ANU, campus_city: "Rajampet", district: "Tirupati", state: AP, languages: ["te", "en"],
    bio: "Yashwanth, 1st year. Price was our doubt — ₹2 lakh is big for a family like ours. We spoke to the counsellor about the payment plan before deciding." },
  { code: "amb_25", name: "Basavaraj Patil", child_name: "Sneha", child_year: 2, university: BIU, campus_city: "Anantapur", district: "Kurnool", state: AP, languages: ["kn", "te", "en"],
    bio: "Kannada family from Adoni. Sneha studies at BEST Innovation University. I worried the degree would not be recognised, so we checked the university's approvals before joining. I speak Kannada and Telugu." },
];

// ─── Lead generation banks ────────────────────────────────────────────────────

export const NAMES = {
  te: {
    parentMale: ["Venkata Ramana", "Srinivasa Rao", "Nageswara Rao", "Suresh", "Ramesh", "Prasad", "Murali Krishna", "Bhaskar", "Chandrasekhar", "Hari Babu", "Satyanarayana", "Raju", "Krishna Mohan", "Anjaneyulu", "Ravi Kumar", "Yadagiri", "Mallaiah", "Sambasiva Rao", "Rambabu", "Narasimha"],
    parentFemale: ["Lakshmi", "Padmavathi", "Anitha", "Kalyani", "Rajeswari", "Sailaja", "Sridevi", "Madhavi", "Vijaya", "Saraswathi", "Aruna", "Jyothi", "Uma", "Swarupa", "Bhagya"],
    surnames: ["Kondapalli", "Gadde", "Vemula", "Bandaru", "Kotha", "Pasupuleti", "Chinta", "Dasari", "Mandava", "Nalla", "Peddi", "Ravuri", "Tadikonda", "Uppala", "Yerra", "Gorantla", "Jampani", "Kancharla", "Madala", "Bollineni", "Gutta", "Karri", "Lingala", "Mutyala", "Sanaka"],
    studentMale: ["Sai Teja", "Harsha Vardhan", "Karthik", "Rohith", "Manikanta", "Akhil", "Vamsi Krishna", "Charan", "Yashwanth", "Hemanth", "Praveen", "Sandeep", "Abhiram", "Lokesh", "Jaswanth", "Tarun", "Sathvik", "Rishi"],
    studentFemale: ["Lakshmi Prasanna", "Sravani", "Bhavana", "Deepika", "Sindhu", "Tejaswini", "Navya", "Keerthana", "Sowmya", "Harika", "Pooja", "Manasa", "Likitha", "Varshini", "Hasini"],
  },
  hi: {
    parentMale: ["Mohammed Rafi", "Syed Imran", "Abdul Kareem", "Rajesh", "Mohammed Ismail", "Anil"],
    parentFemale: ["Farhana Begum", "Sunita", "Nusrat Jahan", "Rekha"],
    surnames: ["Khan", "Siddiqui", "Agarwal", "Sharma", "Qureshi", "Jain"],
    studentMale: ["Faizan", "Rehan", "Aditya", "Arjun", "Zaid"],
    studentFemale: ["Arshiya", "Zoya", "Priya", "Sana", "Ananya"],
  },
  ta: {
    parentMale: ["Selvam", "Murugesan", "Ravi Shankar"],
    parentFemale: ["Kamala Devi", "Meenakshi"],
    surnames: ["Murugan", "Rajendran", "Subramanian"],
    studentMale: ["Arun", "Vignesh"],
    studentFemale: ["Divya", "Keerthana"],
  },
  kn: {
    parentMale: ["Mahesh", "Shivakumar", "Nagaraj"],
    parentFemale: ["Shilpa", "Savitha"],
    surnames: ["Gowda", "Patil", "Hegde"],
    studentMale: ["Prajwal", "Darshan"],
    studentFemale: ["Ananya", "Spoorthi"],
  },
};

// Where seeded families live: district_key → number of leads (sums to 400)
export const LEAD_DISTRICTS: Record<string, number> = {
  hyderabad: 50, rangareddy: 40, guntur: 45, krishna: 45, visakhapatnam: 40, warangal: 30, karimnagar: 20,
  khammam: 20, nellore: 25, chittoor: 25, kurnool: 20, anantapur: 15, kadapa: 10, east_godavari: 10,
  nizamabad: 3, mahabubnagar: 2,
};

export const UNI_PREF: Record<string, Array<[string, number]>> = {
  ts: [[CDU, 0.45], [ADU, 0.45], [NRI, 0.1]],
  coastal: [[NRI, 0.75], [CDU, 0.1], [ADU, 0.15]],
  vizag: [[ADU, 0.4], [NRI, 0.4], [CDU, 0.2]],
  south: [[ANU, 0.7], [NRI, 0.2], [BIU, 0.1]],
  rayalaseema: [[BIU, 0.7], [ANU, 0.15], [CDU, 0.15]],
};
export const REGION: Record<string, keyof typeof UNI_PREF> = {
  hyderabad: "ts", rangareddy: "ts", warangal: "ts", karimnagar: "ts", nizamabad: "ts", mahabubnagar: "ts",
  khammam: "coastal", guntur: "coastal", krishna: "coastal", east_godavari: "coastal",
  visakhapatnam: "vizag", nellore: "south", chittoor: "south", kadapa: "south", kurnool: "rayalaseema", anantapur: "rayalaseema",
};

// Approx road km from home district to each campus city
export const KM: Record<string, Record<string, number>> = {
  guntur: { Hyderabad: 270, Vijayawada: 35, Rajampet: 380, Anantapur: 420 },
  krishna: { Hyderabad: 275, Vijayawada: 15, Rajampet: 410, Anantapur: 450 },
  visakhapatnam: { Hyderabad: 620, Vijayawada: 350, Rajampet: 700, Anantapur: 760 },
  hyderabad: { Hyderabad: 15, Vijayawada: 275, Rajampet: 420, Anantapur: 360 },
  rangareddy: { Hyderabad: 25, Vijayawada: 290, Rajampet: 410, Anantapur: 340 },
  warangal: { Hyderabad: 145, Vijayawada: 240, Rajampet: 560, Anantapur: 500 },
  karimnagar: { Hyderabad: 165, Vijayawada: 360, Rajampet: 580, Anantapur: 520 },
  khammam: { Hyderabad: 200, Vijayawada: 120, Rajampet: 520, Anantapur: 560 },
  nellore: { Hyderabad: 470, Vijayawada: 270, Rajampet: 160, Anantapur: 300 },
  chittoor: { Hyderabad: 560, Vijayawada: 400, Rajampet: 100, Anantapur: 260 },
  kurnool: { Hyderabad: 215, Vijayawada: 350, Rajampet: 230, Anantapur: 150 },
  anantapur: { Hyderabad: 360, Vijayawada: 480, Rajampet: 210, Anantapur: 10 },
  kadapa: { Hyderabad: 410, Vijayawada: 360, Rajampet: 55, Anantapur: 160 },
  east_godavari: { Hyderabad: 460, Vijayawada: 160, Rajampet: 560, Anantapur: 620 },
  nizamabad: { Hyderabad: 175, Vijayawada: 420, Rajampet: 600, Anantapur: 520 },
  mahabubnagar: { Hyderabad: 100, Vijayawada: 340, Rajampet: 330, Anantapur: 260 },
};

// Doubt category weights for generated notes
export const DOUBT_WEIGHTS: Array<[string, number]> = [
  ["trust_not_a_college", 0.28], ["placement", 0.24], ["two_fee_payees", 0.2], ["degree_validity", 0.2],
  ["price", 0.2], ["hostel_safety", 0.1], ["distance", 0.1], ["other", 0.06],
];

/* Placeholders: {fee} lakh, {uni}, {city} campus city, {km}, {rel} relative, {who} Father/Mother */
export const NOTE_BANK: Record<string, { te: string[]; hi: string[]; en: string[] }> = {
  trust_not_a_college: {
    te: [
      "{who} asked twice 'idi college aa leka coaching centre aa?'.",
      "{who}: 'ee course ante enti, degree evaru istaru?' — confused between the programme and {uni}.",
      "{rel} told them the programme is only an institute, not a real university; {who} repeated this in the call.",
      "అమ్మ గారు 'ఇది కాలేజీనా, కోచింగా?' అని రెండు సార్లు అడిగారు.",
    ],
    hi: ["{who} ne poocha 'ye course college hai ya coaching? Degree kiske naam se milegi?'.", "{rel} ne bola ye course sirf ek institute hai, university nahi."],
    en: ["{who} not convinced the programme is part of a real B.Tech — 'it is not a college, right?'.", "Parents never heard of the programme before the admission process; searched online and found only ads, so trust is low."],
  },
  degree_validity: {
    te: [
      "{who} worried degree is distance mode. Wants proof it is a regular B.Tech.",
      "{who}: 'degree certificate lo the programme peru untunda?' Worried how the certificate will look.",
      "Cousin said deemed university degrees are not accepted everywhere; {who} is now doubtful.",
    ],
    hi: ["{who} worried ki degree distance mode ki toh nahi hai.", "{who} ne poocha kya {uni} ki degree sarkari naukri aur MS abroad ke liye valid hai."],
    en: ["Asked if the B.Tech from {uni} is valid for government jobs and MS abroad.", "{who} worried degree is distance mode. Wants proof it is a regular B.Tech."],
  },
  two_fee_payees: {
    te: [
      "Asked twice who receives the ₹{fee}L.",
      "{who}: 'university ki okati, provider ki okati — rendu receipts enduku?' Wants a single receipt.",
      "Worried that if the programme shuts down, the money paid to the programme provider is wasted.",
    ],
    hi: ["{who} ne do baar poocha ki ₹{fee}L kisko jaata hai — university ko ya provider ko?", "'Do jagah fees kyun?' — {who} wants a single receipt."],
    en: ["Confused why fees go to two parties (university + the programme provider). Asked twice who receives the ₹{fee}L.", "Worried provider part of the fee is lost if they leave midway."],
  },
  placement: {
    te: [
      "Cousin in TCS says private colleges don't place.",
      "{who} asked 'first batch inka bayataki raaledu, placements ela nammali?'.",
      "Neighbour's son from a big engineering college is still jobless; {who} fears the same.",
      "{who} wanted company names that hired the programme students; counsellor said no batch has graduated yet.",
    ],
    hi: ["{rel} TCS mein hai, bolte hain private colleges mein placement nahi hota.", "{who}: 'pehla batch abhi pass out nahi hua, placement ka bharosa kaise karein?'."],
    en: ["{who} wants placement numbers; counsellor explained no programme cohort has graduated yet.", "{rel} says only IIT/NIT students get jobs now; {who} sceptical."],
  },
  hostel_safety: {
    te: [
      "Mother worried about girls' hostel safety and food; daughter has never stayed away from home.",
      "{who} asked about hostel timings, CCTV and who to call at night.",
    ],
    hi: ["Mother ko beti ke hostel ki safety aur khane ki chinta hai.", "{who} ne hostel timings aur raat ko kisko call karein, yeh poocha."],
    en: ["Mother worried about hostel safety and food; first time the child will stay away from home.", "Asked about hostel warden, CCTV and curfew timings."],
  },
  distance: {
    te: [
      "{city} campus is ~{km} km from home; mother wants a college in their own town.",
      "{who} prefers the child stays home and joins a local college to save travel cost.",
    ],
    hi: ["Campus ghar se ~{km} km door hai; mother chahti hain ki bachcha ghar ke paas padhe."],
    en: ["Campus in {city} is ~{km} km away; parents prefer a college nearer home."],
  },
  price: {
    te: [
      "Fee of ₹{fee}L per year is too much; local EAMCET seat costs much less.",
      "Asked about EMI and scholarships; {who} is a farmer, income is seasonal.",
      "Comparing with a ₹1L/yr local college; not sure the extra cost is worth it.",
    ],
    hi: ["₹{fee}L saal ka bahut zyada hai; local college sasta hai.", "EMI aur scholarship ke baare mein poocha."],
    en: ["Fee of ₹{fee}L/yr is a stretch; asked about EMI and scholarships.", "Comparing with a cheaper local college; unsure the extra cost is worth it."],
  },
  other: {
    te: ["Student is keen, but parents say 'EAMCET counselling results kosam wait chestham'.", "Grandfather has the final say; he was not on the call."],
    hi: ["Student ready hai, lekin parents EAMCET results ka wait karna chahte hain."],
    en: ["Wants to talk to someone whose child is already studying there.", "Grandfather has the final say; he was not on the call."],
  },
};

export const OPENERS = {
  te: ["Mother attended counselling with the student.", "Joint family call; grandfather also on the line.", "Father attended alone; student wants to join.", "Both parents on the call."],
  hi: ["Father aur student dono call par the.", "Mother attended counselling with the student."],
  en: ["Both parents attended counselling.", "Student is keen; parents hesitant."],
};
export const CLOSERS = {
  te: ["Said 'alochinchi chepthamu' (we'll think and tell). No payment yet.", "Will discuss with relatives this weekend.", "Asked for time till next week."],
  hi: ["Bole 'soch ke batayenge'. No payment yet.", "Relatives se baat karke batayenge."],
  en: ["Said 'we'll think about it'. No payment yet.", "Will decide after talking to relatives."],
};
export const RELATIVES = ["Uncle", "Cousin", "Neighbour", "Brother-in-law", "Family friend"];

export type FeaturedLead = {
  student_name: string;
  parent_name: string;
  pincode: string;
  language: string;
  preferred_university: string;
  fee_band: "low" | "mid" | "high";
  counselling_notes: string;
  days_ago: number;
};

/** Hand-written showcase families (they take 6 treatment-arm slots, so the 200/200 split stays random). */
export const FEATURED: FeaturedLead[] = [
  {
    student_name: "Sai Teja Gorantla", parent_name: "Venkata Ramana Gorantla", pincode: "522002", language: "te", preferred_university: NRI, fee_band: "low", days_ago: 11,
    counselling_notes:
      "Father worried degree is distance mode. Asked twice who receives the ₹2L. Cousin in TCS says private colleges don't place. Mother quiet, but asked 'mana Guntur nunchi evaraina akkada chaduvutunnara?'.",
  },
  {
    student_name: "Arshiya Rafi", parent_name: "Mohammed Rafi", pincode: "500028", language: "hi", preferred_university: CDU, fee_band: "high", days_ago: 9,
    counselling_notes:
      "Father: 'ye course college hai ya coaching? Degree kis ke naam se milegi?'. Worried about daughter's hostel safety — wants a girls-only hostel with a warden. ₹4.5L per year feels steep; comparing with a JNTU-affiliated college near home.",
  },
  {
    student_name: "Arun Selvam", parent_name: "Selvam Murugesan", pincode: "517501", language: "ta", preferred_university: ANU, fee_band: "low", days_ago: 14,
    counselling_notes:
      "Tamil-speaking family settled in Tirupati; prefers to talk in Tamil. Father asked 'the programme is not a college, then who gives the degree?'. Rajampet campus is ~100 km away; mother worried about distance and hostel food.",
  },
  {
    student_name: "Prajwal Gowda", parent_name: "Mahesh Gowda", pincode: "518002", language: "kn", preferred_university: BIU, fee_band: "low", days_ago: 8,
    counselling_notes:
      "Kannada family near the Karnataka border. Father unsure if the BEST Innovation University degree is recognised. Uncle in Bengaluru says 'only big colleges get jobs'. Fee ₹2L is okay but wants EMI.",
  },
  {
    student_name: "Navya Gadde", parent_name: "Kiran Kumar Gadde", pincode: "520010", language: "en", preferred_university: NRI, fee_band: "mid", days_ago: 10,
    counselling_notes:
      "Both parents are software engineers in Vijayawada. Their concern is proof: 'No batch has graduated, so what exactly are we paying for?'. Asked why part of the ₹3L goes to the programme provider and part to NRI University. Want to talk to a parent whose child is in 2nd year.",
  },
  {
    student_name: "Rohith Bandi", parent_name: "Mallaiah Bandi", pincode: "506002", language: "te", preferred_university: CDU, fee_band: "mid", days_ago: 12,
    counselling_notes:
      "నాన్న గారు 'ఇది కాలేజీనా, కోచింగ్ సెంటరా?' అని రెండు సార్లు అడిగారు. Fee ₹3L is big for the family; father is an auto driver and asked about scholarships. Mother worried about hostel food in Hyderabad.",
  },
];
