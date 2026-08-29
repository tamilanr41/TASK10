export const CHAT_DISCLAIMER =
  "DermAI is an AI-assisted screening tool developed for educational and " +
  "preliminary assessment purposes only. Content here is general health " +
  "information written like a dermatology consultation, but it is NOT a " +
  "medical diagnosis, prescription, or treatment plan. It should never " +
  "replace examination and consultation with a qualified dermatologist or " +
  "healthcare professional. If symptoms are severe, worsening, spreading or " +
  "cause pain, please seek prompt professional care.";

export type LatestScreening = Record<string, unknown> & {
  created_at?: string | null;
  screening_type?: string | null;
  overall_severity?: string | null;
  overall_confidence?: number | null;
  predictions?: { findings?: Record<string, { label?: string }> } | null;
};

function hasAny(msg: string, words: string[]): boolean {
  return words.some((w) => msg.includes(w));
}

const URGENT_WORDS = [
  "urgent", "emergency", "bleeding", "blood", "pus", "blister", "fever",
  "swelling", "swollen", "difficulty breathing", "breathing trouble",
  "anaphyla", "severe pain", "sudden", "spreading rapidly", "open wound",
  "black", "necrot", "seizure",
];

function urgentReply(): string {
  return (
    "Thank you for telling me. Because of the words you have used, I want to " +
    "address safety first.\n\n" +
    "Please seek immediate medical attention if you have any of these:" +
    "\n\u2022 Bleeding, an open wound, pus or thick discharge.\n" +
    "\u2022 A widespread rash with fever, flu-like illness or feeling generally unwell.\n" +
    "\u2022 Swelling of the face or lips, or difficulty breathing.\n" +
    "\u2022 Any area that is rapidly spreading, blackening or becoming very painful.\n\n" +
    "These can accompany serious conditions and are best assessed quickly in person. " +
    "Please contact a hospital or an emergency care provider now. Once you are safe, " +
    "I am here for general questions."
  );
}

function greetReply(): string {
  return (
    "Hello, and welcome to the DermAI virtual skin-consultation assistant. " +
    "How can I help you today?\n\n" +
    "As a screening aid that communicates like a dermatology consultation, I can discuss:" +
    "\n\u2022 Scalp and hair concerns (flaking, itching, dryness, hair shedding).\n" +
    "\u2022 Nail concerns (brittleness, discolouration, thickening).\n" +
    "\u2022 General skin topics (acne, dryness, pigmentation, sun protection, routines).\n" +
    "\u2022 Nutrition and hydration relevant to skin, scalp and nails.\n" +
    "\u2022 Understanding your latest DermAI screening result.\n\n" +
    "Please describe your concern, the area affected, and roughly how long you have " +
    "noticed it - that helps me give you the most useful general guidance."
  );
}

function whatIsDermaiReply(): string {
  return (
    "DermAI is an AI-assisted preliminary dermatological screening system focused " +
    "on scalp, hair and nail analysis. It combines image analysis with a structured " +
    "symptom interview and nutrition insights to produce a preliminary screening " +
    "summary.\n\n" +
    "The assistant you are speaking with is trained to answer like a dermatology " +
    "professional would for education and triage guidance - it does not make a " +
    "diagnosis and does not prescribe. Think of it as a detailed pre-consultation " +
    "discussion, with a qualified doctor still needed for a final opinion."
  );
}

function dandruffReply(): string {
  return (
    "Let us consider the scalp flaking you are describing. From a dermatology " +
    "standpoint, persistent flakes with or without itching are commonly associated " +
    "with seborrhoeic-type patterns, which tend to involve the scalp, eyebrows and " +
    "skin beside the nose.\n\n" +
    "General management you can discuss with a professional:\n" +
    "\u2022 A gentle, regular cleansing routine using a mild shampoo.\n" +
    "\u2022 In many cases medicated washes (e.g. containing selenium, zinc pyrithione, " +
    "ketoconazole or coal tar) are the mainstay - a doctor or pharmacist can advise " +
    "which to try and how often.\n" +
    "\u2022 Avoid scratching and avoid sharing combs, brushes and towels.\n\n" +
    "Seek a professional opinion if:\n" +
    "\u2022 The flaking is severe, thick, crusted or spreading beyond the scalp.\n" +
    "\u2022 There is significant itching, redness, pain, oozing or hair loss in the area.\n" +
    "\u2022 You have immune-suppressing conditions or the pattern appears in a child.\n\n" +
    "This is general information, not a prescription."
  );
}

