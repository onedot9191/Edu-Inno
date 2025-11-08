import { useState } from 'react'
import OpenAI from 'openai'

// 진행 단계 표시 컴포넌트
function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-40 py-4 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-purple-600">
            {currentStep}/{totalSteps}단계
          </span>
          <span className="text-lg text-gray-600">진행 중...</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// AI 캐릭터 가이드 컴포넌트
function AIGuide({ message, emoji = "🤖" }) {
  return (
    <div className="mb-8 flex justify-center animate-bounce-gentle">
      <div className="relative bg-white rounded-3xl shadow-xl p-6 max-w-2xl border-4 border-yellow-300">
        {/* 말풍선 꼬리 */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[16px] border-t-yellow-300" />
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-white" />
        
        <div className="flex items-center gap-4">
          <div className="text-5xl">{emoji}</div>
          <p className="text-xl font-bold text-gray-800 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

// 별점 컴포넌트
function StarRating({ rating, onRatingChange }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className="text-4xl hover:scale-125 transform transition-all duration-150"
        >
          {star <= rating ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  )
}

function App() {
  const [item, setItem] = useState('')
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  
  // 평가 기준 선택 관련
  const [showCriteriaSelection, setShowCriteriaSelection] = useState(false)
  const [selectedCriteria, setSelectedCriteria] = useState([])
  const [customCriterion, setCustomCriterion] = useState('')
  
  // AI 넛지 및 최종 확인
  const [showNudge, setShowNudge] = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState('')
  const [showFinalCheck, setShowFinalCheck] = useState(false)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [showBudgetWarning, setShowBudgetWarning] = useState(false)
  
  // 추천 평가 기준 목록
  const suggestedCriteria = [
    { id: 'price', label: '💰 가격', emoji: '💰' },
    { id: 'design', label: '🎨 디자인', emoji: '🎨' },
    { id: 'environment', label: '🌱 환경', emoji: '🌱' },
    { id: 'performance', label: '⚡ 성능', emoji: '⚡' },
    { id: 'size', label: '📏 크기', emoji: '📏' },
    { id: 'durability', label: '💪 튼튼함', emoji: '💪' }
  ]
  
  // 의사결정 표 평가 점수 상태 (동적으로 변경)
  const [ratings, setRatings] = useState({
    0: {},
    1: {},
    2: {}
  })
  
  // 학습 정리 관련 상태
  const [showLearningSummary, setShowLearningSummary] = useState(false)
  const [answerA, setAnswerA] = useState('')
  const [answerB, setAnswerB] = useState('')
  const [aiFeedback, setAiFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!item.trim()) {
      setError('사고 싶은 물건을 입력해주세요! 📝')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // AI에게 물건에 맞는 예산 범위 물어보기
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      })

      const budgetResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '너는 초등학생의 쇼핑 예산을 설정하는 도우미야. 물건 종류에 맞는 현실적이고 구체적인 예산 범위를 제시해. 최소값은 반드시 1000원 이상이어야 하고, 초등학생이 실제로 살 수 있는 가격대여야 해.'
          },
          {
            role: 'user',
            content: `초등학생이 "${item}"을(를) 사고 싶어해. 이 물건을 실제로 살 수 있는 현실적인 예산 범위의 최소값과 최대값을 알려줘. 최소값은 반드시 1000원 이상이어야 하고, 최대값은 최소값보다 커야 해. 반드시 JSON 형식으로 답해: {"min": 최소값(숫자, 1000 이상), "max": 최대값(숫자, min보다 큼)}`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const budgetRange = JSON.parse(budgetResponse.choices[0].message.content)
      let minBudget = Math.max(1000, budgetRange.min || 5000) // 최소 1000원 보장
      let maxBudget = Math.max(minBudget + 5000, budgetRange.max || 50000) // max가 min보다 크도록
      
      // 범위 내에서 랜덤 예산 설정 (1000원 단위)
      const randomBudget = Math.floor(Math.random() * ((maxBudget - minBudget) / 1000 + 1)) * 1000 + minBudget
      setBudget(randomBudget.toString())

      // 평가 기준 선택 화면으로 이동
      setShowCriteriaSelection(true)
      setSelectedCriteria([])
      setLoading(false)
    } catch (err) {
      console.error('예산 설정 오류:', err)
      // 실패 시 기본 예산 범위 사용
      const defaultBudget = Math.floor(Math.random() * 9 + 1) * 10000
      setBudget(defaultBudget.toString())
      setShowCriteriaSelection(true)
      setSelectedCriteria([])
      setLoading(false)
    }
  }

  // 평가 기준 토글
  const toggleCriterion = (criterion) => {
    if (selectedCriteria.find(c => c.id === criterion.id)) {
      setSelectedCriteria(selectedCriteria.filter(c => c.id !== criterion.id))
    } else if (selectedCriteria.length < 3) {
      setSelectedCriteria([...selectedCriteria, criterion])
    }
  }

  // 직접 입력 기준 추가
  const addCustomCriterion = () => {
    if (customCriterion.trim() && selectedCriteria.length < 3) {
      setSelectedCriteria([
        ...selectedCriteria,
        { id: `custom_${Date.now()}`, label: customCriterion, emoji: '✨' }
      ])
      setCustomCriterion('')
    }
  }

  // AI에게 대안 요청
  const fetchOptions = async () => {
    setLoading(true)
    setError(null)
    setOptions(null)
    setShowCriteriaSelection(false)

    try {
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      })

      // 선택된 기준을 문자열로 변환
      const criteriaText = selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')
      const userBudget = Number(budget)
      
      const prompt = `초등학생 4학년 사회과 '합리적 선택' 학습을 위해, 사용자가 입력한 '${item}'을(를) 주제로 3가지 가상 쇼핑 대안을 만들어줘.

**예산**: ${userBudget.toLocaleString()}원
**평가 기준**: ${criteriaText}

**중요! 3가지 대안은 반드시 다음 전략으로 구성해:**

1. **첫 번째 유형의 대안 (예산 초과)**: 
   - 모든 기준(${criteriaText})을 높은 수준으로 만족하는 매력적인 제품
   - **반드시 예산(${userBudget.toLocaleString()}원)을 초과**해야 함
   - 가격은 예산의 1.2~1.5배 정도 (예: ${Math.round(userBudget * 1.2).toLocaleString()}원 ~ ${Math.round(userBudget * 1.5).toLocaleString()}원)
   - "완벽하지만 비싸다"는 느낌

2. **두 번째 유형의 대안 (예산 내)**: 
   - **반드시 예산(${userBudget.toLocaleString()}원) 이하**여야 함
   - 가격은 예산의 70~95% 정도 (예: ${Math.round(userBudget * 0.7).toLocaleString()}원 ~ ${Math.round(userBudget * 0.95).toLocaleString()}원)
   - 무엇을 우선시하느냐에 따라 호불호가 갈리는 선택
   - 특정 기준들은 우수하지만 다른 기준들은 아쉬운 구조

3. **세 번째 유형의 대안 (예산 내)**:
   - **반드시 예산(${userBudget.toLocaleString()}원) 이하**여야 함
   - 가격은 예산의 70~95% 정도 (예: ${Math.round(userBudget * 0.7).toLocaleString()}원 ~ ${Math.round(userBudget * 0.95).toLocaleString()}원)
   - 두 번째 대안과 정반대의 장단점 구조
   - 무엇을 우선시하느냐에 따라 호불호가 갈리는 선택
   - 두 대안이 서로 상충되는 가치를 대표하도록 구성

**🚨 가격 설정 규칙 (절대 준수!)**:
- price는 반드시 정수 숫자만 입력 (단위 절대 금지!)
- '${item}'의 실제 한국 시장 판매가를 기준으로 설정
- 예산 ${userBudget.toLocaleString()}원을 기준으로:
  * 예산 초과 대안: ${Math.round(userBudget * 1.2).toLocaleString()}원 ~ ${Math.round(userBudget * 1.5).toLocaleString()}원
  * 예산 내 대안: ${Math.round(userBudget * 0.7).toLocaleString()}원 ~ ${Math.round(userBudget * 0.95).toLocaleString()}원
- 가격 예시 (예산 10000원인 경우): 8500, 9200, 13000 (O) / 8, 5, 13 (X)
- 최소 가격은 1000원 이상이어야 함

**각 대안의 특징(features)에는 ${criteriaText}에 대한 구체적인 정보를 모두 포함하고, 장단점을 명확히 해줘.**
**중요: features는 각 기준마다 줄바꿈(\\n)을 넣어서 가독성 있게 작성해줘. 예시:**
**"• 가격: 저렴하고 부담 없음\\n• 디자인: 심플하지만 세련됨\\n• 튼튼함: 내구성이 다소 아쉬움"**

**세 대안의 순서는 무작위로 섞어서 답변해줘. (예산 초과 대안이 첫 번째일 필요 없음)**

반드시 다음 JSON 형식으로만 답변해줘 (price는 숫자만!):
{
  "options": [
    {
      "name": "상품명",
      "price": 15000,
      "features": "특징 설명 (${criteriaText}에 대한 정보와 장단점 포함)"
    }
  ]
}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `너는 초등학생을 위한 경제교육 도우미야. 

**핵심 역할**: 학생들이 합리적 선택을 고민하도록 전략적으로 대안을 구성해야 해.

**반드시 지켜야 할 규칙**:
1. 3가지 대안 중 정확히 1개는 예산을 초과하되 모든 면에서 매력적이어야 함
2. 나머지 2개는 예산 내이지만 서로 상충되는 장단점을 가져야 함
   - 한 대안이 기준 A, B에서 우수하면, 다른 대안은 기준 C에서 우수
   - 학생들이 "무엇을 우선할 것인가"를 고민하도록 설계
3. 대안의 순서는 무작위로 섞어서 제시 (예산 초과가 항상 첫 번째일 필요 없음)
4. 각 대안의 features에 선택된 기준(${criteriaText})에 대한 구체적 정보와 장단점을 명확히 포함
   - features는 각 기준마다 줄바꿈(\\n)을 넣어서 가독성 있게 작성
   - 예시: "• 가격: 저렴함\\n• 디자인: 심플함\\n• 튼튼함: 내구성 좋음"
5. 예산 내 두 대안은 "어떤 기준을 더 중요하게 볼 것인가"에 따라 호불호가 갈리도록 만들어야 함

**가격 설정 규칙 (매우 중요!)**:
- price 필드는 반드시 "정수 숫자만" 입력 (예: 15000, 22000)
- 절대로 단위(원, 만원 등)를 포함하지 말 것
- 가격은 반드시 실제 시장에서 판매되는 현실적인 가격이어야 함
- 예산이 10000원이면 → 대안 가격 예시: 7500, 9200, 13000
- 예산이 50000원이면 → 대안 가격 예시: 38000, 47000, 65000
- 절대 10원 미만의 비현실적인 가격을 설정하지 말 것

항상 JSON 형식으로 응답해.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(completion.choices[0].message.content)
      setOptions(result.options)
      // 평가 점수 초기화 (선택된 기준에 맞게)
      const initialRatings = {}
      selectedCriteria.forEach(criterion => {
        initialRatings[criterion.id] = 0
      })
      setRatings({
        0: { ...initialRatings },
        1: { ...initialRatings },
        2: { ...initialRatings }
      })
    } catch (err) {
      console.error('OpenAI API 오류:', err)
      setError('AI가 응답하지 못했어요. API 키를 확인해주세요! 🔑')
    } finally {
      setLoading(false)
    }
  }

  // 별점 업데이트 함수
  const updateRating = (optionIndex, criterion, value) => {
    // 가격 기준에 대한 AI 넛지 체크
    if (criterion === 'price' && value === 5) {
      const selectedOption = options[optionIndex]
      const userBudget = Number(budget)
      
      if (selectedOption.price > userBudget) {
        // 예산 초과 물건에 가격 만점을 주면 넛지 팝업
        setNudgeMessage(`어? 🤔\n\n"${selectedOption.name}"은 ${selectedOption.price.toLocaleString()}원인데,\n가진 돈은 ${userBudget.toLocaleString()}원이야.\n\n예산을 ${(selectedOption.price - userBudget).toLocaleString()}원이나 초과했는데\n가격 점수가 만점이라고?\n\n다시 한번 생각해볼까? 💭`)
        setShowNudge(true)
        return // 별점 업데이트하지 않음
      }
    }

    setRatings(prev => ({
      ...prev,
      [optionIndex]: {
        ...prev[optionIndex],
        [criterion]: value
      }
    }))
  }

  // 각 대안별 총점 계산
  const calculateTotal = (optionIndex) => {
    const rating = ratings[optionIndex]
    return Object.values(rating).reduce((sum, val) => sum + val, 0)
  }

  // 최종 선택 버튼 클릭 시 (확인 팝업 먼저)
  const handleFinalChoice = (optionIndex) => {
    setPendingChoice(optionIndex)
    setShowFinalCheck(true)
  }

  // 학습 정리 화면으로 이동 (예산 확인)
  const confirmFinalChoice = () => {
    setShowFinalCheck(false)
    
    const chosenOption = options[pendingChoice]
    const userBudget = Number(budget)
    const isOverBudget = chosenOption.price > userBudget
    
    // 예산 초과 시 경고 팝업
    if (isOverBudget) {
      setShowBudgetWarning(true)
      return
    }
    
    // 예산 내 구매 시 학습 정리로 진행
    setShowLearningSummary(true)
    setAnswerA('')
    setAnswerB('')
    setAiFeedback(null)
  }

  // 학습 정리 제출 및 AI 피드백 받기
  const handleLearningSummarySubmit = async (e) => {
    e.preventDefault()
    
    if (!answerA.trim() || !answerB.trim()) {
      setError('빈칸을 모두 채워주세요! 📝')
      return
    }

    setFeedbackLoading(true)
    setAiFeedback(null)
    setError(null)

    try {
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      })

      const criteriaList = selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')
      
      const prompt = `**[학생 정보]**
- 선택하려던 물건: ${item}
- AI가 정한 예산: ${Number(budget).toLocaleString()}원
- 학생이 선택한 평가 기준: ${criteriaList}

**[학생이 제출한 합리적 선택의 정의]**
- 정의(A): "${answerA}"
- 이유(B): "${answerB}"

**[분석 요청]**
위 정의와 이유를 분석하여, 아래 3가지를 반드시 포함한 피드백을 작성해주세요:

1. 학생이 쓴 핵심 단어("${answerA}", "${answerB}")를 반드시 따옴표로 인용해서 언급
2. 정의(A)와 이유(B)가 논리적으로 잘 연결되었는지 구체적으로 평가
3. 이번 ${item} 쇼핑 체험(예산 ${Number(budget).toLocaleString()}원, 평가 기준 ${criteriaList})과 연결 지어 설명

**[피드백 작성 규칙]**
- 3-4문장으로 작성
- "잘했어", "멋져" 같은 상투적인 칭찬은 절대 금지
- 학생의 표현을 직접 인용하면서 구체적으로 분석할 것
- 교과서 핵심 용어('합리적 선택', '절약', '만족감', '선택 기준')를 적극 활용할 것
- 어려운 전문 용어('기회비용', '효용', '소비 성향' 등)는 사용 금지. 대신 쉬운 말로 풀어서 설명할 것`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 4학년 사회 선생님입니다. 학생이 내린 '합리적 선택의 정의(A)'와 '이유(B)'를 분석해서 피드백을 주세요.

