export interface Survey {
  id: string;
  question: string;
  options: string[];
  reward: number; // per-question reward (rewardPerTask / 5)
  category: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  balance: number;
  totalEarned: number;
  surveysCompleted: number;
  isPremium: boolean;
  premiumTier: string | null;
  avatar: string;
}

export interface PremiumPackage {
  id: string;
  name: string;
  price: number;
  features: string[];
  dailySurveys: number;
  rewardMultiplier: number;
  color: string;
}

// Each "Survey/Task" = 5 questions. Reward per task is credited after 5 questions.
// rewardPerQuestion = rewardPerTask / 5
export const QUESTIONS_PER_TASK = 5;
export const TASKS_PER_CATEGORY = 10;

export const categoryRewards: Record<string, number> = {
  lifestyle: 150,
  tech: 150,
  health: 200,
  finance: 250,
};

const buildQuestions = (
  category: string,
  prefix: string,
  bank: { q: string; o: string[] }[],
  rewardPerTask: number
): Survey[] => {
  // 10 tasks * 5 questions = 50 questions
  const total = TASKS_PER_CATEGORY * QUESTIONS_PER_TASK;
  const arr: Survey[] = [];
  for (let i = 0; i < total; i++) {
    const src = bank[i % bank.length];
    arr.push({
      id: `${prefix}${i + 1}`,
      question: src.q,
      options: src.o,
      reward: rewardPerTask / QUESTIONS_PER_TASK,
      category,
    });
  }
  return arr;
};

const lifestyleBank = [
  { q: "Which mobile payment service do you use most often?", o: ["M-Pesa", "Airtel Money", "T-Kash", "Bank App"] },
  { q: "How often do you shop at local supermarkets per week?", o: ["Once", "2-3 times", "4-5 times", "Daily"] },
  { q: "What is your preferred social media platform?", o: ["WhatsApp", "TikTok", "Instagram", "Facebook"] },
  { q: "Which beverage brand do you prefer?", o: ["Coca-Cola", "Tusker", "Ketepa Tea", "Del Monte Juice"] },
  { q: "How do you primarily commute to work?", o: ["Matatu", "Boda Boda", "Personal Car", "Walking"] },
  { q: "What type of entertainment do you enjoy most?", o: ["Streaming", "Local TV", "Music", "Sports"] },
  { q: "Which food delivery service have you used?", o: ["Glovo", "Uber Eats", "Jumia Food", "None"] },
  { q: "How much do you spend on airtime monthly?", o: ["Under KSH 500", "KSH 500-1000", "KSH 1000-2000", "Over KSH 2000"] },
  { q: "Where do you mostly buy clothes?", o: ["Mitumba Markets", "Branded Stores", "Online Shops", "Tailored"] },
  { q: "How often do you eat out per week?", o: ["Never", "1-2 times", "3-4 times", "5+ times"] },
  { q: "Preferred weekend activity?", o: ["Family time", "Outdoor sports", "Movies", "Travel"] },
  { q: "Favourite local fast food?", o: ["KFC", "Galitos", "Java", "Local kibandas"] },
  { q: "Which supermarket chain do you prefer?", o: ["Naivas", "Carrefour", "Quickmart", "Cleanshelf"] },
  { q: "Do you shop online?", o: ["Weekly", "Monthly", "Rarely", "Never"] },
  { q: "Preferred mode of payment in shops?", o: ["M-Pesa", "Cash", "Card", "Bank transfer"] },
];

const techBank = [
  { q: "What smartphone brand do you currently use?", o: ["Samsung", "Tecno/Infinix", "iPhone", "Other"] },
  { q: "Which internet provider do you prefer?", o: ["Safaricom", "Airtel", "Telkom", "Faiba"] },
  { q: "How many hours do you spend online daily?", o: ["1-2", "3-5", "6-8", "8+"] },
  { q: "Primary use of internet?", o: ["Social Media", "Work", "Education", "Entertainment"] },
  { q: "Which fintech app do you use?", o: ["Tala", "Branch", "Fuliza", "None"] },
  { q: "Preferred online marketplace?", o: ["Jumia", "Kilimall", "Jiji", "None"] },
  { q: "How do you secure your phone?", o: ["Fingerprint", "PIN", "Face ID", "None"] },
  { q: "Cloud storage of choice?", o: ["Google Drive", "iCloud", "Dropbox", "None"] },
  { q: "Streaming subscription?", o: ["Netflix", "Showmax", "YouTube Premium", "None"] },
  { q: "How often do you update apps?", o: ["Auto", "Weekly", "Monthly", "Rarely"] },
  { q: "Do you own a laptop?", o: ["Yes - Windows", "Yes - Mac", "Yes - Chromebook", "No"] },
  { q: "Use of AI tools (e.g. ChatGPT)?", o: ["Daily", "Weekly", "Tried it", "Never"] },
  { q: "Preferred browser?", o: ["Chrome", "Safari", "Firefox", "Edge"] },
  { q: "Mobile data bundle frequency?", o: ["Daily", "Weekly", "Monthly", "Wi-Fi only"] },
  { q: "Have you bought online?", o: ["Often", "Sometimes", "Once", "Never"] },
];