function itchScalpReply(): string {
  return (
    "An itchy scalp can relate to several patterns - seborrhoeic flaking, dryness, " +
    "irritation from hair products, or occasionally an infection-like pattern. To " +
    "help narrow it down, a few useful details are: whether there is flaking or " +
    "redness, when it started, and whether hair is shedding.\n\n" +
    "General measures while you decide about care:\n" +
    "\u2022 Use a mild, non-irritating shampoo and avoid leaving styling products on overnight.\n" +
    "\u2022 Avoid scratching - it worsens irritation and can cause secondary changes.\n" +
    "\u2022 Avoid sharing grooming tools and keep the area clean and dry.\n\n" +
    "Please consult a professional if the itch is severe, keeps you awake, is " +
    "associated with open sores, oozing, swelling or patchy hair loss, or does not " +
    "settle with basic care within a couple of weeks."
  );
}

function hairFallReply(): string {
  return (
    "Hair shedding is one of the most common reasons to see a dermatologist, so you " +
    "are asking the right question. It is useful to separate two broad pictures:\n\n" +
    "\u2022 Diffuse shedding across the whole scalp - often temporary and commonly " +
    "associated with stress, illness, fever, childbirth or low iron/B12/vitamin D, " +
    "roughly 2-3 months after the trigger (a pattern doctors call telogen effluvium).\n" +
    "\u2022 Gradual thinning of the crown or a receding hairline - a pattern-based " +
    "thinning most often related to genetic factors.\n\n" +
    "General guidance while you plan care:\n" +
    "\u2022 Eat a balanced diet and keep iron, B12, vitamin D and protein intake " +
    "reasonable - deficiency testing should be arranged by a professional if suspected.\n" +
    "\u2022 Be gentle: avoid tight styles that pull, harsh chemicals and very hot tools.\n" +
    "\u2022 Do not start supplements on your own for this purpose without checking.\n\n" +
    "See a professional sooner if:\n" +
    "\u2022 You notice circular, patchy or coin-shaped hair loss.\n" +
    "\u2022 Hair is coming out in clumps, or the loss is sudden and severe.\n" +
    "\u2022 There is scalp pain, redness, scaling or scarring.\n\n" +
    "This is educational guidance, not a diagnosis."
  );
}

function nailReply(): string {
  return (
    "For nail health, a few general dermatology points are worth keeping in mind:\n\n" +
    "\u2022 Keep nails clean, dry and trimmed to a moderate length.\n" +
    "\u2022 Avoid biting, peeling and aggressive filing or nail products.\n" +
    "\u2022 Nail changes can be slow - improvement usually takes weeks to months.\n\n" +
    "Please have a professional assess the nail if you notice:\n" +
    "\u2022 Thickening, crumbling, yellowish/brown discolouration or separation from the " +
    "nail bed - a possible fungal-type pattern that benefits from proper diagnosis.\n" +
    "\u2022 A dark band or streak that is new, growing or pigmented, or a change in a mole- " +
    "like spot under the nail - this should be examined promptly.\n" +
    "\u2022 Pain, swelling around the nail or discharge.\n\n" +
    "This is general information only."
  );
}

