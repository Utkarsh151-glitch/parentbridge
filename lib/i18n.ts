import { LANGUAGES, type LangCode } from "@/lib/constants";

/** UI strings for the public family booking page. */
export const BOOKING_UI = {
  en: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} is the parent of a Year {year} student at {uni}, {campus}. They had the same questions you have — ask them anything.",
    free20: "Free 20-minute call. No sales pitch.",
    pickSlot: "Pick a time (next 48 hours)",
    consent: "This call may be recorded for quality, with my consent.",
    confirm: "Confirm my call",
    confirmed: "Your call is booked!",
    join: "Join the call",
    whatsappNote: "We've sent the details on WhatsApp.",
    rateTitle: "How much do you trust ParentBridge now?",
    rateHint: "1 = not at all, 5 = completely",
    thanks: "Thank you!",
    noPhone: "Your number is never shared with the parent — the call happens on a private link.",
    language: "Language",
    needConsent: "Please tick the consent box to continue.",
    callDone: "Your call is complete.",
    cancelled: "This booking is no longer active.",
  },
  te: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} గారి పిల్లలు {uni}, {campus}లో {year}వ సంవత్సరం చదువుతున్నారు. మీలాంటి సందేహాలే వారికీ ఉండేవి — ఏదైనా అడగండి.",
    free20: "ఉచిత 20 నిమిషాల కాల్. ఎలాంటి అమ్మకపు మాటలు ఉండవు.",
    pickSlot: "సమయం ఎంచుకోండి (రాబోయే 48 గంటలు)",
    consent: "నా అనుమతితో, నాణ్యత కోసం ఈ కాల్ రికార్డ్ చేయబడవచ్చు.",
    confirm: "నా కాల్‌ను ఖరారు చేయండి",
    confirmed: "మీ కాల్ బుక్ అయింది!",
    join: "కాల్‌లో చేరండి",
    whatsappNote: "వివరాలను WhatsAppలో పంపాము.",
    rateTitle: "ఇప్పుడు ParentBridge పై మీకు ఎంత నమ్మకం ఉంది?",
    rateHint: "1 = అస్సలు లేదు, 5 = పూర్తిగా",
    thanks: "ధన్యవాదాలు!",
    noPhone: "మీ ఫోన్ నంబర్ ఎవరితోనూ పంచుకోబడదు; కాల్ ఒక ప్రైవేట్ లింక్‌లో జరుగుతుంది.",
    language: "భాష",
    needConsent: "కొనసాగడానికి దయచేసి అనుమతి పెట్టెను టిక్ చేయండి.",
    callDone: "మీ కాల్ పూర్తయింది.",
    cancelled: "ఈ బుకింగ్ ఇప్పుడు అందుబాటులో లేదు.",
  },
  hi: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} का बच्चा {uni}, {campus} में वर्ष {year} में पढ़ता है। उनके मन में भी आप जैसे ही सवाल थे — कुछ भी पूछिए।",
    free20: "मुफ़्त 20 मिनट की कॉल। कोई बिक्री की बात नहीं।",
    pickSlot: "समय चुनें (अगले 48 घंटे)",
    consent: "मेरी सहमति से, गुणवत्ता के लिए यह कॉल रिकॉर्ड की जा सकती है।",
    confirm: "मेरी कॉल पक्की करें",
    confirmed: "आपकी कॉल बुक हो गई!",
    join: "कॉल में जुड़ें",
    whatsappNote: "हमने विवरण WhatsApp पर भेज दिए हैं।",
    rateTitle: "अब आपको ParentBridge पर कितना भरोसा है?",
    rateHint: "1 = बिल्कुल नहीं, 5 = पूरा",
    thanks: "धन्यवाद!",
    noPhone: "आपका नंबर किसी से साझा नहीं किया जाता; कॉल एक निजी लिंक पर होती है।",
    language: "भाषा",
    needConsent: "आगे बढ़ने के लिए कृपया सहमति वाले बॉक्स पर टिक करें।",
    callDone: "आपकी कॉल पूरी हो गई है।",
    cancelled: "यह बुकिंग अब सक्रिय नहीं है।",
  },
  ta: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} அவர்களின் பிள்ளை {uni}, {campus}-இல் ஆண்டு {year}-இல் படிக்கிறார். உங்களைப் போன்ற சந்தேகங்கள் அவர்களுக்கும் இருந்தன — எதையும் கேளுங்கள்.",
    free20: "இலவச 20 நிமிட அழைப்பு. விற்பனைப் பேச்சு இல்லை.",
    pickSlot: "நேரத்தைத் தேர்ந்தெடுக்கவும் (அடுத்த 48 மணி நேரம்)",
    consent: "என் ஒப்புதலுடன், தரத்திற்காக இந்த அழைப்பு பதிவு செய்யப்படலாம்.",
    confirm: "என் அழைப்பை உறுதிசெய்",
    confirmed: "உங்கள் அழைப்பு முன்பதிவு செய்யப்பட்டது!",
    join: "அழைப்பில் சேருங்கள்",
    whatsappNote: "விவரங்களை WhatsApp-இல் அனுப்பியுள்ளோம்.",
    rateTitle: "இப்போது ParentBridge மீது உங்களுக்கு எவ்வளவு நம்பிக்கை உள்ளது?",
    rateHint: "1 = இல்லவே இல்லை, 5 = முழுமையாக",
    thanks: "நன்றி!",
    noPhone: "உங்கள் எண் யாருடனும் பகிரப்படாது; அழைப்பு தனிப்பட்ட இணைப்பில் நடக்கும்.",
    language: "மொழி",
    needConsent: "தொடர, ஒப்புதல் பெட்டியைத் தேர்வு செய்யவும்.",
    callDone: "உங்கள் அழைப்பு முடிந்தது.",
    cancelled: "இந்த முன்பதிவு இனி செயலில் இல்லை.",
  },
  kn: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} ಅವರ ಮಗು {uni}, {campus} ನಲ್ಲಿ ವರ್ಷ {year} ರಲ್ಲಿ ಓದುತ್ತಿದೆ. ನಿಮ್ಮಂತಹದೇ ಸಂದೇಹಗಳು ಅವರಿಗೂ ಇದ್ದವು — ಏನು ಬೇಕಾದರೂ ಕೇಳಿ.",
    free20: "ಉಚಿತ 20 ನಿಮಿಷಗಳ ಕರೆ. ಯಾವುದೇ ಮಾರಾಟದ ಮಾತು ಇಲ್ಲ.",
    pickSlot: "ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ (ಮುಂದಿನ 48 ಗಂಟೆಗಳು)",
    consent: "ನನ್ನ ಒಪ್ಪಿಗೆಯೊಂದಿಗೆ, ಗುಣಮಟ್ಟಕ್ಕಾಗಿ ಈ ಕರೆಯನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಬಹುದು.",
    confirm: "ನನ್ನ ಕರೆಯನ್ನು ದೃಢೀಕರಿಸಿ",
    confirmed: "ನಿಮ್ಮ ಕರೆ ಬುಕ್ ಆಗಿದೆ!",
    join: "ಕರೆಗೆ ಸೇರಿ",
    whatsappNote: "ವಿವರಗಳನ್ನು WhatsApp ನಲ್ಲಿ ಕಳುಹಿಸಿದ್ದೇವೆ.",
    rateTitle: "ಈಗ ParentBridge ಮೇಲೆ ನಿಮಗೆ ಎಷ್ಟು ನಂಬಿಕೆ ಇದೆ?",
    rateHint: "1 = ಇಲ್ಲವೇ ಇಲ್ಲ, 5 = ಸಂಪೂರ್ಣವಾಗಿ",
    thanks: "ಧನ್ಯವಾದಗಳು!",
    noPhone: "ನಿಮ್ಮ ಸಂಖ್ಯೆಯನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ; ಕರೆ ಖಾಸಗಿ ಲಿಂಕ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ.",
    language: "ಭಾಷೆ",
    needConsent: "ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ಒಪ್ಪಿಗೆ ಪೆಟ್ಟಿಗೆಯನ್ನು ಟಿಕ್ ಮಾಡಿ.",
    callDone: "ನಿಮ್ಮ ಕರೆ ಪೂರ್ಣಗೊಂಡಿದೆ.",
    cancelled: "ಈ ಬುಕಿಂಗ್ ಈಗ ಸಕ್ರಿಯವಾಗಿಲ್ಲ.",
  },
  ml: {
    title: "Talk with a parent ambassador from your district",
    intro: "{amb} എന്നവരുടെ കുട്ടി {uni}, {campus}-ൽ വർഷം {year}-ൽ പഠിക്കുന്നു. നിങ്ങളുടേതുപോലുള്ള സംശയങ്ങൾ അവർക്കും ഉണ്ടായിരുന്നു — എന്തും ചോദിക്കാം.",
    free20: "സൗജന്യ 20 മിനിറ്റ് കോൾ. വിൽപ്പന സംസാരമില്ല.",
    pickSlot: "സമയം തിരഞ്ഞെടുക്കുക (അടുത്ത 48 മണിക്കൂർ)",
    consent: "എന്റെ സമ്മതത്തോടെ, ഗുണനിലവാരത്തിനായി ഈ കോൾ റെക്കോർഡ് ചെയ്തേക്കാം.",
    confirm: "എന്റെ കോൾ സ്ഥിരീകരിക്കുക",
    confirmed: "നിങ്ങളുടെ കോൾ ബുക്ക് ചെയ്തു!",
    join: "കോളിൽ ചേരുക",
    whatsappNote: "വിശദാംശങ്ങൾ WhatsApp-ൽ അയച്ചിട്ടുണ്ട്.",
    rateTitle: "ഇപ്പോൾ ParentBridge-ൽ നിങ്ങൾക്ക് എത്രത്തോളം വിശ്വാസമുണ്ട്?",
    rateHint: "1 = ഒട്ടും ഇല്ല, 5 = പൂർണ്ണമായും",
    thanks: "നന്ദി!",
    noPhone: "നിങ്ങളുടെ നമ്പർ ആരുമായും പങ്കിടില്ല; കോൾ ഒരു സ്വകാര്യ ലിങ്കിലാണ് നടക്കുക.",
    language: "ഭാഷ",
    needConsent: "തുടരാൻ ദയവായി സമ്മത ബോക്സ് ടിക്ക് ചെയ്യുക.",
    callDone: "നിങ്ങളുടെ കോൾ പൂർത്തിയായി.",
    cancelled: "ഈ ബുക്കിംഗ് ഇപ്പോൾ സജീവമല്ല.",
  },
} satisfies Record<LangCode, Record<string, string>>;

