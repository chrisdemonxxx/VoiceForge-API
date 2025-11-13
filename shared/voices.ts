// Voice Library for Indic Parler TTS
// Shared between backend and frontend

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female";
  description: string;
  prompt: string; // Natural language description for the model
}

export const VOICE_LIBRARY: Voice[] = [
  // Hindi Voices
  { id: "hindi-aditi-f", name: "Aditi", language: "Hindi", gender: "female", description: "Clear and expressive female voice", prompt: "Aditi speaks in a clear and expressive voice" },
  { id: "hindi-rahul-m", name: "Rahul", language: "Hindi", gender: "male", description: "Professional male voice", prompt: "Rahul speaks in a professional and confident tone" },
  { id: "hindi-priya-f", name: "Priya", language: "Hindi", gender: "female", description: "Warm and friendly female voice", prompt: "Priya speaks in a warm and friendly manner" },
  { id: "hindi-vikram-m", name: "Vikram", language: "Hindi", gender: "male", description: "Deep and authoritative male voice", prompt: "Vikram speaks with a deep and authoritative voice" },
  
  // Tamil Voices
  { id: "tamil-lakshmi-f", name: "Lakshmi", language: "Tamil", gender: "female", description: "Melodious female voice", prompt: "Lakshmi speaks in a melodious and pleasant voice" },
  { id: "tamil-kumar-m", name: "Kumar", language: "Tamil", gender: "male", description: "Strong male voice", prompt: "Kumar speaks with a strong and clear voice" },
  { id: "tamil-meena-f", name: "Meena", language: "Tamil", gender: "female", description: "Soft and gentle female voice", prompt: "Meena speaks in a soft and gentle manner" },
  
  // Telugu Voices
  { id: "telugu-anjali-f", name: "Anjali", language: "Telugu", gender: "female", description: "Bright and cheerful female voice", prompt: "Anjali speaks in a bright and cheerful tone" },
  { id: "telugu-ravi-m", name: "Ravi", language: "Telugu", gender: "male", description: "Confident male voice", prompt: "Ravi speaks with confidence and clarity" },
  { id: "telugu-sita-f", name: "Sita", language: "Telugu", gender: "female", description: "Calm and soothing female voice", prompt: "Sita speaks in a calm and soothing voice" },
  
  // Malayalam Voices
  { id: "malayalam-maya-f", name: "Maya", language: "Malayalam", gender: "female", description: "Elegant female voice", prompt: "Maya speaks in an elegant and refined manner" },
  { id: "malayalam-suresh-m", name: "Suresh", language: "Malayalam", gender: "male", description: "Warm male voice", prompt: "Suresh speaks with a warm and welcoming voice" },
  { id: "malayalam-divya-f", name: "Divya", language: "Malayalam", gender: "female", description: "Sweet and pleasant female voice", prompt: "Divya speaks in a sweet and pleasant tone" },
  
  // Bengali Voices
  { id: "bengali-riya-f", name: "Riya", language: "Bengali", gender: "female", description: "Expressive female voice", prompt: "Riya speaks in an expressive and emotional voice" },
  { id: "bengali-amit-m", name: "Amit", language: "Bengali", gender: "male", description: "Distinguished male voice", prompt: "Amit speaks with a distinguished and mature voice" },
  { id: "bengali-puja-f", name: "Puja", language: "Bengali", gender: "female", description: "Lively and energetic female voice", prompt: "Puja speaks in a lively and energetic manner" },
  
  // Urdu Voices
  { id: "urdu-zara-f", name: "Zara", language: "Urdu", gender: "female", description: "Poetic female voice", prompt: "Zara speaks in a poetic and graceful voice" },
  { id: "urdu-hassan-m", name: "Hassan", language: "Urdu", gender: "male", description: "Eloquent male voice", prompt: "Hassan speaks with eloquence and sophistication" },
  { id: "urdu-aisha-f", name: "Aisha", language: "Urdu", gender: "female", description: "Refined female voice", prompt: "Aisha speaks in a refined and cultured manner" },
  
  // Additional languages...
  // Kannada
  { id: "kannada-deepa-f", name: "Deepa", language: "Kannada", gender: "female", description: "Melodious female voice", prompt: "Deepa speaks in a melodious Kannada voice" },
  { id: "kannada-kiran-m", name: "Kiran", language: "Kannada", gender: "male", description: "Clear male voice", prompt: "Kiran speaks with clarity in Kannada" },
  
  // Marathi
  { id: "marathi-sneha-f", name: "Sneha", language: "Marathi", gender: "female", description: "Sweet female voice", prompt: "Sneha speaks in a sweet Marathi voice" },
  { id: "marathi-rohit-m", name: "Rohit", language: "Marathi", gender: "male", description: "Confident male voice", prompt: "Rohit speaks confidently in Marathi" },
  
  // Gujarati
  { id: "gujarati-rupa-f", name: "Rupa", language: "Gujarati", gender: "female", description: "Warm female voice", prompt: "Rupa speaks warmly in Gujarati" },
  { id: "gujarati-jay-m", name: "Jay", language: "Gujarati", gender: "male", description: "Professional male voice", prompt: "Jay speaks professionally in Gujarati" },
  
  // Punjabi
  { id: "punjabi-simran-f", name: "Simran", language: "Punjabi", gender: "female", description: "Cheerful female voice", prompt: "Simran speaks cheerfully in Punjabi" },
  { id: "punjabi-jaspal-m", name: "Jaspal", language: "Punjabi", gender: "male", description: "Strong male voice", prompt: "Jaspal speaks with strength in Punjabi" },
  
  // ==================== T1 COUNTRY VOICES ====================
  
  // English (USA) - Professional, clear American voices
  { id: "en-us-sarah-f", name: "Sarah", language: "English (USA)", gender: "female", description: "Professional American female voice, clear and confident", prompt: "Sarah speaks in a professional American accent with clear enunciation and confident tone" },
  { id: "en-us-michael-m", name: "Michael", language: "English (USA)", gender: "male", description: "Authoritative American male voice, deep and trustworthy", prompt: "Michael speaks with a deep, authoritative American voice that conveys trust and expertise" },
  { id: "en-us-jessica-f", name: "Jessica", language: "English (USA)", gender: "female", description: "Warm and friendly American female voice", prompt: "Jessica speaks in a warm, friendly American accent with natural expressiveness" },
  { id: "en-us-david-m", name: "David", language: "English (USA)", gender: "male", description: "Conversational American male voice, approachable", prompt: "David speaks in a conversational, approachable American tone" },
  { id: "en-us-emily-f", name: "Emily", language: "English (USA)", gender: "female", description: "Energetic and enthusiastic American female voice", prompt: "Emily speaks with energy and enthusiasm in an American accent" },
  { id: "en-us-james-m", name: "James", language: "English (USA)", gender: "male", description: "Calm and reassuring American male voice", prompt: "James speaks in a calm, reassuring American voice with steady pacing" },
  
  // English (UK) - British Received Pronunciation and regional accents
  { id: "en-gb-olivia-f", name: "Olivia", language: "English (UK)", gender: "female", description: "Refined British female voice, RP accent", prompt: "Olivia speaks in a refined British Received Pronunciation with elegant diction" },
  { id: "en-gb-william-m", name: "William", language: "English (UK)", gender: "male", description: "Distinguished British male voice, authoritative RP", prompt: "William speaks with a distinguished British accent, authoritative and articulate" },
  { id: "en-gb-charlotte-f", name: "Charlotte", language: "English (UK)", gender: "female", description: "Warm British female voice, approachable RP", prompt: "Charlotte speaks in a warm British accent with approachable RP pronunciation" },
  { id: "en-gb-henry-m", name: "Henry", language: "English (UK)", gender: "male", description: "Professional British male voice, clear RP", prompt: "Henry speaks professionally in clear British Received Pronunciation" },
  { id: "en-gb-isabella-f", name: "Isabella", language: "English (UK)", gender: "female", description: "Sophisticated British female voice", prompt: "Isabella speaks with sophisticated British elegance and clarity" },
  
  // English (Canada) - Canadian accent
  { id: "en-ca-emma-f", name: "Emma", language: "English (Canada)", gender: "female", description: "Friendly Canadian female voice", prompt: "Emma speaks in a friendly Canadian accent with clear, neutral pronunciation" },
  { id: "en-ca-liam-m", name: "Liam", language: "English (Canada)", gender: "male", description: "Professional Canadian male voice", prompt: "Liam speaks professionally with a clear Canadian accent" },
  { id: "en-ca-sophie-f", name: "Sophie", language: "English (Canada)", gender: "female", description: "Warm Canadian female voice", prompt: "Sophie speaks warmly in a Canadian accent with natural expression" },
  
  // English (Australia) - Australian accent
  { id: "en-au-chloe-f", name: "Chloe", language: "English (Australia)", gender: "female", description: "Cheerful Australian female voice", prompt: "Chloe speaks cheerfully in an Australian accent with natural intonation" },
  { id: "en-au-jack-m", name: "Jack", language: "English (Australia)", gender: "male", description: "Friendly Australian male voice", prompt: "Jack speaks in a friendly Australian accent with clear articulation" },
  { id: "en-au-ruby-f", name: "Ruby", language: "English (Australia)", gender: "female", description: "Energetic Australian female voice", prompt: "Ruby speaks energetically in an Australian accent with vibrant expression" },
  
  // German - High-quality German voices
  { id: "de-anna-f", name: "Anna", language: "German", gender: "female", description: "Professional German female voice, clear and precise", prompt: "Anna spricht professionell und klar auf Deutsch mit präziser Aussprache" },
  { id: "de-lukas-m", name: "Lukas", language: "German", gender: "male", description: "Authoritative German male voice, confident", prompt: "Lukas spricht mit einer autoritativen, selbstbewussten deutschen Stimme" },
  { id: "de-marie-f", name: "Marie", language: "German", gender: "female", description: "Warm German female voice, friendly", prompt: "Marie spricht warmherzig und freundlich auf Deutsch" },
  { id: "de-felix-m", name: "Felix", language: "German", gender: "male", description: "Conversational German male voice", prompt: "Felix spricht in einem gesprächigen, zugänglichen deutschen Ton" },
  { id: "de-lena-f", name: "Lena", language: "German", gender: "female", description: "Energetic German female voice", prompt: "Lena spricht energisch und lebhaft auf Deutsch" },
  
  // French - Elegant French voices
  { id: "fr-camille-f", name: "Camille", language: "French", gender: "female", description: "Elegant French female voice, sophisticated", prompt: "Camille parle avec élégance et sophistication en français" },
  { id: "fr-louis-m", name: "Louis", language: "French", gender: "male", description: "Distinguished French male voice, authoritative", prompt: "Louis parle avec une voix française distinguée et autoritaire" },
  { id: "fr-amelie-f", name: "Amélie", language: "French", gender: "female", description: "Warm French female voice, expressive", prompt: "Amélie parle chaleureusement en français avec une expression naturelle" },
  { id: "fr-julien-m", name: "Julien", language: "French", gender: "male", description: "Professional French male voice", prompt: "Julien parle professionnellement en français avec clarté" },
  { id: "fr-lea-f", name: "Léa", language: "French", gender: "female", description: "Cheerful French female voice", prompt: "Léa parle joyeusement en français avec enthousiasme" },
  
  // Spanish (Spain) - Castilian Spanish
  { id: "es-sofia-f", name: "Sofía", language: "Spanish (Spain)", gender: "female", description: "Elegant Spanish female voice, clear Castilian", prompt: "Sofía habla con elegancia en español castellano claro" },
  { id: "es-carlos-m", name: "Carlos", language: "Spanish (Spain)", gender: "male", description: "Professional Spanish male voice, authoritative", prompt: "Carlos habla profesionalmente en español con voz autoritaria" },
  { id: "es-lucia-f", name: "Lucía", language: "Spanish (Spain)", gender: "female", description: "Warm Spanish female voice, friendly", prompt: "Lucía habla calurosamente en español con tono amigable" },
  { id: "es-diego-m", name: "Diego", language: "Spanish (Spain)", gender: "male", description: "Conversational Spanish male voice", prompt: "Diego habla de manera conversacional en español" },
  
  // Spanish (Latin America) - Neutral Latin American Spanish
  { id: "es-mx-valentina-f", name: "Valentina", language: "Spanish (Mexico)", gender: "female", description: "Clear Mexican Spanish female voice", prompt: "Valentina habla claramente en español mexicano con tono natural" },
  { id: "es-mx-miguel-m", name: "Miguel", language: "Spanish (Mexico)", gender: "male", description: "Professional Mexican Spanish male voice", prompt: "Miguel habla profesionalmente en español mexicano" },
  
  // Italian - Melodious Italian voices
  { id: "it-giulia-f", name: "Giulia", language: "Italian", gender: "female", description: "Melodious Italian female voice, expressive", prompt: "Giulia parla con voce melodiosa ed espressiva in italiano" },
  { id: "it-marco-m", name: "Marco", language: "Italian", gender: "male", description: "Warm Italian male voice, passionate", prompt: "Marco parla con una voce italiana calda e appassionata" },
  { id: "it-alessandra-f", name: "Alessandra", language: "Italian", gender: "female", description: "Elegant Italian female voice", prompt: "Alessandra parla elegantemente in italiano con raffinatezza" },
  { id: "it-lorenzo-m", name: "Lorenzo", language: "Italian", gender: "male", description: "Professional Italian male voice", prompt: "Lorenzo parla professionalmente in italiano con chiarezza" },
  
  // Portuguese (Brazil) - Brazilian Portuguese
  { id: "pt-br-ana-f", name: "Ana", language: "Portuguese (Brazil)", gender: "female", description: "Warm Brazilian Portuguese female voice", prompt: "Ana fala calorosamente em português brasileiro com naturalidade" },
  { id: "pt-br-pedro-m", name: "Pedro", language: "Portuguese (Brazil)", gender: "male", description: "Friendly Brazilian Portuguese male voice", prompt: "Pedro fala amigavelmente em português brasileiro" },
  { id: "pt-br-isabela-f", name: "Isabela", language: "Portuguese (Brazil)", gender: "female", description: "Energetic Brazilian Portuguese female voice", prompt: "Isabela fala energicamente em português brasileiro" },
  
  // Portuguese (Portugal) - European Portuguese
  { id: "pt-pt-maria-f", name: "Maria", language: "Portuguese (Portugal)", gender: "female", description: "Refined Portuguese female voice", prompt: "Maria fala com refinamento em português europeu" },
  { id: "pt-pt-joao-m", name: "João", language: "Portuguese (Portugal)", gender: "male", description: "Professional Portuguese male voice", prompt: "João fala profissionalmente em português europeu" },
  
  // Dutch - Netherlands Dutch
  { id: "nl-lisa-f", name: "Lisa", language: "Dutch", gender: "female", description: "Clear Dutch female voice", prompt: "Lisa spreekt helder en duidelijk in het Nederlands" },
  { id: "nl-thomas-m", name: "Thomas", language: "Dutch", gender: "male", description: "Professional Dutch male voice", prompt: "Thomas spreekt professioneel in het Nederlands" },
  
  // Polish - Polish voices
  { id: "pl-zofia-f", name: "Zofia", language: "Polish", gender: "female", description: "Warm Polish female voice", prompt: "Zofia mówi ciepło i naturalnie po polsku" },
  { id: "pl-adam-m", name: "Adam", language: "Polish", gender: "male", description: "Professional Polish male voice", prompt: "Adam mówi profesjonalnie po polsku" },
  
  // Russian - Russian voices
  { id: "ru-anastasia-f", name: "Anastasia", language: "Russian", gender: "female", description: "Elegant Russian female voice", prompt: "Анастасия говорит элегантно на русском языке" },
  { id: "ru-dmitry-m", name: "Dmitry", language: "Russian", gender: "male", description: "Strong Russian male voice", prompt: "Дмитрий говорит сильным голосом на русском языке" },
  
  // Japanese - Japanese voices
  { id: "ja-yuki-f", name: "Yuki", language: "Japanese", gender: "female", description: "Polite Japanese female voice", prompt: "ゆきは丁寧に日本語を話します" },
  { id: "ja-hiroshi-m", name: "Hiroshi", language: "Japanese", gender: "male", description: "Professional Japanese male voice", prompt: "ひろしはプロフェッショナルに日本語を話します" },
  
  // Korean - Korean voices
  { id: "ko-seo-yeon-f", name: "Seo-yeon", language: "Korean", gender: "female", description: "Clear Korean female voice", prompt: "서연은 명확하게 한국어로 말합니다" },
  { id: "ko-min-jun-m", name: "Min-jun", language: "Korean", gender: "male", description: "Professional Korean male voice", prompt: "민준은 전문적으로 한국어로 말합니다" },
  
  // Chinese (Mandarin) - Mandarin voices
  { id: "zh-ling-f", name: "Ling", language: "Chinese (Mandarin)", gender: "female", description: "Elegant Mandarin female voice", prompt: "玲优雅地说普通话" },
  { id: "zh-wei-m", name: "Wei", language: "Chinese (Mandarin)", gender: "male", description: "Professional Mandarin male voice", prompt: "伟专业地说普通话" },
];