function nailFungalReply(): string {
  return (
    "What you are describing - a thickened, discoloured nail that may be separating " +
    "from the nail bed - is a classic reason to see a dermatologist, because a " +
    "fungal-type pattern (onychomycosis) looks similar to other nail conditions and " +
    "needs proper confirmation before treatment.\n\n" +
    "General points:\n" +
    "\u2022 Keep the foot/nail area clean and dry; avoid leaving damp socks on.\n" +
    "\u2022 Do not self-treat with over-the-counter creams alone for many months.\n" +
    "\u2022 Treating fungal nails generally takes many weeks to months and a doctor " +
    "should guide it.\n\n" +
    "Please arrange a review, especially if there is pain, swelling, pus or a new " +
    "brown/black band. Educational guidance only - not a diagnosis."
  );
}

function acneReply(): string {
  return (
    "Acne is very common and very treatable, so it is reasonable to be proactive. " +
    "A basic approach to discuss with a professional:\n\n" +
    "\u2022 Cleanse gently twice a day with a mild, non-comedogenic cleanser.\n" +
    "\u2022 Avoid popping or squeezing, which can cause dark marks and scarring.\n" +
    "\u2022 Choose non-comedogenic moisturisers, sunscreen and make-up.\n" +
    "\u2022 Keep a routine in place for at least 6-8 weeks - topical treatments take " +
    "time before results are visible.\n\n" +
    "See a professional for:\n" +
    "\u2022 Persistent, painful or deep (nodular) breakouts.\n" +
    "\u2022 Acne causing scarring or significant distress.\n" +
    "\u2022 Sudden onset of acne in an adult after years without it, or alongside other symptoms.\n\n" +
    "Prescription options - including topical and, in some cases, systemic therapy - " +
    "are decided by a qualified doctor. This is general guidance."
  );
}

function eczemaDryReply(): string {
  return (
    "Dry, itchy skin and eczema-type patterns are very common. The cornerstone of " +
    "management in dermatology is consistent barrier care:\n\n" +
    "\u2022 Use a gentle cleanser and avoid very hot water.\n" +
    "\u2022 Moisturise generously - ideally within minutes of washing - with a plain, " +
    "fragrance-free emollient.\n" +
    "\u2022 Avoid known irritants such as harsh soaps, wool directly on skin and " +
    "perfumed products.\n" +
    "\u2022 Keep nails short to reduce damage from scratching.\n\n" +
    "Consult a professional if it is widespread, weeping, very itchy, keeps you up at " +
    "night, or if you see signs of infection (pain, oozing, spreading redness, fever). " +
    "Medicated creams and proper diagnosis belong with a doctor. Educational only."
  );
}

function rashReply(): string {
  return (
    "A rash can have many causes - irritation, allergy, dryness or an infection-like " +
    "pattern - so the most useful first step is a little more detail: where it is, " +
    "what it looks like (flat, raised, blistering), whether it itches or burns, and " +
    "how long it has been present.\n\n" +
    "General measures while you watch it:\n" +
    "\u2022 Stop any newly introduced products, soaps, detergents or fabrics that may be " +
    "irritating it.\n" +
    "\u2022 Wash with mild soap and water, pat dry, and avoid scratching.\n" +
    "\u2022 Do not apply medicated steroid creams without professional advice.\n\n" +
    "Seek care promptly if the rash is spreading fast, blistering, involves the face/eyes/mouth, " +
    "comes with fever or general illness, or is painful - and remember this is educational " +
    "guidance, not a diagnosis."
  );
}

function pigmentationReply(): string {
  return (
    "Thank you for asking about pigmentation. Dark spots or uneven tone can relate to " +
    "post-inflammatory marks, sun exposure or pattern-based pigmentation such as " +
    "melasma - the doctor can identify which after examining it.\n\n" +
    "General advice that applies to most pigmentation concerns:\n" +
    "\u2022 Daily sun protection is the single most important step - use a broad-spectrum " +
    "sunscreen of SPF 30 or higher and reapply, especially in bright conditions.\n" +
    "\u2022 Avoid harsh scrubs and picking at spots while they heal.\n" +
    "\u2022 Skin-lightening or prescription products should only be used after professional " +
    "guidance - some can be damaging if misused.\n\n" +
    "See a professional if a spot is changing in size, shape or colour, is irregular, " +
    "bleeds, or is new and growing. Educational information only."
  );
}