**필수 포함 내용:**
1. 학생이 쓴 핵심 단어(A, B)를 반드시 따옴표로 인용해서 언급할 것
2. 정의(A)와 이유(B)가 논리적으로 잘 연결되었는지 평가할 것
3. 이번 쇼핑 체험(선택한 물건, 예산, 평가 기준)과 연결 지어 설명할 것

**용어 사용 규칙:**
- ✅ 사용 허용 (적극 권장): '합리적 선택', '절약', '만족감', '선택 기준'
- ❌ 사용 금지: '기회비용', '효용', '소비 성향', '매몰비용' 등 어려운 전문 용어
- 대체 표현: '기회비용' → "아쉽게 포기한 다른 물건", '효용' → "만족감", '예산 제약' → "가진 돈 안에서"

**피드백 말투 예시:**
- (좋은 예): "'나에게 가장 큰 만족감을 주는 것을 고르는 것'이라고 정의했구나! 맞아, 단순히 돈을 '절약'하는 것보다 내 마음에 쏙 드는 걸 찾는 게 진정한 '합리적 선택'이지! 네가 쓴 '오래오래 기분 좋게 쓸 수 있으니까'라는 이유도 아주 정확해."
- (나쁜 예): "정말 멋진 정의야! 참 잘했어. 앞으로도 합리적인 소비자가 되렴." (이런 막연한 칭찬 금지)