export type BookingStrings = (typeof BOOKING_UI)["en"];

/** WhatsApp templates for transactional messages (the offer itself is written by the agent). */
const WA = {
  familyConfirm: {
    en: "✅ Your call with {amb} is confirmed for {time}.\nJoin here: {link}",
    te: "✅ {amb} గారితో మీ కాల్ {time}కి ఖరారైంది.\nఇక్కడ చేరండి: {link}",
    hi: "✅ {amb} जी के साथ आपकी कॉल {time} के लिए पक्की हो गई है।\nयहाँ जुड़ें: {link}",
    ta: "✅ {amb} அவர்களுடன் உங்கள் அழைப்பு {time}க்கு உறுதி செய்யப்பட்டது.\nஇங்கே இணையுங்கள்: {link}",
    kn: "✅ {amb} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಕರೆ {time}ಕ್ಕೆ ದೃಢಪಟ್ಟಿದೆ.\nಇಲ್ಲಿ ಸೇರಿ: {link}",
    ml: "✅ {amb} എന്നവരുമായുള്ള നിങ്ങളുടെ കോൾ {time}-ന് സ്ഥിരീകരിച്ചു.\nഇവിടെ ചേരുക: {link}",
  },
  reminder: {
    en: "⏰ Reminder: your call with {amb} is at {time}.\nJoin: {link}",
    te: "⏰ గుర్తు: {amb} గారితో మీ కాల్ {time}కి ఉంది.\nచేరండి: {link}",
    hi: "⏰ याद दिलाना: {amb} जी के साथ आपकी कॉल {time} पर है।\nजुड़ें: {link}",
    ta: "⏰ நினைவூட்டல்: {amb} அவர்களுடன் உங்கள் அழைப்பு {time}க்கு உள்ளது.\nஇணையுங்கள்: {link}",
    kn: "⏰ ಜ್ಞಾಪನೆ: {amb} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಕರೆ {time}ಕ್ಕೆ ಇದೆ.\nಸೇರಿ: {link}",
    ml: "⏰ ഓർമ്മപ്പെടുത്തൽ: {amb} എന്നവരുമായുള്ള നിങ്ങളുടെ കോൾ {time}-നാണ്.\nചേരുക: {link}",
  },
  ratingRequest: {
    en: "🙏 Thank you for speaking with {amb}. How much do you trust ParentBridge now? Reply with a number from 1 to 5 (5 = completely).",
    te: "🙏 {amb} గారితో మాట్లాడినందుకు ధన్యవాదాలు. ఇప్పుడు ParentBridge పై మీకు ఎంత నమ్మకం ఉంది? 1 నుండి 5 వరకు ఒక సంఖ్యతో జవాబు ఇవ్వండి (5 = పూర్తిగా).",
    hi: "🙏 {amb} जी से बात करने के लिए धन्यवाद। अब आपको ParentBridge पर कितना भरोसा है? 1 से 5 तक कोई एक अंक भेजें (5 = पूरा भरोसा)।",
    ta: "🙏 {amb} அவர்களுடன் பேசியதற்கு நன்றி. இப்போது ParentBridge மீது உங்களுக்கு எவ்வளவு நம்பிக்கை? 1 முதல் 5 வரை ஒரு எண்ணை அனுப்புங்கள் (5 = முழுமையாக).",
    kn: "🙏 {amb} ಅವರೊಂದಿಗೆ ಮಾತನಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಈಗ ParentBridge ಮೇಲೆ ನಿಮಗೆ ಎಷ್ಟು ನಂಬಿಕೆ ಇದೆ? 1 ರಿಂದ 5 ರವರೆಗೆ ಒಂದು ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ (5 = ಸಂಪೂರ್ಣವಾಗಿ).",
    ml: "🙏 {amb} എന്നവരുമായി സംസാരിച്ചതിന് നന്ദി. ഇപ്പോൾ ParentBridge-ൽ നിങ്ങൾക്ക് എത്ര വിശ്വാസമുണ്ട്? 1 മുതൽ 5 വരെ ഒരു സംഖ്യ മറുപടിയായി അയയ്ക്കുക (5 = പൂർണ്ണമായും).",
  },
  ambassadorConfirm: {
    en: "📅 New ParentBridge call: {family}'s family ({district}) at {time}.\nYour brief & notes page: {alink}\nCall link: {link}",
    te: "📅 కొత్త ParentBridge కాల్: {family} కుటుంబం ({district}), {time}.\nమీ బ్రీఫ్ & నోట్స్ పేజీ: {alink}\nకాల్ లింక్: {link}",
    hi: "📅 नई ParentBridge कॉल: {family} का परिवार ({district}), {time}।\nआपका ब्रीफ़ और नोट्स पेज: {alink}\nकॉल लिंक: {link}",
    ta: "📅 புதிய ParentBridge அழைப்பு: {family} குடும்பம் ({district}), {time}.\nஉங்கள் குறிப்பு பக்கம்: {alink}\nஅழைப்பு இணைப்பு: {link}",
    kn: "📅 ಹೊಸ ParentBridge ಕರೆ: {family} ಕುಟುಂಬ ({district}), {time}.\nನಿಮ್ಮ ಬ್ರೀಫ್ ಮತ್ತು ಟಿಪ್ಪಣಿ ಪುಟ: {alink}\nಕರೆ ಲಿಂಕ್: {link}",
    ml: "📅 പുതിയ ParentBridge കോൾ: {family}യുടെ കുടുംബം ({district}), {time}.\nനിങ്ങളുടെ ബ്രീഫ് പേജ്: {alink}\nകോൾ ലിങ്ക്: {link}",
  },
} satisfies Record<string, Record<LangCode, string>>;

export type WaTemplate = keyof typeof WA;

export function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function waText(kind: WaTemplate, lang: string, vars: Record<string, string | number>): string {
  const l = (lang in WA[kind] ? lang : "en") as LangCode;
  return fill(WA[kind][l], vars);
}

export function bookingStrings(lang: string): BookingStrings {
  return BOOKING_UI[(lang in BOOKING_UI ? lang : "en") as LangCode];
}

export function formatSlot(d: Date | string, lang: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const locale = LANGUAGES[(lang in LANGUAGES ? lang : "en") as LangCode].locale;
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(new Date(d));
}