function sunReply(): string {
  return (
    "Taking sun protection seriously is one of the best things anyone can do for " +
    "long-term skin health. Practical dermatology advice:\n\n" +
    "\u2022 Use a broad-spectrum, water-resistant sunscreen with SPF 30 or higher daily, " +
    "even when the sky is cloudy.\n" +
    "\u2022 Apply generously and reapply roughly every 2 hours, more often if swimming " +
    "or sweating.\n" +
    "\u2022 Add shade, a wide-brimmed hat and sunglasses during peak UV hours.\n" +
    "\u2022 Watch any mole or spot that changes in size, shape or colour, or becomes itchy " +
    "or bleeding - and have it reviewed.\n\n" +
    "This is general wellness information about skin protection."
  );
}

function routineReply(): string {
  return (
    "A simple, consistent routine usually beats a complicated one. A reasonable " +
    "skeleton to discuss with a professional:\n\n" +
    "\u2022 Gentle cleanser.\n\u2022 Moisturiser suited to your skin type.\n" +
    "\u2022 Broad-spectrum sunscreen (SPF 30+) in the morning.\n\n" +
    "Additions like specific serums or prescription actives should be guided by your " +
    "skin type and concerns - a dermatologist or pharmacist can advise. Introduce one " +
    "new product at a time and watch for reactions. Educational guidance only."
  );
}

function psoriasisReply(): string {
  return (
    "I understand you may be wondering about psoriasis. Psoriasis typically appears " +
    "as well-defined, thick, silvery-scaled plaques, commonly on elbows, knees, scalp " +
    "and lower back, and it runs a chronic course with flares and quieter periods.\n\n" +
    "General points:\n" +
    "\u2022 Keep skin moisturised and avoid scratching the plaques.\n" +
    "\u2022 Avoid picking scale - it can cause bleeding and Koebner-type new lesions.\n" +
    "\u2022 Many effective treatments exist (topical, phototherapy and systemic in some " +
    "cases), but they must be chosen and monitored by a doctor.\n\n" +
    "Please arrange a professional assessment to confirm whether this applies to you, " +
    "especially if joints are painful or stiff at the same time. Educational information, " +
    "not a diagnosis."
  );
}

function nutritionReply(): string {
  return (
    "Nutrition is relevant to skin, hair and nail health, though it is rarely the " +
    "whole story. A balanced dietary pattern supports the tissues generally:\n\n" +
    "\u2022 Protein: lentils, beans, eggs, dairy, soy, nuts and seeds.\n" +
    "\u2022 Iron: leafy greens, beans, lentils, fortified foods - discuss testing with a " +
    "doctor and avoid self-supplementing large doses.\n" +
    "\u2022 Vitamin B12: eggs, dairy, fortified foods - relevant if dietary intake is low.\n" +
    "\u2022 Vitamin D: fortified foods and sensible sun exposure.\n" +
    "\u2022 Biotin sources: eggs, nuts, seeds, legumes.\n\n" +
    "Deficiencies are diagnosed by testing, and supplements should be aligned to " +
    "actual needs. This is general guidance only."
  );
}

function hydrationReply(): string {
  return (
    "Adequate fluid intake supports general health, and very mild dehydration can " +
    "be reflected in drier skin. Individual needs vary with climate, activity, diet " +
    "and health status, so rather than chasing a fixed number, aim to drink regularly " +
    "through the day and monitor your body's cues.\n\n" +
    "Drinking more water does not cure skin conditions - consistent topical care and, " +
    "where appropriate, professional guidance are what actually change outcomes. " +
    "General wellness information only."
  );
}

