const TOTAL_DAYS = 365;

const englishBasicWords = [
  { word: "apple", meaning: "사과", example: "I eat an apple." },
  { word: "book", meaning: "책", example: "This is my book." },
  { word: "water", meaning: "물", example: "I drink water." },
  { word: "happy", meaning: "행복한", example: "I feel happy today." },
  { word: "friend", meaning: "친구", example: "She is my friend." },
  { word: "school", meaning: "학교", example: "I go to school." },
  { word: "morning", meaning: "아침", example: "Good morning!" },
  { word: "family", meaning: "가족", example: "I love my family." },
  { word: "music", meaning: "음악", example: "I like music." },
  { word: "window", meaning: "창문", example: "Open the window." },
  { word: "garden", meaning: "정원", example: "The garden is green." },
  { word: "travel", meaning: "여행하다", example: "We travel often." },
];

const englishMidTopics = [
  { focus: "현재완료", tip: "have/has + p.p.로 과거부터 지금까지의 경험을 말해요." },
  { focus: "조동사 can/could", tip: "능력·가능·허락을 부드럽게 표현해요." },
  { focus: "비교급", tip: "형용사 + -er / more + 형용사로 비교해요." },
  { focus: "관계대명사 who", tip: "사람을 꾸밀 때 who를 사용해요." },
  { focus: "수동태", tip: "be + p.p.로 주어가 동작을 받는 상황을 말해요." },
  { focus: "가정법", tip: "If + 과거, would + 동사원형으로 가정해요." },
];

const englishHighPassages = [
  {
    theme: "지속 가능한 도시",
    sentence: "Sustainable cities prioritize public transit and green spaces.",
    question: "이 문장의 핵심 요지는?",
    choices: ["도시가 자동차만 늘린다", "대중교통과 녹지를 중시한다", "도시를 완전히 없앤다"],
    answerIndex: 1,
    explanation: "prioritize는 ‘우선시하다’로, 대중교통과 녹지 공간을 중시한다는 뜻입니다.",
  },
  {
    theme: "기억과 학습",
    sentence: "Spaced repetition strengthens long-term memory more reliably than cramming.",
    question: "이 문장이 강조하는 학습 방법은?",
    choices: ["벼락치기", "간격 반복", "한 번에 몰아서 외우기"],
    answerIndex: 1,
    explanation: "spaced repetition(간격 반복)이 장기 기억에 더 효과적이라고 말합니다.",
  },
  {
    theme: "디지털 집중력",
    sentence: "Constant notifications fragment attention and reduce deep work.",
    question: "알림이 집중력에 미치는 영향은?",
    choices: ["집중을 깊게 만든다", "주의를 분산시킨다", "영향을 주지 않는다"],
    answerIndex: 1,
    explanation: "fragment attention은 주의를 조각내어 깊은 작업을 방해한다는 의미입니다.",
  },
];

const mathBasicProblems = [
  { prompt: "12 + 9 = ?", answer: "21", explanation: "12에 9를 더하면 21입니다." },
  { prompt: "45 − 18 = ?", answer: "27", explanation: "45에서 18을 빼면 27입니다." },
  { prompt: "7 × 8 = ?", answer: "56", explanation: "7 곱하기 8은 56입니다." },
  { prompt: "36 ÷ 6 = ?", answer: "6", explanation: "36을 6으로 나누면 6입니다." },
  { prompt: "15의 2배는?", answer: "30", explanation: "15 × 2 = 30입니다." },
];

const mathMidProblems = [
  { prompt: "방정식 2x + 5 = 17에서 x의 값은?", answer: "6", explanation: "2x = 12 → x = 6입니다." },
  { prompt: "삼각형의 내각의 합은?", answer: "180°", explanation: "모든 삼각형의 내각의 합은 180°입니다." },
  { prompt: "원의 둘레 공식은? (반지름 r)", answer: "2πr", explanation: "원둘레 = 2πr입니다." },
  { prompt: "일차함수 y = 3x − 1의 기울기는?", answer: "3", explanation: "y = ax + b에서 a가 기울기입니다." },
];

const mathHighProblems = [
  {
    prompt: "함수 f(x) = x² − 4x + 3의 최솟값은?",
    answer: "−1",
    explanation: "f(x) = (x−2)² − 1이므로 x=2에서 최솟값 −1입니다.",
  },
  {
    prompt: "등차수열 a_n = 3n − 1의 10번째 항은?",
    answer: "29",
    explanation: "a_10 = 3×10 − 1 = 29입니다.",
  },
  {
    prompt: "확률 P(A) = 0.4, P(B) = 0.5이고 독립일 때 P(A∩B)는?",
    answer: "0.2",
    explanation: "독립이면 P(A∩B) = P(A)·P(B) = 0.4×0.5 = 0.2입니다.",
  },
];

function clampDay(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return 1;
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(n)));
}