const healthBank = [
  { q: "How often do you visit a doctor per year?", o: ["Never", "Once", "2-3", "4+"] },
  { q: "Do you have health insurance?", o: ["NHIF only", "Private", "Both", "None"] },
  { q: "Rating of public healthcare?", o: ["Excellent", "Good", "Average", "Poor"] },
  { q: "Primary water source?", o: ["Tap", "Borehole", "Bottled", "Rain"] },
  { q: "Exercise per week?", o: ["Never", "1-2", "3-4", "Daily"] },
  { q: "Biggest health concern?", o: ["Malaria", "Diabetes", "Mental Health", "HIV/AIDS"] },
  { q: "Use telemedicine?", o: ["Regularly", "Sometimes", "Once", "Never"] },
  { q: "Where do you buy medication?", o: ["Hospital", "Private pharmacy", "Online", "Traditional"] },
  { q: "NHIF satisfaction?", o: ["Very", "Yes", "Neutral", "No"] },
  { q: "What motivates healthy living?", o: ["Family", "Looks", "Energy", "Doctor"] },
  { q: "Daily fruit & veg?", o: ["Always", "Often", "Rarely", "Never"] },
  { q: "Sleep hours per night?", o: ["<5", "5-6", "7-8", "8+"] },
  { q: "Stress levels?", o: ["Low", "Moderate", "High", "Severe"] },
  { q: "Smoking status?", o: ["Never", "Quit", "Occasional", "Daily"] },
  { q: "Routine medical checkups?", o: ["Yearly", "Every 2yrs", "Rarely", "Never"] },
];

const financeBank = [
  { q: "How do you primarily save?", o: ["M-Pesa", "Bank", "Chama/Sacco", "Cash"] },
  { q: "Taken a mobile loan?", o: ["M-Shwari", "Tala/Branch", "Fuliza", "Never"] },
  { q: "Biggest monthly expense?", o: ["Rent", "Food", "Transport", "School fees"] },
  { q: "Investment of choice?", o: ["T-Bills", "NSE Stocks", "Crypto", "None"] },
  { q: "Monthly savings?", o: ["<1k", "1-5k", "5-10k", "10k+"] },
  { q: "Where would you invest 100k?", o: ["Real estate", "Business", "Stocks", "Savings"] },
  { q: "How do you track expenses?", o: ["M-Pesa stmt", "Excel", "App", "Don't"] },
  { q: "Most important bank feature?", o: ["Low charges", "Mobile banking", "Loans", "Interest"] },
  { q: "Sacco membership?", o: ["Active", "Past", "Interested", "No"] },
  { q: "Inflation impact?", o: ["Significant", "Moderate", "Slight", "None"] },
  { q: "Have an emergency fund?", o: ["Yes - 6mo", "Yes - <6mo", "Building", "None"] },
  { q: "Use crypto?", o: ["Trade", "Hold", "Tried", "Never"] },
  { q: "Insurance besides health?", o: ["Life", "Motor", "Education", "None"] },
  { q: "Side hustle income?", o: ["Yes - main", "Yes - extra", "Planning", "No"] },
  { q: "Retirement plan?", o: ["NSSF + private", "NSSF only", "Personal savings", "None"] },
];

export const allSurveys: Record<string, Survey[]> = {
  lifestyle: buildQuestions("lifestyle", "l", lifestyleBank, 150),
  tech: buildQuestions("tech", "t", techBank, 150),
  health: buildQuestions("health", "h", healthBank, 200),
  finance: buildQuestions("finance", "f", financeBank, 250),
};

export const premiumPackages: PremiumPackage[] = [
  {
    id: "basic",
    name: "Basic Premium",
    price: 350,
    features: ["20 Daily Surveys", "Priority Support", "Early Access to New Surveys", "1.2x Reward Multiplier"],
    dailySurveys: 20,
    rewardMultiplier: 1.2,
    color: "primary",
  },
  {
    id: "standard",
    name: "Standard Premium",
    price: 500,
    features: ["35 Daily Surveys", "VIP Support", "Exclusive Survey Categories", "1.5x Reward Multiplier", "Weekly Bonus Tasks"],
    dailySurveys: 35,
    rewardMultiplier: 1.5,
    color: "accent",
  },
  {
    id: "elite",
    name: "Elite Premium",
    price: 650,
    features: ["Unlimited Daily Surveys", "24/7 Priority Support", "All Categories Unlocked", "2x Reward Multiplier", "Daily Bonus Tasks", "Referral Bonuses"],
    dailySurveys: 999,
    rewardMultiplier: 2.0,
    color: "primary",
  },
];

export const defaultProfile: UserProfile = {
  name: "John Kamau",
  email: "john.kamau@email.com",
  phone: "+254 712 345 678",
  balance: 0,
  totalEarned: 0,
  surveysCompleted: 0,
  isPremium: false,
  premiumTier: null,
  avatar: "JK",
};