function consultReply(): string {
  return (
    "The general rule of thumb I would give as a screening aid: book a " +
    "consultation with a qualified dermatologist or healthcare professional when " +
    "any of these apply:\n\n" +
    "\u2022 Symptoms are severe, painful, spreading or not settling after a few weeks.\n" +
    "\u2022 There is patchy or sudden hair loss, thick/crusted flaking, or nail changes " +
    "with separation or new pigmentation.\n" +
    "\u2022 You have a changing or bleeding mole/spot.\n" +
    "\u2022 The concern is affecting your sleep, work or emotional wellbeing.\n\n" +
    "You can use the Doctor Recommendations page or the WhatsApp booking option on " +
    "any doctor card to start that conversation. DermAI remains a screening aid, " +
    "not a doctor."
  );
}

function severityReply(): string {
  return (
    "DermAI classifies findings as Low, Moderate or High severity - think of these " +
    "as triage-style guidance levels, not medical grades:\n\n" +
    "\u2022 LOW - general wellness guidance and monitoring is reasonable.\n" +
    "\u2022 MODERATE - monitor carefully and consider a professional consultation.\n" +
    "\u2022 HIGH - a qualified dermatologist or healthcare provider review is clearly " +
    "recommended.\n\n" +
    "These are AI-estimated likelihoods from the demo/prototype engine. Your doctor " +
    "will form the definitive assessment in person."
  );
}

function contextAnswer(latest: LatestScreening): string {
  const findings = (latest.predictions || {}).findings || {};
  const parts: string[] = [];
  for (const [k, v] of Object.entries(findings)) {
    if (v && v.label) parts.push(`${k}: ${v.label}`);
  }
  const ctx = parts.length ? parts.join("; ") : "No specific findings recorded";
  return (
    `Your latest DermAI screening (performed ${latest.created_at}) covered ` +
    `${latest.screening_type} analysis.\n\n` +
    `\u2022 Findings: ${ctx}.\n` +
    `\u2022 Overall severity: ${latest.overall_severity}.\n` +
    `\u2022 AI confidence: ${latest.overall_confidence ?? "not available"}.\n\n` +
    "These are preliminary AI-assisted estimates for education and triage - they are " +
    "not a medical diagnosis. If the area is worsening, painful, spreading or newly " +
    "bleeding, please arrange an in-person review with a qualified professional."
  );
}

function resultAnswer(latest: LatestScreening): string {
  return (
    `Your latest DermAI screening (performed ${latest.created_at}) was a ` +
    `${latest.screening_type} screening with overall severity ` +
    `${latest.overall_severity} and AI confidence ${latest.overall_confidence}.` +
    `\n\nThese values are preliminary estimates from the demo screening engine. ` +
    "The full report, including images and a downloadable PDF, is on the History " +
    "page. I can help you find a dermatologist or explain how severity levels work - " +
    "just ask."
  );
}

function defaultReply(): string {
  return (
    "Thank you for sharing that. To make sure I give you the most useful general " +
    "guidance, could you tell me a little more about:\n" +
    "\u2022 the area affected (scalp, hair, nails, skin),\n" +
    "\u2022 roughly how long you have noticed it, and\n" +
    "\u2022 any other symptoms such as itch, pain, redness or discharge?\n\n" +
    "As general interim guidance: keep the area clean and dry, avoid scratching or " +
    "aggressive products, and do not stop or start any treatment on your own " +
    "without professional advice. If things are severe, worsening or painful, " +
    "please consult a qualified healthcare professional. This is educational " +
    "information, not a diagnosis."
  );
}

function isContextQuery(msg: string): boolean {
  return (
    msg.includes("my screening") ||
    msg.includes("my result") ||
    msg.includes("context") ||
    msg.includes("latest screening")
  );
}

