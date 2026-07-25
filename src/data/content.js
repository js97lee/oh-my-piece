import englishHighImage from "../../assets/card-english-high.jpg";
import englishMidImage from "../../assets/card-english-mid.jpg";
import englishBasicImage from "../../assets/card-english-basic.jpg";
import mathHighImage from "../../assets/card-math-high.jpg";
import mathMidImage from "../../assets/card-math-mid.jpg";
import mathBasicImage from "../../assets/card-math-basic.jpg";

const pricingByLevel = {
  basic: {
    totalPrice: "39,000원",
    monthlyPrice: "월 3,250원",
  },
  middle: {
    totalPrice: "59,000원",
    monthlyPrice: "월 4,917원",
  },
  high: {
    totalPrice: "79,000원",
    monthlyPrice: "월 6,583원",
  },
};

export const contentSections = [
  {
    id: "all",
    title: "매일 학습 콘텐츠",
    subtitle: "영어·수학, 내 수준에 맞게 선택하세요",
    cards: [
      {
        slug: "english-advanced",
        title: "영어 上",
        coverTitle: "고급 어휘와 독해\n영어 上",
        subtitle: "영어 上 · 심화 학습",
        image: englishHighImage,
        description: "고급 어휘·긴 문장·심화 독해",
        detailDescription: "고급 어휘와 복합 문장, 심화 독해 문제를 매일 짧게 학습하며 한 단계 높은 영어 실력을 완성하는 콘텐츠입니다.",
        detailHeading: "영어 上은 이렇게 학습해요",
        detailPoints: [
          { title: "고급 어휘", body: "문맥에서 자주 쓰이는 고급 단어와 표현을 익혀요." },
          { title: "심화 독해", body: "긴 문장의 구조와 핵심 논리를 빠르게 파악해요." },
          { title: "실전 문제", body: "매일 짧은 문제로 이해도와 응용력을 점검해요." },
        ],
        lessonSteps: [
          { title: "오늘의 고급 문장", body: "핵심 문장을 먼저 읽고 문맥을 예측해요." },
          { title: "어휘와 구문 분석", body: "고급 어휘와 복합 구문을 문장 안에서 익혀요." },
          { title: "심화 독해 문제", body: "주제·추론·빈칸 유형 문제로 이해도를 점검해요." },
          { title: "해설로 마무리", body: "오답 포인트와 자연스러운 해석을 다시 확인해요." },
        ],
        weeklyPlan: ["월 · 고급 어휘와 문맥", "화 · 복합 구문 분석", "수 · 주제와 요지 찾기", "목 · 추론과 빈칸 문제", "금 · 주간 실전 복습"],
        recommendedFor: ["중급 영어를 넘어 심화 학습이 필요한 분", "고급 어휘와 독해력을 높이고 싶은 분", "짧게 실전 감각을 유지하고 싶은 분"],
        ...pricingByLevel.high,
        level: "high",
        discount: "上 LEVEL",
      },
      {
        slug: "english-intermediate",
        title: "영어 中",
        coverTitle: "문법과 독해를 탄탄하게\n영어 中",
        subtitle: "영어 中 · 핵심 학습",
        image: englishMidImage,
        description: "핵심 문법·생활 표현·짧은 독해",
        detailDescription: "자주 쓰는 문법과 생활 표현, 짧은 독해를 균형 있게 학습하며 영어의 기본기를 탄탄하게 만드는 콘텐츠입니다.",
        detailHeading: "영어 中은 이렇게 학습해요",
        detailPoints: [
          { title: "핵심 문법", body: "회화와 독해에 필요한 문법을 예문으로 이해해요." },
          { title: "생활 표현", body: "일상에서 바로 사용할 수 있는 표현을 익혀요." },
          { title: "짧은 독해", body: "부담 없는 지문과 문제로 문장 이해력을 키워요." },
        ],
        lessonSteps: [
          { title: "오늘의 문법", body: "하나의 핵심 문법을 쉬운 설명으로 확인해요." },
          { title: "생활 예문", body: "실제 대화에서 쓰이는 문장으로 활용법을 익혀요." },
          { title: "짧은 독해", body: "배운 문법이 포함된 짧은 글을 읽고 이해해요." },
          { title: "확인 퀴즈", body: "객관식과 빈칸 문제로 오늘의 학습을 마무리해요." },
        ],
        weeklyPlan: ["월 · 시제와 기본 문장", "화 · 조동사와 표현", "수 · 비교와 수식", "목 · 생활 영어 독해", "금 · 주간 문법 복습"],
        recommendedFor: ["기초 영어 다음 단계가 필요한 분", "문법과 회화를 함께 공부하고 싶은 분", "꾸준히 독해 습관을 만들고 싶은 분"],
        ...pricingByLevel.middle,
        level: "middle",
        discount: "中 LEVEL",
      },
      {
        slug: "daily-english-word",
        title: "영어 下",
        coverTitle: "하루 3개부터 가볍게\n영어 下",
        subtitle: "영어 下 · 기초 학습",
        image: englishBasicImage,
        description: "기초 단어·발음·짧은 예문",
        detailDescription: "꼭 필요한 기초 단어와 발음, 짧은 예문을 매일 3개씩 익히며 영어 학습의 첫 습관을 만드는 콘텐츠입니다.",
        detailHeading: "영어 下 단계는 이렇게 학습해요",
        detailPoints: [
          { title: "기초 단어 3개", body: "매일 꼭 알아야 할 단어를 부담 없이 익혀요." },
          { title: "발음과 뜻", body: "정확한 발음과 가장 자주 쓰이는 뜻을 확인해요." },
          { title: "짧은 예문", body: "쉬운 문장으로 단어가 쓰이는 방법을 이해해요." },
        ],
        lessonSteps: [
          { title: "단어 3개 확인", body: "오늘 익힐 기초 단어를 그림과 함께 확인해요." },
          { title: "소리 내어 읽기", body: "발음과 강세를 따라 읽으며 소리에 익숙해져요." },
          { title: "쉬운 예문", body: "단어가 들어간 한 줄 문장으로 쓰임을 이해해요." },
          { title: "단어 퀴즈", body: "뜻 고르기와 빈칸 채우기로 가볍게 복습해요." },
        ],
        weeklyPlan: ["월 · 일상과 인사", "화 · 사람과 감정", "수 · 음식과 생활", "목 · 장소와 이동", "금 · 주간 단어 복습"],
        recommendedFor: ["영어를 처음부터 다시 시작하는 분", "단어 암기가 부담스러운 분", "매일 짧게 영어 습관을 만들고 싶은 분"],
        ...pricingByLevel.basic,
        level: "basic",
        discount: "下 LEVEL",
      },
      {
        slug: "math-advanced",
        title: "수학 上",
        coverTitle: "사고력과 응용력을 높이는\n수학 上",
        subtitle: "수학 上 · 심화 학습",
        image: mathHighImage,
        description: "심화 개념·고난도 유형·사고력",
        detailDescription: "핵심 개념을 바탕으로 고난도 유형과 사고력 문제를 매일 해결하며 수학적 응용력을 높이는 콘텐츠입니다.",
        detailHeading: "수학 上은 이렇게 학습해요",
        detailPoints: [
          { title: "심화 개념", body: "기본 개념이 문제에서 어떻게 확장되는지 이해해요." },
          { title: "고난도 유형", body: "자주 틀리는 심화 유형의 풀이 전략을 익혀요." },
          { title: "사고력 문제", body: "한 단계 더 생각하는 문제로 응용력을 키워요." },
        ],
        lessonSteps: [
          { title: "개념 확장", body: "기본 공식을 새로운 조건에 적용하는 방법을 확인해요." },
          { title: "대표 심화 예제", body: "고난도 유형의 핵심 발상을 단계별로 따라가요." },
          { title: "도전 문제", body: "여러 개념이 결합된 문제를 스스로 해결해요." },
          { title: "다른 풀이 비교", body: "더 빠르고 정확한 풀이 전략을 비교하며 익혀요." },
        ],
        weeklyPlan: ["월 · 개념 확장", "화 · 조건 해석", "수 · 복합 유형", "목 · 사고력 도전", "금 · 주간 심화 테스트"],
        recommendedFor: ["기본 유형을 충분히 익힌 분", "고난도 문제 해결력을 높이고 싶은 분", "심화 수학을 매일 꾸준히 학습하고 싶은 분"],
        ...pricingByLevel.high,
        level: "high",
        discount: "上 LEVEL",
      },
      {
        slug: "math-intermediate",
        title: "수학 中",
        coverTitle: "핵심 개념과 유형을 탄탄하게\n수학 中",
        subtitle: "수학 中 · 핵심 학습",
        image: mathMidImage,
        description: "핵심 개념·대표 유형·풀이 과정",
        detailDescription: "꼭 알아야 할 핵심 개념과 대표 유형을 매일 반복하며 흔들리지 않는 수학 기본기를 만드는 콘텐츠입니다.",
        detailHeading: "수학 中은 이렇게 학습해요",
        detailPoints: [
          { title: "핵심 개념", body: "오늘 학습할 개념을 짧고 명확하게 정리해요." },
          { title: "대표 유형", body: "개념이 적용되는 대표 문제를 단계별로 풀어요." },
          { title: "풀이 점검", body: "풀이 과정에서 놓치기 쉬운 부분을 확인해요." },
        ],
        lessonSteps: [
          { title: "개념 한눈에 보기", body: "오늘 필요한 개념과 공식을 짧게 정리해요." },
          { title: "대표 예제", body: "가장 자주 출제되는 유형을 풀이 순서대로 익혀요." },
          { title: "유형 연습", body: "숫자와 조건이 달라진 문제로 적용력을 높여요." },
          { title: "실수 점검", body: "계산과 조건 확인에서 놓친 부분을 되짚어봐요." },
        ],
        weeklyPlan: ["월 · 핵심 개념", "화 · 기본 유형", "수 · 응용 유형", "목 · 서술형 풀이", "금 · 주간 유형 복습"],
        recommendedFor: ["개념과 문제 풀이를 함께 익히고 싶은 분", "유형별 풀이가 아직 익숙하지 않은 분", "매일 수학 학습량을 유지하고 싶은 분"],
        ...pricingByLevel.middle,
        level: "middle",
        discount: "中 LEVEL",
      },
      {
        slug: "math-basic",
        title: "수학 下",
        coverTitle: "기초부터 차근차근\n수학 下",
        subtitle: "수학 下 · 기초 학습",
        image: mathBasicImage,
        description: "기초 연산·쉬운 개념·반복 문제",
        detailDescription: "기초 연산과 쉬운 개념 설명, 반복 문제를 통해 수학에 대한 부담을 줄이고 매일의 학습 습관을 만드는 콘텐츠입니다.",
        detailHeading: "수학 下 단계는 이렇게 학습해요",
        detailPoints: [
          { title: "기초 연산", body: "꼭 필요한 계산을 짧게 반복하며 정확도를 높여요." },
          { title: "쉬운 개념", body: "그림과 예시로 수학 개념을 부담 없이 이해해요." },
          { title: "반복 문제", body: "비슷한 문제를 다시 풀며 배운 내용을 기억해요." },
        ],
        lessonSteps: [
          { title: "오늘의 연산", body: "짧은 계산 문제로 손을 풀고 정확도를 높여요." },
          { title: "쉬운 개념 설명", body: "그림과 생활 속 예시로 개념을 이해해요." },
          { title: "따라 풀기", body: "풀이 순서를 한 단계씩 따라가며 문제를 해결해요." },
          { title: "한 번 더 복습", body: "비슷한 문제를 다시 풀며 자신감을 쌓아요." },
        ],
        weeklyPlan: ["월 · 수와 연산", "화 · 규칙과 관계", "수 · 도형 기초", "목 · 측정과 단위", "금 · 주간 기초 복습"],
        recommendedFor: ["수학의 기초부터 다시 시작하는 분", "연산 실수를 줄이고 싶은 분", "쉬운 문제로 자신감을 쌓고 싶은 분"],
        ...pricingByLevel.basic,
        level: "basic",
        discount: "下 LEVEL",
      },
    ],
  },
];

export const allContent = contentSections.flatMap((section) => section.cards);

export function getContentBySlug(slug) {
  return allContent.find((content) => content.slug === slug);
}