function pick(list, day, offset = 0) {
  return list[(day - 1 + offset) % list.length];
}

function dateFromStart(startDate, day) {
  const date = new Date(startDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + (day - 1));
  return date;
}

function formatKoreanDate(date) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${weekdays[date.getDay()]})`;
}

function buildEnglishBasic(day) {
  const words = [0, 1, 2].map((offset) => pick(englishBasicWords, day, offset));
  return {
    kind: "english-basic",
    kakaoPreview: `오늘의 영어 단어 3개\n1. ${words[0].word}\n2. ${words[1].word}\n3. ${words[2].word}`,
    promptTitle: "오늘의 단어",
    promptBody: "카카오톡으로 받은 단어를 확인하고, 아래에서 뜻과 예문을 맞춰 보세요.",
    items: words.map((item) => ({
      label: item.word,
      body: item.example,
    })),
    question: `"${words[0].word}"의 뜻은?`,
    answer: words[0].meaning,
    explanation: words
      .map((item) => `${item.word} — ${item.meaning}\n예문: ${item.example}`)
      .join("\n\n"),
  };
}

function buildEnglishMid(day) {
  const topic = pick(englishMidTopics, day);
  const sentenceBank = [
    `I have studied English for ${2 + (day % 5)} years.`,
    `She could finish the homework before dinner.`,
    `This book is more interesting than that one.`,
    `The student who asked the question was curious.`,
    `The window was opened by my brother.`,
    `If I had time, I would join the club.`,
  ];
  const sentence = pick(sentenceBank, day);
  return {
    kind: "english-mid",
    kakaoPreview: `오늘의 문법 · ${topic.focus}\n\n${sentence}`,
    promptTitle: `문법 포인트 · ${topic.focus}`,
    promptBody: sentence,
    items: [{ label: "힌트", body: "문장 구조와 핵심 표현을 먼저 표시해 보세요." }],
    question: `이 문장에서 오늘의 문법(${topic.focus})이 쓰인 부분을 찾아보세요. 정답은?`,
    answer: topic.focus,
    explanation: `${topic.tip}\n\n예문: ${sentence}`,
  };
}

function buildEnglishHigh(day) {
  const passage = pick(englishHighPassages, day);
  return {
    kind: "english-high",
    kakaoPreview: `오늘의 심화 독해 · ${passage.theme}\n\n${passage.sentence}`,
    promptTitle: `독해 · ${passage.theme}`,
    promptBody: passage.sentence,
    items: passage.choices.map((choice, index) => ({
      label: `${index + 1}`,
      body: choice,
    })),
    question: passage.question,
    answer: passage.choices[passage.answerIndex],
    explanation: passage.explanation,
  };
}

function buildMath(day, bank, label) {
  const problem = pick(bank, day);
  return {
    kind: "math",
    kakaoPreview: `오늘의 ${label}\n\n${problem.prompt}`,
    promptTitle: `오늘의 ${label}`,
    promptBody: problem.prompt,
    items: [{ label: "풀이 팁", body: "조건을 정리한 뒤 식을 세워 보세요." }],
    question: "정답은 무엇일까요?",
    answer: problem.answer,
    explanation: problem.explanation,
  };
}

function buildLessonBody(slug, day) {
  switch (slug) {
    case "daily-english-word":
      return buildEnglishBasic(day);
    case "english-intermediate":
      return buildEnglishMid(day);
    case "english-advanced":
      return buildEnglishHigh(day);
    case "math-basic":
      return buildMath(day, mathBasicProblems, "기초 수학");
    case "math-intermediate":
      return buildMath(day, mathMidProblems, "핵심 수학");
    case "math-advanced":
      return buildMath(day, mathHighProblems, "심화 수학");
    default:
      return buildEnglishBasic(day);
  }
}

export function getSubscriptionDayCount() {
  return TOTAL_DAYS;
}

export function getCurrentSubscriptionDay(startDate, now = new Date()) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - start) / 86400000) + 1;
  return clampDay(diff);
}

export function getDailyLesson(slug, day, startDate) {
  const safeDay = clampDay(day);
  const date = dateFromStart(startDate, safeDay);
  const body = buildLessonBody(slug, safeDay);

  return {
    day: safeDay,
    totalDays: TOTAL_DAYS,
    dateLabel: formatKoreanDate(date),
    dateIso: date.toISOString().slice(0, 10),
    ...body,
  };
}

export function getDaySummaries(slug, startDate, unlockedThroughDay) {
  return Array.from({ length: TOTAL_DAYS }, (_, index) => {
    const day = index + 1;
    const lesson = getDailyLesson(slug, day, startDate);
    return {
      day,
      dateLabel: lesson.dateLabel,
      preview: lesson.kakaoPreview.split("\n")[0],
      unlocked: day <= unlockedThroughDay,
      isToday: day === unlockedThroughDay,
    };
  });
}