교과서 핵심 용어를 섞어서 전문적인 느낌을 주되, 말투는 여전히 친절하고 쉬워야 합니다.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      setAiFeedback(completion.choices[0].message.content)
    } catch (err) {
      console.error('OpenAI API 오류:', err)
      setError('AI 피드백을 받지 못했어요. 다시 시도해주세요! 📝')
    } finally {
      setFeedbackLoading(false)
    }
  }

  // 현재 단계 계산
  const getCurrentStep = () => {
    if (showLearningSummary || aiFeedback) return 6
    if (showFinalCheck || showBudgetWarning) return 5
    if (options) return 4
    if (loading) {
      // 기준 선택 후 옵션 로딩 중
      if (showCriteriaSelection) return 3
      // 물건 입력 후 예산 설정 로딩 중
      return 2
    }
    if (showCriteriaSelection) return 2
    return 1
  }

  return (
    <div className="min-h-screen w-full pattern-grid">
      {/* 진행 바 */}
      {getCurrentStep() > 1 && <ProgressBar currentStep={getCurrentStep()} totalSteps={6} />}
      
      <div className="flex flex-col items-center gap-6 p-8 pt-32 pb-16">
        {/* 메인 제목 */}
        {!options && !showLearningSummary && (
          <h1 className="text-6xl md:text-7xl font-black text-purple-600 drop-shadow-lg mb-4 sticker border-purple-400 px-8 py-4 rounded-3xl">
            합리적 선택하기 🛒
          </h1>
        )}

        {/* 1단계: 입력 폼 */}
        {!showCriteriaSelection && !options && !loading && (
          <div className="w-full max-w-3xl">
            <AIGuide 
              message="어떤 물건을 사고 싶니? 아래에 물건 이름을 써봐!" 
              emoji="🤗"
            />
            
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8 border-4 border-pink-200">
                {/* 물건 입력창 */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-2xl font-black text-gray-800">
                    <span className="text-3xl">🎁</span>
                    사고 싶은 물건
                  </label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="예) 필통, 스티커, 인형..."
                    className="w-full px-8 py-5 text-2xl rounded-2xl border-4 border-yellow-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-200 transition-all font-bold"
                  />
                </div>

                {/* AI 예산 설정 안내 스티커 */}
                <div className="sticker border-blue-300 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🤖</div>
      <div>
                      <p className="text-xl font-bold text-gray-800 mb-2">
                        💰 AI가 예산을 정해줄게요!
                      </p>
                      <p className="text-lg text-gray-700">
                        실제 상황처럼 정해진 예산 안에서<br />
                        어떻게 쓸지 고민해보세요 💡
                      </p>
                    </div>
                  </div>
                </div>

                {/* 버튼 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="bubble-button w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  시작하기!
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2단계: 평가 기준 선택 */}
        {showCriteriaSelection && !loading && (
          <div className="w-full max-w-5xl">
            <AIGuide 
              message={`'${item}'을(를) 고를 때 무엇이 중요한지 기준 3가지를 선택해봐!`}
              emoji="🎯"
            />
            
            <div className="bg-white rounded-3xl shadow-2xl p-10 border-4 border-blue-200">
              {/* 예산 스티커 */}
              <div className="sticker border-green-400 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-5xl">💰</div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-700 mb-1">
                      AI가 정해준 예산
                    </p>
                    <p className="text-4xl font-black text-green-600">
                      {Number(budget).toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              {/* 선택된 기준 표시 */}
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl border-3 border-purple-300">
                <p className="text-2xl font-black text-gray-800 mb-4 text-center">
                  ✨ 선택된 기준 ({selectedCriteria.length}/3)
                </p>
                <div className="flex flex-wrap gap-4 justify-center min-h-[80px] items-center">
                  {selectedCriteria.length === 0 ? (
                    <p className="text-xl text-gray-500">아래에서 3가지 기준을 선택해주세요!</p>
                  ) : (
                    selectedCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="sticker border-purple-400 px-6 py-4 rounded-2xl text-2xl font-black text-purple-600 flex items-center gap-3"
                      >
                        <span className="text-3xl">{criterion.emoji}</span>
                        <span>{criterion.label.replace(/^[^\s]+\s/, '')}</span>
                        <button
                          onClick={() => toggleCriterion(criterion)}
                          className="ml-2 text-2xl text-red-500 hover:scale-125 transition-transform"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI 추천 기준 버튼들 */}
              <div className="space-y-5 mb-8">
                <p className="text-2xl font-black text-gray-800 text-center flex items-center justify-center gap-2">
                  <span className="text-3xl">💡</span>
                  AI가 추천하는 기준
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {suggestedCriteria.map((criterion) => {
                    const isSelected = selectedCriteria.find(c => c.id === criterion.id)
                    return (
                      <button
                        key={criterion.id}
                        onClick={() => toggleCriterion(criterion)}
                        disabled={!isSelected && selectedCriteria.length >= 3}
                        className={`bubble-button text-2xl ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white scale-105'
                            : 'bg-gradient-to-r from-yellow-300 to-orange-300 text-gray-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {criterion.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 직접 입력 */}
              <div className="space-y-4 mb-8">
                <p className="text-2xl font-black text-gray-800 text-center flex items-center justify-center gap-2">
                  <span className="text-3xl">✏️</span>
                  추가하고 싶은 기준이 있나요?
                </p>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={customCriterion}
                    onChange={(e) => setCustomCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCriterion())}
                    placeholder="예) 무게, 배터리, 소음..."
                    disabled={selectedCriteria.length >= 3}
                    className="flex-1 px-8 py-5 text-2xl rounded-2xl border-4 border-yellow-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-200 transition-all disabled:opacity-50 font-bold"
                  />
                  <button
                    onClick={addCustomCriterion}
                    disabled={!customCriterion.trim() || selectedCriteria.length >= 3}
                    className="bubble-button bg-gradient-to-r from-sky-400 to-blue-400 text-white text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    추가 ➕
                  </button>
                </div>
              </div>

              {/* 확인 버튼 */}
              <div className="text-center">
                <button
                  onClick={fetchOptions}
                  disabled={selectedCriteria.length !== 3}
                  className="bubble-button bg-gradient-to-r from-green-400 to-emerald-500 text-white text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedCriteria.length === 3 ? '확인! AI에게 물어보기 ✨' : `${3 - selectedCriteria.length}개 더 선택해주세요!`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3단계: 로딩 상태 */}
        {loading && (
          <div className="w-full max-w-4xl">
            <div className="bg-white rounded-3xl shadow-2xl p-12 border-4 border-purple-200">
              <div className="flex flex-col items-center gap-8">
                <div className="text-9xl animate-bounce">
                  {!options ? '💰' : '🔍'}
                </div>
                <div className="space-y-4 w-full">
                  <p className="text-4xl font-black text-gray-800 text-center">
                    {!options ? `"${item}"에 맞는 예산을 정하는 중...` : 'AI가 인터넷을 뒤지는 중...'}
                  </p>
                  {!options ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-xl font-bold text-gray-700">
                        <span className="text-3xl">🤖</span>
                        <span>물건 종류 분석 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-400 to-pink-600 h-full animate-pulse w-3/4 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xl font-bold text-gray-700">
                        <span className="text-3xl">💰</span>
                        <span>적절한 예산 계산 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-600 h-full animate-pulse w-2/3 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-xl font-bold text-gray-700">
                        <span className="text-3xl">🛒</span>
                        <span>쇼핑몰 검색 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full animate-pulse w-3/4 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xl font-bold text-gray-700">
                        <span className="text-3xl">💰</span>
                        <span>가격 비교 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-400 to-green-600 h-full animate-pulse w-2/3 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xl font-bold text-gray-700">
                        <span className="text-3xl">⭐</span>
                        <span>리뷰 분석 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-600 h-full animate-pulse w-1/2 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="sticker border-red-400 rounded-3xl shadow-2xl p-10 max-w-2xl w-full">
            <div className="flex items-center gap-4 justify-center">
              <span className="text-5xl">⚠️</span>
              <p className="text-2xl font-black text-red-600 text-center">{error}</p>
            </div>
          </div>
        )}

        {/* 4단계: 결과 카드 */}
        {options && !loading && (
          <div className="w-full max-w-7xl">
            <AIGuide 
              message="AI가 찾아온 3가지 선택지야! 아래에서 각 물건을 별점으로 평가해봐!"
              emoji="🎁"
            />
            
            {/* 기준 안내 스티커 */}
            <div className="sticker border-blue-300 rounded-2xl p-6 mb-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">✨</span>
                  <span className="text-2xl font-black text-gray-800">평가 기준:</span>
                  <span className="text-2xl font-black text-purple-600">
                    {selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')}
                  </span>
                </div>
                <div className="sticker border-green-400 rounded-xl px-4 py-2">
                  <span className="text-2xl font-black text-green-600">
                    💰 예산: {Number(budget).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden hover-scale-102 transform transition-all duration-200 border-4 border-gray-200"
                >
                  {/* 상단 헤더 */}
                  <div className={`p-5 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-b-4 border-yellow-300' :
                    index === 1 ? 'bg-gradient-to-r from-blue-100 to-sky-100 border-b-4 border-blue-300' :
                    'bg-gradient-to-r from-pink-100 to-purple-100 border-b-4 border-pink-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-5xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="text-2xl font-black text-gray-800">
                          대안 {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border-2 border-yellow-300">
                        <span className="text-2xl">⭐</span>
                        <span className="text-lg font-black">4.{Math.floor(Math.random() * 3) + 3}</span>
                      </div>
                    </div>
                  </div>

                  {/* 상품 내용 */}
                  <div className="p-8 space-y-6">
                    <h3 className="text-3xl font-black text-gray-800">
                      {option.name}
                    </h3>
                    
                    {/* 가격 정보 스티커 */}
                    <div className={`sticker rounded-2xl p-5 ${
                      option.price > Number(budget) ? 'border-red-400' : 'border-green-400'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-gray-700">💳 판매가</span>
                        <span className={`text-4xl font-black ${
                          option.price > Number(budget) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {option.price.toLocaleString()}원
                        </span>
                      </div>
                      {option.price > Number(budget) ? (
                        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-center">
                          <p className="text-lg text-red-700 font-black">⚠️ 예산 {(option.price - Number(budget)).toLocaleString()}원 초과</p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 text-center">
                          <p className="text-lg text-green-700 font-black">✅ 예산 내 구매 가능</p>
                        </div>
                      )}
                    </div>

                    {/* 특징 */}
                    <div className="space-y-3">
                      <p className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <span className="text-2xl">📋</span> 상품 특징
                      </p>
                      <p className="text-base text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-xl whitespace-pre-line">
                        {option.features}
                      </p>
                    </div>

                    {/* 배송 정보 스티커 */}
                    <div className="flex items-center justify-between text-base font-bold border-t-2 border-gray-200 pt-4">
                      <span className="flex items-center gap-2 text-blue-600">
                        <span className="text-2xl">🚚</span> 무료배송
                      </span>
                      <span className="flex items-center gap-2 text-orange-600">
                        <span className="text-2xl">📦</span> 오늘출발
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 의사결정 표 */}
            <div className="mt-12">
              <div className="sticker border-purple-400 rounded-3xl p-6 mb-8 max-w-4xl mx-auto">
                <p className="text-2xl text-center font-black text-gray-800">
                  <span className="text-3xl">📊</span>{' '}
                  <span className="text-purple-600">내가 선택한 평가 기준:</span>{' '}
                  {selectedCriteria.map((c, idx) => (
                    <span key={c.id}>
                      <span className="text-2xl">{c.emoji}</span> <span className="font-black">{c.label.replace(/^[^\s]+\s/, '')}</span>
                      {idx < selectedCriteria.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
              
              <div className="bg-white rounded-3xl shadow-2xl p-8 overflow-x-auto border-4 border-purple-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200">
                      <th className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-tl-2xl">
                        평가 기준 📝
                      </th>
                      <th className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <div className="text-4xl mb-2">🥇</div>
                        대안 1<br />
                        <span className="text-xl font-bold">{options[0].name}</span>
                      </th>
                      <th className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <div className="text-4xl mb-2">🥈</div>
                        대안 2<br />
                        <span className="text-xl font-bold">{options[1].name}</span>
                      </th>
                      <th className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-tr-2xl">
                        <div className="text-4xl mb-2">🥉</div>
                        대안 3<br />
                        <span className="text-xl font-bold">{options[2].name}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 동적으로 생성된 평가 기준 행들 */}
                    {selectedCriteria.map((criterion, criterionIdx) => {
                      const bgColors = ['bg-yellow-50', 'bg-sky-50', 'bg-pink-50']
                      return (
                        <tr key={criterion.id} className={bgColors[criterionIdx % 3]}>
                          <td className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400">
                            <span className="text-3xl">{criterion.emoji}</span> {criterion.label.replace(/^[^\s]+\s/, '')}
                          </td>
                          {[0, 1, 2].map((idx) => (
                            <td key={idx} className="p-6 border-4 border-purple-400">
                              <StarRating
                                rating={ratings[idx][criterion.id] || 0}
                                onRatingChange={(value) => updateRating(idx, criterion.id, value)}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}

                    {/* 총점 */}
                    <tr className="bg-gradient-to-r from-orange-200 via-yellow-200 to-amber-200">
                      <td className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <span className="text-4xl">🏆</span> 총점
                      </td>
                      {[0, 1, 2].map((idx) => (
                        <td key={idx} className="p-6 border-4 border-purple-400 text-center">
                          <div className="text-5xl font-black text-orange-600 mb-2">
                            {calculateTotal(idx)}점
                          </div>
                          <div className="text-lg font-bold text-gray-600">
                            (최대 {selectedCriteria.length * 5}점)
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* 최종 선택 버튼 */}
                    <tr className="bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100">
                      <td className="p-6 text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-bl-2xl">
                        <span className="text-4xl">💚</span> 최종 선택
                      </td>
                      {[0, 1, 2].map((idx) => (
                        <td key={idx} className="p-6 border-4 border-purple-400 text-center">
                          <button
                            onClick={() => handleFinalChoice(idx)}
                            disabled={showLearningSummary}
                            className="bubble-button w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            이걸로 결정! ✅
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* 안내 메시지 */}
              <div className="mt-8 sticker border-blue-300 rounded-3xl p-6">
                <p className="text-2xl text-gray-800 text-center leading-relaxed font-bold">
                  <span className="text-3xl">💡</span> <span className="font-black">별을 클릭</span>해서 각 대안을 평가해보세요!<br />
                  내가 선택한 <span className="font-black text-purple-600">{selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')}</span> 기준으로 점수를 매겨보세요!<br />
                  <span className="text-3xl">✨</span> 총점이 높을수록 나에게 더 좋은 선택이에요!
                </p>
              </div>
            </div>

            {/* AI 넛지 팝업 */}
            {showNudge && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl mx-4 border-4 border-orange-400">
                  <div className="space-y-8">
                    <div className="text-center">
                      <div className="text-8xl mb-4 animate-bounce">🤖</div>
                      <h3 className="text-4xl font-black text-orange-600">
                        AI의 조언
                      </h3>
                    </div>
                    <div className="sticker border-orange-300 rounded-2xl p-8">
                      <p className="text-2xl font-bold text-gray-800 leading-relaxed whitespace-pre-line text-center">
                        {nudgeMessage}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNudge(false)}
                      className="bubble-button w-full bg-gradient-to-r from-orange-400 to-red-400 text-white text-2xl"
                    >
                      알겠어요! 다시 생각해볼게요 👍
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 최종 확인 팝업 */}
            {showFinalCheck && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-4 border-4 border-purple-300">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-7xl mb-4">🤔</div>
                      <h3 className="text-3xl font-bold text-purple-600 mb-4">
                        마지막 확인!
                      </h3>
                    </div>
                    
                    <div className="bg-purple-50 rounded-2xl p-6 space-y-4">
                      <p className="text-2xl text-gray-800 font-bold text-center">
                        정말 이 물건이 최고의 선택일까?
                      </p>
                      <p className="text-lg text-gray-700 text-center">
                        💡 총점이 가장 높은지 마지막으로 확인해봐!
                      </p>
                      
                      {/* 3가지 대안의 총점 비교 */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className={`p-4 rounded-xl text-center ${
                            idx === pendingChoice 
                              ? 'bg-yellow-100 border-4 border-yellow-400' 
                              : 'bg-gray-100'
                          }`}>
                            <p className="text-lg font-bold mb-2">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} 대안 {idx + 1}
                            </p>
                            <p className="text-3xl font-bold text-purple-600">
                              {calculateTotal(idx)}점
                            </p>
                            {idx === pendingChoice && (
                              <p className="text-sm text-yellow-700 font-bold mt-2">
                                👆 선택한 것
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowFinalCheck(false)}
                        className="flex-1 px-8 py-4 text-xl font-bold text-gray-700 bg-gray-200 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
                      >
                        다시 생각하기 🔄
                      </button>
                      <button
                        onClick={confirmFinalChoice}
                        className="flex-1 px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
                      >
                        네, 이걸로 결정! ✅
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 예산 초과 경고 팝업 */}
            {showBudgetWarning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-4 border-4 border-red-400">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-7xl mb-4 animate-bounce">⚠️</div>
                      <h3 className="text-4xl font-bold text-red-600 mb-4">
                        구매 불가능!
                      </h3>
                    </div>
                    
                    <div className="bg-red-50 rounded-2xl p-6 space-y-4">
                      <p className="text-2xl text-gray-800 font-bold text-center">
                        가진 돈이 부족해서<br />이 물건을 살 수 없어요! 😢
                      </p>
                      
                      <div className="bg-white rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold">💰 가진 돈 (예산):</span>
                          <span className="text-green-600 font-bold text-xl">
                            {Number(budget).toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold">💳 선택한 물건 가격:</span>
                          <span className="text-red-600 font-bold text-xl">
                            {options[pendingChoice]?.price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center text-lg">
                          <span className="font-bold">😭 부족한 금액:</span>
                          <span className="text-red-700 font-bold text-2xl">
                            {(options[pendingChoice]?.price - Number(budget)).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-300">
                        <p className="text-lg text-yellow-900 text-center">
                          💡 <span className="font-bold">합리적 선택</span>은<br />
                          <span className="text-base">예산 안에서 가장 만족스러운 물건을 고르는 거예요!</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowBudgetWarning(false)}
                        className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
                      >
                        예산 안에서 다시 선택하기 🔄
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 학습 정리 화면 */}
            {showLearningSummary && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 rounded-3xl shadow-2xl p-8 max-w-3xl w-full mx-4 border-4 border-emerald-300">
                  <div className="space-y-6">
                    {/* 제목 */}
                    <div className="text-center">
                      <h3 className="text-4xl font-bold text-emerald-800 mb-4">
                        📚 오늘의 쇼핑을 정리해 볼까요? 📚
                      </h3>
                      <p className="text-xl text-emerald-700">
                        스스로 생각한 '합리적 선택'의 의미를 써보세요!
                      </p>
                    </div>

                    {/* AI 피드백이 없을 때: 문장 완성 폼 */}
                    {!aiFeedback && (
                      <form onSubmit={handleLearningSummarySubmit} className="space-y-6">
                        {/* 문장 완성하기 */}
                        <div className="bg-white rounded-2xl shadow-inner p-8 border-2 border-emerald-200 space-y-6">
                          {/* 첫 번째 문장 */}
                          <div className="space-y-3">
                            <label className="block text-2xl font-bold text-gray-800">
                              나에게 합리적 선택이란
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={answerA}
                                onChange={(e) => setAnswerA(e.target.value)}
                                placeholder="여기에 입력하세요"
                                className="flex-1 px-6 py-4 text-xl border-4 border-emerald-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:border-emerald-400"
                                disabled={feedbackLoading}
                              />
                              <span className="text-2xl font-bold text-gray-800">(이)다.</span>
                            </div>
                          </div>

                          {/* 두 번째 문장 */}
                          <div className="space-y-3">
                            <label className="block text-2xl font-bold text-gray-800">
                              왜냐하면
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={answerB}
                                onChange={(e) => setAnswerB(e.target.value)}
                                placeholder="여기에 입력하세요"
                                className="flex-1 px-6 py-4 text-xl border-4 border-emerald-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:border-emerald-400"
                                disabled={feedbackLoading}
                              />
                              <span className="text-2xl font-bold text-gray-800">기 때문이다.</span>
                            </div>
                          </div>
      </div>

                        {/* 제출 버튼 */}
                        <div className="flex justify-center">
                          <button
                            type="submit"
                            disabled={feedbackLoading}
                            className="px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            {feedbackLoading ? (
                              <span className="flex items-center gap-3">
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                AI가 생각 중...
                              </span>
                            ) : (
                              '제출하기 ✅'
                            )}
        </button>
                        </div>
                      </form>
                    )}

                    {/* AI 피드백 표시 */}
                    {aiFeedback && (
                      <div className="space-y-6">
                        {/* 학생의 답변 */}
                        <div className="bg-white rounded-2xl shadow-inner p-6 border-2 border-emerald-200">
                          <h4 className="text-xl font-bold text-emerald-700 mb-3">✍️ 나의 답변</h4>
                          <p className="text-xl text-gray-800 leading-relaxed">
                            나에게 합리적 선택이란 <span className="font-bold text-emerald-600">{answerA}</span>(이)다.<br />
                            왜냐하면 <span className="font-bold text-emerald-600">{answerB}</span>기 때문이다.
                          </p>
                        </div>

                        {/* AI 피드백 */}
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-inner p-8 border-2 border-yellow-300">
                          <h4 className="text-2xl font-bold text-amber-700 mb-4 text-center">
                            🌟 AI 선생님의 피드백 🌟
                          </h4>
                          <p className="text-xl text-gray-800 leading-relaxed whitespace-pre-line">
                            {aiFeedback}
                          </p>
                        </div>

                        {/* 버튼 */}
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={() => {
                              setShowLearningSummary(false)
                              setAiFeedback(null)
                              setAnswerA('')
                              setAnswerB('')
                            }}
                            className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
                          >
                            다른 선택 해보기 🔄
                          </button>
                          <button
                            onClick={() => {
                              setShowLearningSummary(false)
                              setAiFeedback(null)
                              setAnswerA('')
                              setAnswerB('')
                              setOptions(null)
                              setItem('')
                              setBudget('')
                              setShowCriteriaSelection(false)
                              setSelectedCriteria([])
                              setRatings({ 0: {}, 1: {}, 2: {} })
                            }}
                            className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
                          >
                            처음으로 🏠
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setOptions(null)
                  setItem('')
                  setBudget('')
                  setShowCriteriaSelection(false)
                  setSelectedCriteria([])
                }}
                className="px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200"
              >
                다시 골라보기 🔄
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  )
}

export default App