export function chatbotRespond(
  message: string,
  latestScreening?: LatestScreening | null
): string {
  const msg = (message || "").trim().toLowerCase();
  if (!msg) return defaultReply();

  if (hasAny(msg, URGENT_WORDS)) return urgentReply();

  if (latestScreening && isContextQuery(msg)) return contextAnswer(latestScreening);

  if (hasAny(msg, ["screening", "result", "report", "findings", "pdf", "severity", "likely", "percentage"])) {
    if (hasAny(msg, ["my screening", "my result", "my report", "latest", "context", "result"]) && latestScreening) {
      if (hasAny(msg, ["severity", "my severity"])) return severityReply();
      return resultAnswer(latestScreening);
    }
  }

  if (hasAny(msg, ["severity", "severe", "mild", "moderate", "serious", "high risk", "low risk"])) {
    return severityReply();
  }

  if (hasAny(msg, ["hello", "hi ", "hey", "good morning", "good evening", "good afternoon", "namaste", "welcome"])) {
    return greetReply();
  }

  if (hasAny(msg, ["what is dermai", "what do you do", "about you", "who are you", "yourself", "what can you do", "help me"])) {
    return whatIsDermaiReply();
  }

  if (hasAny(msg, ["dandruff", "flakes", "flaking", "scaly", "seborrhe", "seborrhoe", "scalp wash"])) {
    return dandruffReply();
  }

  if (hasAny(msg, ["itchy scalp", "itch scalp", "scalp itch", "itching scalp"])) {
    return itchScalpReply();
  }

  if (hasAny(msg, ["hair fall", "hair loss", "hair shedding", "thinning hair", "thinning", "bald", "receding", "alopecia", "telogen", "shedding"])) {
    return hairFallReply();
  }

  if (hasAny(msg, ["hair gain", "grow hair", "hair growth", "regrow", "growth of hair"])) {
    return hairFallReply();
  }

  if (hasAny(msg, ["onychomycos", "fungal nail", "nail fung", "thickened nail", "thick nail", "nail thickening", "yellow nail", "nail separating"])) {
    return nailFungalReply();
  }

  if (hasAny(msg, ["nail", "nails", "brittle nail", "weak nail", "nail discolour", "nail discolor"])) {
    return nailReply();
  }

  if (hasAny(msg, ["acne", "pimple", "pimples", "breakout", "zit", "blackhead", "whitehead"])) {
    return acneReply();
  }

  if (hasAny(msg, ["eczema", "dermatitis", "dry skin", "dryness", "flaky skin", "xerosis"])) {
    return eczemaDryReply();
  }

  if (hasAny(msg, ["psoriasis", "silvery", "plaque", "plaques"])) {
    return psoriasisReply();
  }

  if (hasAny(msg, ["rash", "hive", "hives", "redness", "red skin", "irritation", "allerg", "contact derm"])) {
    return rashReply();
  }

  if (hasAny(msg, ["pigment", "dark spot", "dark spots", "melasma", "tan", "suntan", "discolor", "discolour"])) {
    return pigmentationReply();
  }

  if (hasAny(msg, ["sunscreen", "sun protection", "spf", "uv", "sun cream"])) {
    return sunReply();
  }

  if (hasAny(msg, ["skincare", "skin care", "routine", "moistur", "cleanser", "wash face", "serum", "face wash"])) {
    return routineReply();
  }

  if (hasAny(msg, ["diet", "food", "vitamin", "nutrition", "iron", "biotin", "protein", "b12", "supplement"])) {
    return nutritionReply();
  }

  if (hasAny(msg, ["water", "drink", "hydration", "dehydrat", "fluid"])) {
    return hydrationReply();
  }

  if (hasAny(msg, ["consult", "doctor", "dermatologist", "appointment", "referral", "specialist", "when to see", "book"])) {
    return consultReply();
  }

  if (hasAny(msg, ["precaution", "avoid", "prevent", "care tip", "tips", "home care"])) {
    return consultReply();
  }

  if (hasAny(msg, ["thank", "thanks", "helpful", "great", "understood", "okay", "ok "])) {
    return (
      "You are very welcome. I hope the information is helpful. Remember: DermAI is " +
      "an educational screening aid - for a definitive opinion, a personal examination " +
      "and any treatment, please consult a qualified dermatologist or healthcare " +
      "professional. Is there anything else you would like to discuss about your skin, " +
      "scalp, hair or nails?"
    );
  }

  if (hasAny(msg, ["disclaimer", "diagnosis", "medical advice", "trust", "accurate"])) {
    return CHAT_DISCLAIMER;
  }

  return defaultReply();
}