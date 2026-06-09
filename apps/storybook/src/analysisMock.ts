import type { AnalysisResultData } from "@nado/ui";

export const analysisMock: AnalysisResultData = {
  sourceText:
    "Many developers choose a framework because it promises faster shipping, but the real test appears after the product grows. A simple setup can help a small team move quickly, while unclear rules can make every change harder to review. Before adding tools, the team should understand which problems are frequent, which costs are acceptable, and when a lighter process is enough. This habit keeps the codebase easier to maintain without slowing the product team down as the company changes.",
  translation: [
    "개발자들은 프레임워크가 더 빠른 출시를 가능하게 해줄 거라고 기대하며 선택하지만, 실제 검증은 제품이 커진 뒤에 시작됩니다.",
    "단순한 구성은 작은 팀이 빠르게 움직이게 도와주지만, 규칙이 흐릿하면 모든 변경을 검토하는 일이 더 어려워질 수 있습니다.",
    "도구를 추가하기 전에 팀은 자주 반복되는 문제가 무엇인지, 감당 가능한 비용은 어디까지인지, 더 가벼운 절차로 충분한 순간은 언제인지 먼저 이해해야 합니다.",
    "이런 습관은 회사가 바뀌어도 제품 팀의 속도를 과하게 늦추지 않으면서 코드베이스를 유지보수하기 쉬운 상태로 지켜줍니다.",
  ],
  translationNotes: [
    {
      term: "promises faster shipping",
      note: "개발 맥락에서는 “더 빠른 배송”보다 “더 빠른 출시/배포”에 가깝다.",
    },
    {
      term: "the real test appears",
      note: "문자 그대로의 시험보다 제품 성장 후 드러나는 유지보수 난관을 뜻한다.",
    },
    {
      term: "lighter process is enough",
      note: "절차가 가볍다는 뜻보다 과한 도구 없이도 충분한 수준을 말한다.",
    },
  ],
  sentences: [
    {
      indexLabel: "문장 1",
      chunks: [
        {
          english: "Many developers choose a framework",
          korean: "많은 개발자들은 프레임워크를 선택합니다",
        },
        {
          english: "because it promises faster shipping",
          korean: "그것이 더 빠른 출시를 약속하기 때문에",
        },
        {
          english: "but the real test appears after the product grows",
          korean: "하지만 진짜 시험은 제품이 성장한 뒤에 나타납니다",
        },
      ],
      naturalTranslation:
        "많은 개발자들은 더 빠른 출시를 기대하며 프레임워크를 선택하지만, 제품이 성장한 뒤에야 진짜 문제가 드러납니다.",
      grammarPoints: [
        {
          target: "because",
          type: "이유 접속사",
          explanation: "프레임워크를 선택한 이유를 설명합니다.",
        },
        {
          target: "but",
          type: "대조 접속사",
          explanation: "기대와 실제 테스트를 대조합니다.",
        },
      ],
    },
    {
      indexLabel: "문장 2",
      chunks: [
        {
          english: "A simple setup can help a small team move quickly",
          korean: "단순한 설정은 작은 팀이 빠르게 움직이도록 도울 수 있습니다",
        },
        {
          english: "while unclear rules can make every change harder to review",
          korean:
            "반면 불명확한 규칙은 모든 변경을 검토하기 더 어렵게 만들 수 있습니다",
        },
      ],
      naturalTranslation:
        "단순한 구성은 작은 팀이 빠르게 움직이게 도와주지만, 규칙이 흐릿하면 모든 변경을 검토하는 일이 더 어려워질 수 있습니다.",
      grammarPoints: [
        {
          target: "help a team move",
          type: "help + 목적어 + 동사원형",
          explanation: "팀이 움직이도록 돕는다는 구조입니다.",
        },
        {
          target: "make every change harder",
          type: "make + 목적어 + 형용사",
          explanation: "변경을 더 어렵게 만든다는 의미를 만듭니다.",
        },
      ],
    },
    {
      indexLabel: "문장 3",
      chunks: [
        {
          english: "Before adding tools",
          korean: "도구를 추가하기 전에",
        },
        {
          english: "the team should understand which problems are frequent",
          korean: "팀은 어떤 문제가 자주 발생하는지 이해해야 합니다",
        },
        {
          english: "which costs are acceptable",
          korean: "어떤 비용이 받아들일 수 있는지",
        },
        {
          english: "and when a lighter process is enough",
          korean: "그리고 언제 더 가벼운 절차로 충분한지",
        },
      ],
      naturalTranslation:
        "도구를 추가하기 전에 팀은 자주 반복되는 문제가 무엇인지, 감당 가능한 비용은 어디까지인지, 더 가벼운 절차로 충분한 순간은 언제인지 먼저 이해해야 합니다.",
      grammarPoints: [
        {
          target: "Before adding",
          type: "전치사 + 동명사",
          explanation: "“추가하기 전에”라는 시간 조건입니다.",
        },
        {
          target: "which / when",
          type: "간접의문문",
          explanation: "understand의 목적어 역할을 하는 질문 덩어리입니다.",
        },
      ],
    },
    {
      indexLabel: "문장 4",
      chunks: [
        {
          english: "This habit keeps the codebase easier to maintain",
          korean:
            "이 습관은 코드베이스를 유지보수하기 더 쉬운 상태로 유지합니다",
        },
        {
          english: "without slowing the product team down",
          korean: "제품 팀의 속도를 늦추지 않으면서",
        },
        {
          english: "as the company changes",
          korean: "회사가 변하는 동안",
        },
      ],
      naturalTranslation:
        "이런 습관은 회사가 바뀌어도 제품 팀의 속도를 과하게 늦추지 않으면서 코드베이스를 유지보수하기 쉬운 상태로 지켜줍니다.",
      grammarPoints: [
        {
          target: "keeps the codebase easier",
          type: "keep + 목적어 + 형용사",
          explanation: "코드베이스를 더 쉬운 상태로 유지한다는 구조입니다.",
        },
        {
          target: "without slowing",
          type: "without + 동명사",
          explanation: "속도를 늦추지 않는 조건을 붙입니다.",
        },
        {
          target: "as the company changes",
          type: "시간 접속사",
          explanation: "회사가 변하는 동안이라는 배경을 덧붙입니다.",
        },
      ],
    },
  ],
  vocabularySuggestions: [
    {
      term: "framework",
      meaning: "프레임워크",
      type: "word",
    },
    {
      term: "shipping",
      meaning: "출시/배포",
      type: "word",
    },
    {
      term: "setup",
      meaning: "구성",
      type: "word",
    },
    {
      term: "acceptable",
      meaning: "감수 가능한",
      type: "word",
    },
    {
      term: "lighter process",
      meaning: "더 가벼운 절차",
      type: "phrase",
    },
    {
      term: "maintain",
      meaning: "유지보수하다",
      type: "word",
    },
  ],
};
