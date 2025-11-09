import { useState, useRef } from 'react'
import OpenAI from 'openai'
import html2canvas from 'html2canvas'

// 진행 단계 표시 컴포넌트
function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-40 py-2 md:py-4 px-3 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className="text-lg md:text-2xl font-bold text-purple-600">
            {currentStep}/{totalSteps}단계
          </span>
          <span className="text-sm md:text-lg text-gray-600">진행 중...</span>
        </div>
        <div className="h-3 md:h-4 bg-gray-200 rounded-full overflow-hidden">
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
    <div className="mb-4 md:mb-8 flex justify-center animate-bounce-gentle px-2">
      <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 w-full max-w-2xl border-4 border-yellow-300">
        {/* 말풍선 꼬리 */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[16px] border-t-yellow-300" />
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-white" />
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-3xl md:text-5xl flex-shrink-0">{emoji}</div>
          <p className="text-base md:text-xl font-bold text-gray-800 leading-relaxed">
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
    <div className="flex gap-1 md:gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className="text-2xl md:text-4xl hover:scale-125 transform transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
  const [imageDownloading, setImageDownloading] = useState(false)
  const shareCardRef = useRef(null)

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

  // 공유 카드 이미지로 저장하기
  const handleDownloadImage = async () => {
    if (!shareCardRef.current) {
      console.error('공유 카드 ref가 없습니다')
      setError('이미지를 저장할 수 없어요. 페이지를 새로고침해주세요! 📸')
      return
    }

    setImageDownloading(true)
    setError(null)

    try {
      const element = shareCardRef.current
      
      // 폰트와 이미지가 로드될 때까지 대기
      await new Promise(resolve => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(resolve, 800)
          })
        } else {
          setTimeout(resolve, 1000)
        }
      })
      
      // 원본 스크롤 위치 저장
      const originalScrollY = window.scrollY
      const originalScrollX = window.scrollX
      
      // 요소를 화면에 완전히 보이게 스크롤
      element.scrollIntoView({ 
        behavior: 'instant', 
        block: 'center',
        inline: 'center'
      })
      
      // 스크롤 후 대기
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('이미지 생성 시작')
      
      // html2canvas로 캡처 (간소화된 설정)
      const canvas = await html2canvas(element, {
        backgroundColor: '#fef3f2',
        scale: 2, // 고정 scale로 안정성 확보
        logging: true,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0, // 타임아웃 제거
        onclone: (clonedDoc) => {
          // 복제된 문서에서 해당 요소 찾기
          const clonedElement = clonedDoc.querySelector('[data-share-card="true"]')
          if (clonedElement) {
            // 모든 자식 요소가 보이도록 설정
            clonedElement.style.overflow = 'visible'
            clonedElement.style.height = 'auto'
            clonedElement.style.minHeight = 'auto'
          }
        }
      })

      console.log('Canvas 생성 완료:', { 
        width: canvas.width, 
        height: canvas.height 
      })

      // 원래 스크롤 위치로 복원
      window.scrollTo(originalScrollX, originalScrollY)

      // canvas를 dataURL로 변환
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      
      // 파일명 생성
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const safeItemName = item.replace(/[^a-zA-Z0-9가-힣]/g, '_')
      const fileName = `합리적선택_${safeItemName}_${timestamp}.png`
      
      // 모바일 환경 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      
      if (isMobile) {
        // 모바일: 새 탭에서 이미지 열기
        const newWindow = window.open()
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>${fileName}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { 
                    margin: 0; 
                    padding: 20px;
                    display: flex; 
                    flex-direction: column;
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    background: #f0f0f0; 
                  }
                  img { 
                    max-width: 100%; 
                    height: auto;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    border-radius: 12px;
                  }
                  .info {
                    margin-top: 20px;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    text-align: center;
                    font-family: sans-serif;
                    color: #333;
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="${fileName}" />
                <div class="info">
                  <p><strong>📸 이미지를 길게 눌러서 저장하세요!</strong></p>
                  <p style="font-size: 14px; color: #666; margin-top: 8px;">
                    이미지 위에서 길게 누르면<br/>
                    '이미지 저장' 메뉴가 나타납니다.
                  </p>
                </div>
              </body>
            </html>
          `)
          newWindow.document.close()
        } else {
          // 팝업이 차단된 경우
          setError('팝업 차단을 해제하고 다시 시도해주세요! 📸')
        }
      } else {
        // PC: 일반 다운로드
        const link = document.createElement('a')
        link.download = fileName
        link.href = dataUrl
        link.style.display = 'none'
        
        document.body.appendChild(link)
        link.click()
        
        setTimeout(() => {
          document.body.removeChild(link)
        }, 100)
      }
      
      setImageDownloading(false)
      console.log('이미지 다운로드 완료')
      
    } catch (err) {
      console.error('이미지 저장 오류:', err)
      setError(`이미지 저장에 실패했어요: ${err.message}. 다시 시도해주세요! 📸`)
      setImageDownloading(false)
    }
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

**[학생이 말한 내용]**
- 합리적 선택이란: "${answerA}"
- 그 이유: "${answerB}"

**[피드백 작성 요청]**
위 내용을 읽고, 아래 3가지를 자연스럽게 담아서 4학년 학생에게 말하듯이 피드백을 작성해주세요:

1. 학생이 직접 쓴 표현("${answerA}", "${answerB}")을 따옴표로 인용하면서 이야기하기
2. 학생이 말한 '합리적 선택'과 '이유'가 서로 잘 이어지는지 구체적으로 평가하기
3. 이번 ${item} 쇼핑 체험(예산 ${Number(budget).toLocaleString()}원, 평가 기준 ${criteriaList})과 연결해서 설명하기

**[말투 규칙]**
- 3-4문장으로 작성
- "잘했어", "멋져" 같은 막연한 칭찬 대신, 구체적으로 어떤 점이 좋은지 말해주기
- 교과서 용어('합리적 선택', '절약', '만족감', '선택 기준')를 자연스럽게 섞어서 사용하기
- 어려운 말('기회비용', '효용', '소비 성향')은 쓰지 말고, "아쉽게 포기한 다른 물건"처럼 쉽게 풀어서 말하기
- "정의(A)", "이유(B)" 같은 어색한 표현은 절대 사용하지 말기`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 초등학교 4학년 사회 선생님입니다. 학생이 말한 "합리적 선택이란 무엇인지"와 "그 이유"를 듣고, 자연스럽게 피드백을 주세요.\n\n**피드백에 꼭 담을 내용:**\n1. 학생이 직접 쓴 표현을 따옴표로 인용하면서 이야기하기\n2. 학생이 말한 "합리적 선택"과 "이유"가 서로 잘 이어지는지 구체적으로 이야기하기\n3. 오늘 쇼핑 체험(선택한 물건, 예산, 평가 기준)과 연결해서 설명하기\n\n**사용할 말:**\n- [허용] 자주 써주세요: "합리적 선택", "절약", "만족감", "선택 기준"\n- [금지] 절대 쓰지 마세요: "기회비용", "효용", "소비 성향", "매몰비용", "정의(A)", "이유(B)" 같은 어색한 표현\n- [대체] 쉽게 풀어 말하기: "기회비용" 대신 "아쉽게 포기한 다른 물건", "효용" 대신 "만족감", "예산 제약" 대신 "가진 돈 안에서"\n\n**말투 예시:**\n[좋은 예]\n"네가 말한 표현을 보니, 단순히 돈을 절약하는 것보다 내 마음에 쏙 드는 걸 찾는 게 진짜 합리적 선택이라는 걸 잘 알고 있구나! 네가 오늘 비싼 물건 대신 튼튼한 물건을 골랐던 순간이 딱 떠오르네."\n\n[나쁜 예]\n"정말 멋진 정의야! 참 잘했어. 앞으로도 합리적인 소비자가 되렴."\n\n교과서 용어를 자연스럽게 섞되, 4학년 학생에게 직접 말하듯이 친근하게 써주세요.'
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
      
      <div className="flex flex-col items-center gap-4 md:gap-6 p-4 md:p-8 pt-24 md:pt-32 pb-8 md:pb-16">
        {/* 메인 제목 */}
        {!options && !showLearningSummary && (
          <div className="flex flex-col items-center gap-2 md:gap-3 mb-2 md:mb-4 sticker border-purple-400 px-4 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl">
            <h1 className="text-3xl md:text-6xl lg:text-7xl font-black text-purple-600 drop-shadow-lg">
              씽크픽 🛒
            </h1>
            <h2 className="text-base md:text-xl lg:text-2xl font-bold text-purple-500 drop-shadow-md">
              합리적 선택하기
            </h2>
          </div>
        )}

        {/* 1단계: 입력 폼 */}
        {!showCriteriaSelection && !options && !loading && (
          <div className="w-full max-w-3xl px-2">
            <AIGuide 
              message="어떤 물건을 사고 싶니? 아래에 물건 이름을 써봐!" 
              emoji="🤗"
            />
            
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-10 space-y-6 md:space-y-8 border-4 border-pink-200">
                {/* 물건 입력창 */}
                <div className="space-y-3 md:space-y-4">
                  <label className="flex items-center gap-2 text-lg md:text-2xl font-black text-gray-800">
                    <span className="text-2xl md:text-3xl">🎁</span>
                    사고 싶은 물건
                  </label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="예) 필통, 스티커, 인형..."
                    className="w-full px-4 md:px-8 py-3 md:py-5 text-lg md:text-2xl rounded-xl md:rounded-2xl border-4 border-yellow-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-200 transition-all font-bold min-h-[44px]"
                  />
                </div>

                {/* AI 예산 설정 안내 스티커 */}
                <div className="sticker border-blue-300 rounded-xl md:rounded-2xl p-4 md:p-6">
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="text-2xl md:text-4xl flex-shrink-0">🤖</div>
      <div>
                      <p className="text-base md:text-xl font-bold text-gray-800 mb-1 md:mb-2">
                        💰 AI가 예산을 정해줄게요!
                      </p>
                      <p className="text-sm md:text-lg text-gray-700">
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
                  className="bubble-button w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-lg md:text-xl"
                >
                  시작하기!
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2단계: 평가 기준 선택 */}
        {showCriteriaSelection && !loading && (
          <div className="w-full max-w-5xl px-2">
            <AIGuide 
              message={item + '을(를) 고를 때 무엇이 중요한지 기준 3가지를 선택해봐!'}
              emoji="🎯"
            />
            
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-10 border-4 border-blue-200">
              {/* 예산 스티커 */}
              <div className="sticker border-green-400 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
                <div className="flex items-center justify-center gap-2 md:gap-4">
                  <div className="text-3xl md:text-5xl">💰</div>
                  <div className="text-center">
                    <p className="text-base md:text-xl font-bold text-gray-700 mb-1">
                      AI가 정해준 예산
                    </p>
                    <p className="text-2xl md:text-4xl font-black text-green-600">
                      {Number(budget).toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              {/* 선택된 기준 표시 */}
              <div className="mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl md:rounded-3xl border-3 border-purple-300">
                <p className="text-lg md:text-2xl font-black text-gray-800 mb-3 md:mb-4 text-center">
                  ✨ 선택된 기준 ({selectedCriteria.length}/3)
                </p>
                <div className="flex flex-wrap gap-2 md:gap-4 justify-center min-h-[60px] md:min-h-[80px] items-center">
                  {selectedCriteria.length === 0 ? (
                    <p className="text-base md:text-xl text-gray-500">아래에서 3가지 기준을 선택해주세요!</p>
                  ) : (
                    selectedCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="sticker border-purple-400 px-3 md:px-6 py-2 md:py-4 rounded-xl md:rounded-2xl text-base md:text-2xl font-black text-purple-600 flex items-center gap-2 md:gap-3"
                      >
                        <span className="text-xl md:text-3xl">{criterion.emoji}</span>
                        <span>{criterion.label.replace(/^[^\s]+\s/, '')}</span>
                        <button
                          onClick={() => toggleCriterion(criterion)}
                          className="ml-1 md:ml-2 text-lg md:text-2xl text-red-500 hover:scale-125 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI 추천 기준 버튼들 */}
              <div className="space-y-4 md:space-y-5 mb-6 md:mb-8">
                <p className="text-lg md:text-2xl font-black text-gray-800 text-center flex items-center justify-center gap-2">
                  <span className="text-2xl md:text-3xl">💡</span>
                  AI가 추천하는 기준
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                  {suggestedCriteria.map((criterion) => {
                    const isSelected = selectedCriteria.find(c => c.id === criterion.id)
                    return (
                      <button
                        key={criterion.id}
                        onClick={() => toggleCriterion(criterion)}
                        disabled={!isSelected && selectedCriteria.length >= 3}
                        className={'bubble-button text-base md:text-2xl min-h-[44px] ' + (isSelected
                            ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white scale-105'
                            : 'bg-gradient-to-r from-yellow-300 to-orange-300 text-gray-800'
                        ) + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                      >
                        {criterion.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 직접 입력 */}
              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <p className="text-lg md:text-2xl font-black text-gray-800 text-center flex items-center justify-center gap-2">
                  <span className="text-2xl md:text-3xl">✏️</span>
                  추가하고 싶은 기준이 있나요?
                </p>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                  <input
                    type="text"
                    value={customCriterion}
                    onChange={(e) => setCustomCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCriterion())}
                    placeholder="예) 무게, 배터리, 소음..."
                    disabled={selectedCriteria.length >= 3}
                    className="flex-1 px-4 md:px-8 py-3 md:py-5 text-base md:text-2xl rounded-xl md:rounded-2xl border-4 border-yellow-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-200 transition-all disabled:opacity-50 font-bold min-h-[44px]"
                  />
                  <button
                    onClick={addCustomCriterion}
                    disabled={!customCriterion.trim() || selectedCriteria.length >= 3}
                    className="bubble-button bg-gradient-to-r from-sky-400 to-blue-400 text-white text-base md:text-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
                  className="bubble-button w-full md:w-auto bg-gradient-to-r from-green-400 to-emerald-500 text-white text-lg md:text-2xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {selectedCriteria.length === 3 ? '확인! AI에게 물어보기 ✨' : (3 - selectedCriteria.length) + '개 더 선택해주세요!'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3단계: 로딩 상태 */}
        {loading && (
          <div className="w-full max-w-4xl px-2">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-12 border-4 border-purple-200">
              <div className="flex flex-col items-center gap-4 md:gap-8">
                <div className="text-6xl md:text-9xl animate-bounce">
                  {!options ? '💰' : '🔍'}
                </div>
                <div className="space-y-3 md:space-y-4 w-full">
                  <p className="text-xl md:text-4xl font-black text-gray-800 text-center">
                    {!options ? item + '에 맞는 예산을 정하는 중...' : 'AI가 인터넷을 뒤지는 중...'}
                  </p>
                  {!options ? (
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2 md:gap-4 text-sm md:text-xl font-bold text-gray-700">
                        <span className="text-xl md:text-3xl flex-shrink-0">🤖</span>
                        <span className="flex-shrink-0">물건 종류 분석 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-400 to-pink-600 h-full animate-pulse w-3/4 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-sm md:text-xl font-bold text-gray-700">
                        <span className="text-xl md:text-3xl flex-shrink-0">💰</span>
                        <span className="flex-shrink-0">적절한 예산 계산 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-600 h-full animate-pulse w-2/3 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2 md:gap-4 text-sm md:text-xl font-bold text-gray-700">
                        <span className="text-xl md:text-3xl flex-shrink-0">🛒</span>
                        <span className="flex-shrink-0">쇼핑몰 검색 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full animate-pulse w-3/4 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-sm md:text-xl font-bold text-gray-700">
                        <span className="text-xl md:text-3xl flex-shrink-0">💰</span>
                        <span className="flex-shrink-0">가격 비교 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-green-400 to-green-600 h-full animate-pulse w-2/3 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-sm md:text-xl font-bold text-gray-700">
                        <span className="text-xl md:text-3xl flex-shrink-0">⭐</span>
                        <span className="flex-shrink-0">리뷰 분석 중...</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-600 h-full animate-pulse w-1/2 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="sticker border-red-400 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-10 max-w-2xl w-full px-2">
            <div className="flex items-center gap-2 md:gap-4 justify-center">
              <span className="text-3xl md:text-5xl flex-shrink-0">⚠️</span>
              <p className="text-base md:text-2xl font-black text-red-600 text-center">{error}</p>
            </div>
          </div>
        )}

        {/* 4단계: 결과 카드 */}
        {options && !loading && (
          <div className="w-full max-w-7xl px-2">
            <AIGuide 
              message="AI가 찾아온 3가지 선택지야! 아래에서 각 물건을 별점으로 평가해봐!"
              emoji="🎁"
            />
            
            {/* 기준 안내 스티커 */}
            <div className="sticker border-blue-300 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="text-2xl md:text-3xl">✨</span>
                  <span className="text-base md:text-2xl font-black text-gray-800">평가 기준:</span>
                  <span className="text-base md:text-2xl font-black text-purple-600">
                    {selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')}
                  </span>
                </div>
                <div className="sticker border-green-400 rounded-xl px-3 md:px-4 py-2">
                  <span className="text-base md:text-2xl font-black text-green-600">
                    💰 예산: {Number(budget).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden hover-scale-102 transform transition-all duration-200 border-4 border-gray-200"
                >
                  {/* 상단 헤더 */}
                  <div className={'p-3 md:p-5 ' + (
                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-b-4 border-yellow-300' :
                    index === 1 ? 'bg-gradient-to-r from-blue-100 to-sky-100 border-b-4 border-blue-300' :
                    'bg-gradient-to-r from-pink-100 to-purple-100 border-b-4 border-pink-300'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-3xl md:text-5xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="text-lg md:text-2xl font-black text-gray-800">
                          대안 {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 bg-white px-2 md:px-4 py-1 md:py-2 rounded-full border-2 border-yellow-300">
                        <span className="text-xl md:text-2xl">⭐</span>
                        <span className="text-sm md:text-lg font-black">4.{Math.floor(Math.random() * 3) + 3}</span>
                      </div>
                    </div>
                  </div>

                  {/* 상품 내용 */}
                  <div className="p-4 md:p-8 space-y-4 md:space-y-6">
                    <h3 className="text-xl md:text-3xl font-black text-gray-800">
                      {option.name}
                    </h3>
                    
                    {/* 가격 정보 스티커 */}
                    <div className={'sticker rounded-xl md:rounded-2xl p-3 md:p-5 ' + (
                      option.price > Number(budget) ? 'border-red-400' : 'border-green-400'
                    )}>
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <span className="text-base md:text-xl font-bold text-gray-700">💳 판매가</span>
                        <span className={'text-2xl md:text-4xl font-black ' + (
                          option.price > Number(budget) ? 'text-red-600' : 'text-green-600'
                        )}>
                          {option.price.toLocaleString()}원
                        </span>
                      </div>
                      {option.price > Number(budget) ? (
                        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-2 md:p-3 text-center">
                          <p className="text-sm md:text-lg text-red-700 font-black">⚠️ 예산 {(option.price - Number(budget)).toLocaleString()}원 초과</p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-2 md:p-3 text-center">
                          <p className="text-sm md:text-lg text-green-700 font-black">✅ 예산 내 구매 가능</p>
                        </div>
                      )}
                    </div>

                    {/* 특징 */}
                    <div className="space-y-2 md:space-y-3">
                      <p className="text-base md:text-xl font-black text-gray-800 flex items-center gap-2">
                        <span className="text-xl md:text-2xl">📋</span> 상품 특징
                      </p>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed bg-blue-50 p-3 md:p-4 rounded-xl whitespace-pre-line">
                        {option.features}
                      </p>
                    </div>

                    {/* 배송 정보 스티커 */}
                    <div className="flex items-center justify-between text-sm md:text-base font-bold border-t-2 border-gray-200 pt-3 md:pt-4">
                      <span className="flex items-center gap-1 md:gap-2 text-blue-600">
                        <span className="text-xl md:text-2xl">🚚</span> 무료배송
                      </span>
                      <span className="flex items-center gap-1 md:gap-2 text-orange-600">
                        <span className="text-xl md:text-2xl">📦</span> 오늘출발
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 의사결정 표 */}
            <div className="mt-8 md:mt-12">
              <div className="sticker border-purple-400 rounded-2xl md:rounded-3xl p-4 md:p-6 mb-6 md:mb-8 max-w-4xl mx-auto">
                <p className="text-base md:text-2xl text-center font-black text-gray-800">
                  <span className="text-2xl md:text-3xl">📊</span>{' '}
                  <span className="text-purple-600">내가 선택한 평가 기준:</span>{' '}
                  {selectedCriteria.map((c, idx) => (
                    <span key={c.id}>
                      <span className="text-xl md:text-2xl">{c.emoji}</span> <span className="font-black">{c.label.replace(/^[^\s]+\s/, '')}</span>
                      {idx < selectedCriteria.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
              
              {/* 모바일: 세로 배치, 데스크톱: 테이블 */}
              <div className="md:hidden space-y-6">
                {[0, 1, 2].map((optionIdx) => (
                  <div key={optionIdx} className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-purple-300">
                    <div className="bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 rounded-xl p-4 mb-4 text-center">
                      <div className="text-3xl mb-2">
                        {optionIdx === 0 ? '🥇' : optionIdx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-lg font-black text-gray-800">대안 {optionIdx + 1}</div>
                      <div className="text-sm font-bold text-gray-700 mt-1">{options[optionIdx].name}</div>
                    </div>
                    {selectedCriteria.map((criterion, criterionIdx) => {
                      const bgColors = ['bg-yellow-50', 'bg-sky-50', 'bg-pink-50']
                      return (
                        <div key={criterion.id} className={bgColors[criterionIdx % 3] + ' p-4 mb-3 rounded-xl border-2 border-purple-300'}>
                          <div className="text-base font-black text-gray-800 mb-3 flex items-center gap-2">
                            <span className="text-2xl">{criterion.emoji}</span>
                            {criterion.label.replace(/^[^\s]+\s/, '')}
                          </div>
                          <StarRating
                            rating={ratings[optionIdx][criterion.id] || 0}
                            onRatingChange={(value) => updateRating(optionIdx, criterion.id, value)}
                          />
                        </div>
                      )
                    })}
                    <div className="bg-gradient-to-r from-orange-200 via-yellow-200 to-amber-200 p-4 mb-3 rounded-xl border-2 border-purple-300 text-center">
                      <div className="text-2xl font-black text-gray-800 mb-2 flex items-center justify-center gap-2">
                        <span className="text-3xl">🏆</span> 총점
                      </div>
                      <div className="text-3xl font-black text-orange-600 mb-1">
                        {calculateTotal(optionIdx)}점
                      </div>
                      <div className="text-sm font-bold text-gray-600">
                        (최대 {selectedCriteria.length * 5}점)
                      </div>
                    </div>
                    <button
                      onClick={() => handleFinalChoice(optionIdx)}
                      disabled={showLearningSummary}
                      className="bubble-button w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-base disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      이걸로 결정! ✅
                    </button>
                  </div>
                ))}
              </div>

              {/* 데스크톱: 테이블 */}
              <div className="hidden md:block bg-white rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-8 overflow-x-auto border-4 border-purple-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200">
                      <th className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-tl-2xl">
                        평가 기준 📝
                      </th>
                      <th className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <div className="text-3xl md:text-4xl mb-2">🥇</div>
                        대안 1<br />
                        <span className="text-base md:text-xl font-bold">{options[0].name}</span>
                      </th>
                      <th className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <div className="text-3xl md:text-4xl mb-2">🥈</div>
                        대안 2<br />
                        <span className="text-base md:text-xl font-bold">{options[1].name}</span>
                      </th>
                      <th className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-tr-2xl">
                        <div className="text-3xl md:text-4xl mb-2">🥉</div>
                        대안 3<br />
                        <span className="text-base md:text-xl font-bold">{options[2].name}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 동적으로 생성된 평가 기준 행들 */}
                    {selectedCriteria.map((criterion, criterionIdx) => {
                      const bgColors = ['bg-yellow-50', 'bg-sky-50', 'bg-pink-50']
                      return (
                        <tr key={criterion.id} className={bgColors[criterionIdx % 3]}>
                          <td className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400">
                            <span className="text-2xl md:text-3xl">{criterion.emoji}</span> {criterion.label.replace(/^[^\s]+\s/, '')}
                          </td>
                          {[0, 1, 2].map((idx) => (
                            <td key={idx} className="p-4 md:p-6 border-4 border-purple-400">
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
                      <td className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400">
                        <span className="text-3xl md:text-4xl">🏆</span> 총점
                      </td>
                      {[0, 1, 2].map((idx) => (
                        <td key={idx} className="p-4 md:p-6 border-4 border-purple-400 text-center">
                          <div className="text-3xl md:text-5xl font-black text-orange-600 mb-2">
                            {calculateTotal(idx)}점
                          </div>
                          <div className="text-sm md:text-lg font-bold text-gray-600">
                            (최대 {selectedCriteria.length * 5}점)
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* 최종 선택 버튼 */}
                    <tr className="bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100">
                      <td className="p-4 md:p-6 text-lg md:text-2xl font-black text-gray-800 border-4 border-purple-400 rounded-bl-2xl">
                        <span className="text-3xl md:text-4xl">💚</span> 최종 선택
                      </td>
                      {[0, 1, 2].map((idx) => (
                        <td key={idx} className="p-4 md:p-6 border-4 border-purple-400 text-center">
                          <button
                            onClick={() => handleFinalChoice(idx)}
                            disabled={showLearningSummary}
                            className="bubble-button w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-base md:text-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
              <div className="mt-6 md:mt-8 sticker border-blue-300 rounded-2xl md:rounded-3xl p-4 md:p-6">
                <p className="text-base md:text-2xl text-gray-800 text-center leading-relaxed font-bold">
                  <span className="text-2xl md:text-3xl">💡</span> <span className="font-black">별을 클릭</span>해서 각 대안을 평가해보세요!<br />
                  내가 선택한 <span className="font-black text-purple-600">{selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')}</span> 기준으로 점수를 매겨보세요!<br />
                  <span className="text-2xl md:text-3xl">✨</span> 총점이 높을수록 나에게 더 좋은 선택이에요!
                </p>
              </div>
            </div>

            {/* AI 넛지 팝업 */}
            {showNudge && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-10 max-w-2xl w-full mx-4 border-4 border-orange-400">
                  <div className="space-y-4 md:space-y-8">
                    <div className="text-center">
                      <div className="text-5xl md:text-8xl mb-3 md:mb-4 animate-bounce">🤖</div>
                      <h3 className="text-2xl md:text-4xl font-black text-orange-600">
                        AI의 조언
                      </h3>
                    </div>
                    <div className="sticker border-orange-300 rounded-xl md:rounded-2xl p-4 md:p-8">
                      <p className="text-base md:text-2xl font-bold text-gray-800 leading-relaxed whitespace-pre-line text-center">
                        {nudgeMessage}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNudge(false)}
                      className="bubble-button w-full bg-gradient-to-r from-orange-400 to-red-400 text-white text-lg md:text-2xl min-h-[44px]"
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
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 max-w-2xl w-full mx-4 border-4 border-purple-300">
                  <div className="space-y-4 md:space-y-6">
                    <div className="text-center">
                      <div className="text-5xl md:text-7xl mb-3 md:mb-4">🤔</div>
                      <h3 className="text-xl md:text-3xl font-bold text-purple-600 mb-3 md:mb-4">
                        마지막 확인!
                      </h3>
                    </div>
                    
                    <div className="bg-purple-50 rounded-xl md:rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4">
                      <p className="text-lg md:text-2xl text-gray-800 font-bold text-center">
                        정말 이 물건이 최고의 선택일까?
                      </p>
                      <p className="text-base md:text-lg text-gray-700 text-center">
                        💡 총점이 가장 높은지 마지막으로 확인해봐!
                      </p>
                      
                      {/* 3가지 대안의 총점 비교 */}
                      <div className="grid grid-cols-3 gap-2 md:gap-3 mt-3 md:mt-4">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className={'p-3 md:p-4 rounded-xl text-center ' + (
                            idx === pendingChoice 
                              ? 'bg-yellow-100 border-4 border-yellow-400' 
                              : 'bg-gray-100'
                          )}>
                            <p className="text-sm md:text-lg font-bold mb-1 md:mb-2">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} 대안 {idx + 1}
                            </p>
                            <p className="text-xl md:text-3xl font-bold text-purple-600">
                              {calculateTotal(idx)}점
                            </p>
                            {idx === pendingChoice && (
                              <p className="text-xs md:text-sm text-yellow-700 font-bold mt-1 md:mt-2">
                                👆 선택한 것
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                      <button
                        onClick={() => setShowFinalCheck(false)}
                        className="flex-1 px-6 md:px-8 py-3 md:py-4 text-base md:text-xl font-bold text-gray-700 bg-gray-200 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 min-h-[44px]"
                      >
                        다시 생각하기 🔄
                      </button>
                      <button
                        onClick={confirmFinalChoice}
                        className="flex-1 px-6 md:px-8 py-3 md:py-4 text-base md:text-xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 min-h-[44px]"
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
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 max-w-2xl w-full mx-4 border-4 border-red-400">
                  <div className="space-y-4 md:space-y-6">
                    <div className="text-center">
                      <div className="text-5xl md:text-7xl mb-3 md:mb-4 animate-bounce">⚠️</div>
                      <h3 className="text-2xl md:text-4xl font-bold text-red-600 mb-3 md:mb-4">
                        구매 불가능!
                      </h3>
                    </div>
                    
                    <div className="bg-red-50 rounded-xl md:rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4">
                      <p className="text-lg md:text-2xl text-gray-800 font-bold text-center">
                        가진 돈이 부족해서<br />이 물건을 살 수 없어요! 😢
                      </p>
                      
                      <div className="bg-white rounded-xl p-3 md:p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm md:text-lg">
                          <span className="font-bold">💰 가진 돈 (예산):</span>
                          <span className="text-green-600 font-bold text-base md:text-xl">
                            {Number(budget).toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm md:text-lg">
                          <span className="font-bold">💳 선택한 물건 가격:</span>
                          <span className="text-red-600 font-bold text-base md:text-xl">
                            {options[pendingChoice]?.price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center text-sm md:text-lg">
                          <span className="font-bold">😭 부족한 금액:</span>
                          <span className="text-red-700 font-bold text-lg md:text-2xl">
                            {(options[pendingChoice]?.price - Number(budget)).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 rounded-xl p-3 md:p-4 border-2 border-yellow-300">
                        <p className="text-base md:text-lg text-yellow-900 text-center">
                          💡 <span className="font-bold">합리적 선택</span>은<br />
                          <span className="text-sm md:text-base">예산 안에서 가장 만족스러운 물건을 고르는 거예요!</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowBudgetWarning(false)}
                        className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 text-base md:text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 min-h-[44px]"
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
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
                <div className="min-h-full flex items-start justify-center p-4 py-8">
                  <div className="bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 rounded-3xl shadow-2xl p-6 md:p-8 max-w-4xl w-full border-4 border-emerald-300 my-auto">
                    <div className="space-y-6">
                    {/* 제목 */}
                    <div className="text-center">
                      <h3 className="text-2xl md:text-4xl font-bold text-emerald-800 mb-3 md:mb-4">
                        📚 오늘의 쇼핑을 정리해 볼까요? 📚
                      </h3>
                      <p className="text-base md:text-xl text-emerald-700">
                        스스로 생각한 '합리적 선택'의 의미를 써보세요!
                      </p>
                    </div>

                    {/* AI 피드백이 없을 때: 문장 완성 폼 */}
                    {!aiFeedback && (
                      <form onSubmit={handleLearningSummarySubmit} className="space-y-4 md:space-y-6">
                        {/* 문장 완성하기 */}
                        <div className="bg-white rounded-xl md:rounded-2xl shadow-inner p-4 md:p-8 border-2 border-emerald-200 space-y-4 md:space-y-6">
                          {/* 첫 번째 문장 */}
                          <div className="space-y-2 md:space-y-3">
                            <label className="block text-lg md:text-2xl font-bold text-gray-800">
                              나에게 합리적 선택이란
                            </label>
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                              <input
                                type="text"
                                value={answerA}
                                onChange={(e) => setAnswerA(e.target.value)}
                                placeholder="여기에 입력하세요"
                                className="flex-1 px-4 md:px-6 py-3 md:py-4 text-base md:text-xl border-4 border-emerald-300 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:border-emerald-400 min-h-[44px]"
                                disabled={feedbackLoading}
                              />
                              <span className="text-lg md:text-2xl font-bold text-gray-800 text-center md:text-left">(이)다.</span>
                            </div>
                          </div>

                          {/* 두 번째 문장 */}
                          <div className="space-y-2 md:space-y-3">
                            <label className="block text-lg md:text-2xl font-bold text-gray-800">
                              왜냐하면
                            </label>
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                              <input
                                type="text"
                                value={answerB}
                                onChange={(e) => setAnswerB(e.target.value)}
                                placeholder="여기에 입력하세요"
                                className="flex-1 px-4 md:px-6 py-3 md:py-4 text-base md:text-xl border-4 border-emerald-300 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:border-emerald-400 min-h-[44px]"
                                disabled={feedbackLoading}
                              />
                              <span className="text-lg md:text-2xl font-bold text-gray-800 text-center md:text-left">기 때문이다.</span>
                            </div>
                          </div>
                        </div>

                        {/* 제출 버튼 */}
                        <div className="flex justify-center">
                          <button
                            type="submit"
                            disabled={feedbackLoading}
                            className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 text-base md:text-2xl font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px]"
                          >
                            {feedbackLoading ? (
                              <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 md:w-6 md:h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
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
                        {/* 공유 카드 */}
                        <div 
                          ref={shareCardRef}
                          data-share-card="true"
                          className="rounded-3xl shadow-2xl p-8 relative overflow-visible"
                          style={{ 
                            minHeight: 'auto',
                            background: 'linear-gradient(to bottom right, #faf5ff, #fdf2f8, #fefce8)',
                            border: '4px solid #c084fc'
                          }}
                        >
                          {/* 배경 데코레이션 */}
                          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-3 left-3 text-5xl">🌟</div>
                            <div className="absolute top-3 right-3 text-5xl">✨</div>
                            <div className="absolute bottom-3 left-3 text-5xl">💫</div>
                            <div className="absolute bottom-3 right-3 text-5xl">⭐</div>
                          </div>

                          {/* 로고 & 타이틀 */}
                          <div className="relative text-center mb-6 pb-4" style={{ borderBottom: '4px solid #c084fc' }}>
                            <div className="flex items-center justify-center gap-3 mb-2">
                              <span className="text-4xl">🛒</span>
                              <h4 className="text-3xl font-black" style={{ color: '#9333ea' }}>
                                합리적 선택하기
                              </h4>
                              <span className="text-4xl">💡</span>
                            </div>
                            <p className="text-lg font-bold" style={{ color: '#4b5563' }}>
                              오늘의 학습 결과
                            </p>
                          </div>

                          {/* 학생의 답변 */}
                          <div className="relative bg-white rounded-2xl shadow-lg p-6 mb-5" style={{ border: '3px solid #6ee7b7' }}>
                            <div className="absolute -top-3 left-4 text-white px-3 py-1 rounded-full font-bold text-base shadow-md" style={{ backgroundColor: '#34d399' }}>
                              ✍️ 나의 생각
                            </div>
                            <div className="mt-3 space-y-3">
                              <p className="text-lg leading-relaxed" style={{ color: '#1f2937' }}>
                                나에게 <span className="font-black" style={{ color: '#9333ea' }}>합리적 선택</span>이란
                              </p>
                              <p className="text-2xl font-black pl-4" style={{ color: '#059669', borderLeft: '4px solid #34d399' }}>
                                {answerA}
                              </p>
                              <p className="text-lg" style={{ color: '#374151' }}>(이)다.</p>
                              <div className="h-px my-3" style={{ backgroundColor: '#d1d5db' }}></div>
                              <p className="text-lg leading-relaxed" style={{ color: '#1f2937' }}>
                                왜냐하면
                              </p>
                              <p className="text-2xl font-black pl-4" style={{ color: '#2563eb', borderLeft: '4px solid #60a5fa' }}>
                                {answerB}
                              </p>
                              <p className="text-lg" style={{ color: '#374151' }}>기 때문이다.</p>
                            </div>
                          </div>

                          {/* AI 피드백 */}
                          <div 
                            className="relative rounded-2xl shadow-lg p-6"
                            style={{
                              background: 'linear-gradient(to bottom right, #fef9c3, #fef3c7)',
                              border: '3px solid #fbbf24'
                            }}
                          >
                            <div className="absolute -top-3 left-4 text-white px-3 py-1 rounded-full font-bold text-base shadow-md flex items-center gap-2" style={{ backgroundColor: '#f59e0b' }}>
                              <span className="text-lg">🤖</span>
                              AI 선생님의 피드백
                            </div>
                            <p className="mt-3 text-lg leading-relaxed whitespace-pre-line" style={{ color: '#1f2937' }}>
                              {aiFeedback}
                            </p>
                          </div>

                          {/* 쇼핑 정보 */}
                          <div className="relative mt-5 rounded-xl p-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '2px solid #e9d5ff' }}>
                            <div className="flex flex-wrap items-center justify-center gap-3 text-base font-bold" style={{ color: '#374151' }}>
                              <span className="flex items-center gap-1">
                                <span className="text-xl">🎁</span>
                                <span className="text-sm">선택한 물건:</span> <span style={{ color: '#9333ea' }}>{item}</span>
                              </span>
                              <span style={{ color: '#9ca3af' }}>|</span>
                              <span className="flex items-center gap-1">
                                <span className="text-xl">💰</span>
                                <span className="text-sm">예산:</span> <span style={{ color: '#16a34a' }}>{Number(budget).toLocaleString()}원</span>
                              </span>
                              <span style={{ color: '#9ca3af' }}>|</span>
                              <span className="flex items-center gap-1">
                                <span className="text-xl">📊</span>
                                <span className="text-sm">평가 기준:</span> <span style={{ color: '#2563eb' }}>{selectedCriteria.map(c => c.label.replace(/^[^\s]+\s/, '')).join(', ')}</span>
                              </span>
                            </div>
                          </div>

                          {/* 하단 날짜 */}
                          <div className="relative text-center mt-5 pt-3" style={{ borderTop: '2px solid #e9d5ff' }}>
                            <p className="text-base font-bold" style={{ color: '#6b7280' }}>
                              📅 {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="space-y-3 md:space-y-4">
                          {/* 이미지 저장 버튼 */}
                          <div className="text-center">
                            <button
                              onClick={handleDownloadImage}
                              disabled={imageDownloading}
                              className="bubble-button w-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white text-lg md:text-2xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                            >
                              {imageDownloading ? (
                                <span className="flex items-center justify-center gap-2 md:gap-3">
                                  <div className="w-5 h-5 md:w-6 md:h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                  이미지 생성 중...
                                </span>
                              ) : (
                                '이미지로 저장하기 📸'
                              )}
                            </button>
                            <p className="text-sm md:text-lg text-gray-600 mt-2 md:mt-3 font-bold">
                              {imageDownloading 
                                ? '⏳ 잠시만 기다려주세요...' 
                                : '📸 버튼을 누르고 나의 결과를 친구들과 공유하자!'}
                            </p>
                          </div>

                          {/* 하단 버튼들 - 세로 배치 */}
                          <div className="flex flex-col gap-2 md:gap-3">
                            <button
                              onClick={() => {
                                setShowLearningSummary(false)
                                setAiFeedback(null)
                                setAnswerA('')
                                setAnswerB('')
                              }}
                              className="bubble-button w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-base md:text-xl min-h-[44px]"
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
                              className="bubble-button w-full bg-gradient-to-r from-purple-400 to-pink-400 text-white text-base md:text-xl min-h-[44px]"
                            >
                              처음으로 🏠
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mt-6 md:mt-8 px-2">
              <button
                onClick={() => {
                  setOptions(null)
                  setItem('')
                  setBudget('')
                  setShowCriteriaSelection(false)
                  setSelectedCriteria([])
                }}
                className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-200 min-h-[44px]"
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
