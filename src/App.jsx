import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, GraduationCap, Clock, RotateCcw, FolderOpen, Trash2, ChevronDown, ChevronUp, Search, MousePointerClick, HelpCircle, X, BrainCircuit, Key, Save, Download } from 'lucide-react';

// ==========================================
// 설정: Gemini 모델 변경
// ==========================================
// 배포 후 더 성능 좋은 모델을 사용하려면 아래 값을 변경하세요.
// 예: "gemini-1.5-pro", "gemini-pro" 등 (Google AI Studio에서 지원하는 모델명 확인 필요)
const GEMINI_MODEL = "gemini-3-pro-preview"; 

// ==========================================
// 0. Gemini API 호출 함수 (동적 키 사용)
// ==========================================
const getAiAdjustment = async (inputs, userApiKey) => {
  const { university, department, quota, realApplicants, revealedCount, myRank, calcDate, calcHour } = inputs;
  
  if (!university || !userApiKey) return { factor: 0, reason: '' };

  const competitionRate = (realApplicants / quota).toFixed(2);
  const revealedRatio = ((revealedCount / realApplicants) * 100).toFixed(1);
  
  let analysisTimeStr = "Current Time";
  if (calcDate && calcHour !== '') {
    analysisTimeStr = `${calcDate} ${calcHour}:00`;
  }

  const prompt = `
    Context: Advanced Analysis of South Korean University Admission Score Revelation (Jeomgong).
    Task: Calculate a precise "weight correction factor" (w_adj) for the unrevealed applicant pool based on ALL input factors including analysis time.
    
    [Input Data]
    - University: ${university}
    - Department: ${department}
    - Quota: ${quota}
    - Total Applicants: ${realApplicants} (Rate: ${competitionRate}:1)
    - Revealed Count: ${revealedCount} (Ratio: ${revealedRatio}%)
    - My Rank: ${myRank}
    - Analysis Time Point: ${analysisTimeStr}

    [Analysis Logic - Synthesis is Key]
    1. **Analyze University/Department Nature:**
       - Is it a top-tier preference (Medical, SKY)? Or a safety pick (unpopular majors at top schools)?
       - Is it a "Jigeoguk" (Regional National) or Education University? (Often has hidden high scorers).
    2. **Analyze Jeomgong Stats:**
       - **Revealed Ratio:** Low ratio in late period -> High risk of hidden scorers (+). High ratio -> Low risk (-).
       - **Competition Rate:** Extremely high rate might indicate "bubble" applicants (-), but in top depts, it means fierce competition (+).
    3. **Synthesize (Crucial):**
       - Combine nature and stats. E.g., "Safety pick department" + "High Jeomgong Ratio" = Very low risk of hidden superiors (-).
       - "Medical school" + "Low Jeomgong Ratio" = Extremely high risk of hidden superiors (+).
    4. **Focus:**
       - **IGNORE** dropout rates (ghosts leaving for other schools) or waitlist chances.
       - **FOCUS ONLY** on estimating the *current* rank by predicting how many unrevealed applicants are ranked higher than me.

    [Output Constraints - STRICT]
    - **Range:** Keep factor strictly between **-0.09 and +0.09**.
    - **Logic:**
      - **Positive (+):** Unrevealed pool is threatening (Hidden High Scorers). Conservative prediction.
      - **Negative (-):** Unrevealed pool is likely weaker. Optimistic prediction.
    
    Output Requirement:
    Return ONLY a raw JSON object.
    Structure: { "factor": number, "reason": "Short explanation in Korean (under 50 chars) synthesizing Dept nature & Ratio stats." }
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${userApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { factor: 0, reason: "분석 실패 (API 키 확인 필요)" };
  }
};

// ==========================================
// 0.1 API Key 설정 모달
// ==========================================
const ApiKeyModal = ({ onClose, apiKey, setApiKey }) => {
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSave = () => {
    setApiKey(tempKey);
    localStorage.setItem('gemini_api_key', tempKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="text-indigo-600" /> API 키 설정
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          AI 분석 기능을 사용하려면 Google Gemini API 키가 필요합니다.<br/>
          키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
        </p>
        <input 
          type="password" 
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
        />
        <div className="flex justify-end gap-2">
          <button 
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            <Save size={16} /> 저장하기
          </button>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
          * API 키 발급: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 underline">Google AI Studio</a>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 0.2 계산 과정 설명 모달 컴포넌트
// ==========================================
const LogicModal = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
            🧮 계산과정 설명
          </h2>
          
          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <p className="text-lg font-medium text-gray-800 mb-3">
                점공 계산의 핵심은 <span className="text-indigo-600 bg-indigo-50 px-1 rounded">"미점공자 중에 나보다 높은 점수가 몇 명이나 있을까?"</span>를 맞히는 것입니다.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                <li><strong>단순 비례식의 함정:</strong> "미점공자도 점공자와 수준이 똑같을 것이다"라고 가정하면 등수가 너무 비관적으로 나옵니다.</li>
                <li><strong>우리의 가설:</strong> 통계적으로 성적이 좋을수록 점공에 참여할 확률이 높습니다. 따라서 미점공자 집단에는 나보다 점수 높은 사람이 '드물게' 존재합니다.</li>
              </ul>
              <p className="mt-3 text-sm text-center text-gray-500">
                이 '드물게'라는 정도를 숫자로 만든 것이 바로 <span className="font-bold text-gray-800">가중치(w)</span>입니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                가중치는 어떻게 구해지나요?
              </h3>
              <p className="text-sm mb-3">
                가중치(w)는 <strong>'미점공자의 위협도'</strong>를 의미합니다. (1.0 = 매우 위협적, 0.2 = 위협적이지 않음)
                우리는 경쟁률을 기반으로 이 값을 자동으로 계산합니다.
              </p>
              
              <div className="bg-slate-800 text-white p-4 rounded-xl font-mono text-center text-sm mb-4 shadow-md">
                📉 경쟁률 로그 공식<br/>
                <span className="text-yellow-400 text-lg">w = 0.7 - 0.15 × ln(경쟁률)</span>
              </div>

              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                <li><strong>왜 자연로그(ln)를 쓰나요?</strong> 경쟁률이 5:1에서 10:1로 뛸 때와, 50:1에서 55:1로 뛸 때의 '허수 증가폭'은 다릅니다. 로그 함수는 경쟁률이 높아질수록 가중치를 합리적으로 낮춰주어, 경쟁률 폭발 학과에서 등수가 지나치게 밀리는 것을 방지합니다.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                점공 비율 보정
              </h3>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm space-y-2">
                <p><strong>점공 비율 = (점공 인원 / 전체 지원자)</strong></p>
                <p>점공 비율이 낮다는 것은 아직 '숨어있는 고수'가 많을 수 있다는 뜻입니다. 반대로 점공 비율이 높다면 이미 고득점자는 다 공개된 상태일 확률이 높습니다.</p>
                <p className="text-yellow-800 font-semibold">👉 점공 비율이 낮으면 가중치를 조금 높이고, 높으면 가중치를 낮춰서 보정합니다.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                시간 보정
              </h3>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm space-y-2">
                <p><strong>원리:</strong> 고득점자는 보통 점공 오픈 초기(1월 초)에 대부분 유입됩니다.</p>
                <p><strong>로직:</strong> 1월 1일 00:00를 기점으로, 시간이 흐를수록 가중치를 미세하게 낮춥니다.</p>
                <p className="text-blue-700">매 시간마다 정밀하게 계산되어 하루에 약 2%씩 미점공자의 위협도를 감소시킵니다. 즉, 늦게까지 점수를 공개하지 않는 사람은 '허수'일 확률이 높다고 판단합니다.</p>
                <p className="text-xs text-gray-400 mt-2 border-t border-blue-200 pt-2">
                  결과: 어제보다 오늘, 오늘보다 내일 내 예상 등수가 조금씩 좋아질 수 있습니다. (최대 30%까지 보정)
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                최종 등수 계산
              </h3>
              <div className="text-sm space-y-3">
                <p>위에서 구한 값들을 조합하여 최종 등수를 산출합니다.</p>
                <div className="bg-gray-100 p-4 rounded-xl text-xs font-mono space-y-2">
                  <p>1. 미점공 인원 = (전체 지원자) - (점공 참여자)</p>
                  <p>2. 내 위치(상위%) = (내 등수) ÷ (점공 참여자)</p>
                  <div className="bg-white p-3 rounded border border-gray-200 my-2">
                    <p className="font-bold text-indigo-600 mb-1">3. 상위 미점공자 예측 (핵심)</p>
                    <p>(미점공 인원) × (내 상위 %) × (최종 가중치 w)</p>
                    <p className="text-gray-400 mt-1">* 이 값은 반올림하여 정수로 계산합니다.</p>
                  </div>
                  <p className="font-bold text-gray-800">4. 최종 결과 = (현재 내 등수) + (상위 미점공자 예측값)</p>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="bg-violet-100 text-violet-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">AI</span>
                AI 맞춤 보정 (Gemini Analysis)
              </h3>
              <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 text-sm space-y-2">
                <p><strong>역할:</strong> 입력된 모든 데이터(대학/학과, 경쟁률, 점공률, 순위, 분석 시점)를 종합하여 미세 보정값(-0.09 ~ +0.09)을 산출합니다.</p>
                <p><strong>원리:</strong> 단순 통계로 파악하기 힘든 대학별 입시 역학(학과 특성, 점공 패턴, 분석 시점의 적절성 등)을 반영하여 숨겨진 고득점자의 존재 가능성을 추론합니다.</p>
                <p className="text-violet-700 font-semibold">최초합 여부나 추합 가능성이 아닌, '현재 시점에서의 정확한 등수'를 예측하는 데 집중합니다.</p>
              </div>
            </section>
          </div>
          
          <div className="mt-8 text-center">
            <button 
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 1. 핵심 알고리즘 (AI 보정치 반영)
// ==========================================
const calculatePrediction = (inputs, aiCorrectionData = { factor: 0, reason: '' }) => {
  const { quota, realApplicants, revealedCount, myRank, additionalPasses, calcDate, calcHour } = inputs;
  
  if (revealedCount > realApplicants) throw new Error("점공 인원이 전체 지원자보다 많을 수 없습니다.");
  if (myRank > revealedCount) throw new Error("나의 등수가 점공 인원보다 클 수 없습니다.");
  if (quota <= 0) throw new Error("모집 인원은 0보다 커야 합니다.");

  const competitionRate = realApplicants / quota;
  const revealedRatio = revealedCount / realApplicants; // 점공 비율 (0.0 ~ 1.0)
  
  // [1] 날짜 및 시간 기반 로직
  let now;
  if (calcDate && calcHour !== '') {
    const [y, m, d] = calcDate.split('-').map(Number);
    now = new Date(y, m - 1, d, parseInt(calcHour));
  } else {
    now = new Date();
  }

  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const timeDiff = Math.max(0, now - startDate);
  
  const totalHoursPassed = Math.floor(timeDiff / (1000 * 60 * 60));
  const daysPassed = Math.floor(totalHoursPassed / 24);
  const hoursLeft = totalHoursPassed % 24; 
  const timeDecayFactor = Math.min(0.3, totalHoursPassed * (0.02 / 24)); 

  // [2] 기본 가중치 산출
  const safeCompetitionRate = Math.max(1.1, competitionRate);
  let w = 0.7 - (0.15 * Math.log(safeCompetitionRate));
  
  // 점공 비율 보정
  const ratioCorrection = (0.5 - revealedRatio) * 0.2;
  w = w + ratioCorrection;

  // 점공 초반 보정
  if (daysPassed <= 3) {
    w = Math.max(w, 0.35); 
  }

  // [NEW] AI 특성 분석 보정 추가
  const aiFactor = aiCorrectionData.factor || 0;
  w = w + aiFactor;

  const baseWeight = Math.max(0.15, w); // 최소값 약간 하향 조정 (최상위권 반영 위해)
  const isAutoWeight = true;
  
  // [3] 시나리오별 가중치 설정
  const weights = {
    optimistic: 0.2,
    realistic: baseWeight * (1 - timeDecayFactor),
    pessimistic: 1.0
  };

  // [4] 공통 변수 계산
  const unrevealedCount = realApplicants - revealedCount;
  const rankRatio = myRank / revealedCount;

  // [5] 시나리오별 등수 계산
  const calculateRank = (w) => {
    const hiddenSuperiors = unrevealedCount * rankRatio * w;
    return myRank + Math.round(hiddenSuperiors);
  };
  
  const ranks = {
    optimistic: calculateRank(weights.optimistic),
    realistic: calculateRank(weights.realistic),
    pessimistic: calculateRank(weights.pessimistic)
  };

  // [6] 합격 확률 판정
  const getProbability = (rank) => {
    const userAdditionalPasses = (additionalPasses !== '' && additionalPasses !== null) 
      ? parseFloat(additionalPasses) 
      : Math.round(quota * 0.5);
    const maxRank = quota + userAdditionalPasses;
    const waitingNum = Math.ceil(rank) - quota;

    let prob = { label: "분석 불가", color: "text-gray-500", bgColor: "bg-gray-100", score: 0 };
    
    if (waitingNum <= 0) {
      if (rank <= quota * 0.8) prob = { label: "최초합 확실", color: "text-blue-700", bgColor: "bg-blue-50", score: 95 };
      else prob = { label: "최초합 적정", color: "text-green-700", bgColor: "bg-green-50", score: 85 };
    } else {
      if (rank <= maxRank * 0.8) prob = { label: "추합 유력", color: "text-yellow-700", bgColor: "bg-yellow-50", score: 65 };
      else if (rank <= maxRank) prob = { label: "추합권", color: "text-orange-700", bgColor: "bg-orange-50", score: 45 };
      else prob = { label: "불합격 유력", color: "text-red-700", bgColor: "bg-red-50", score: 15 };
    }
    return { ...prob, waitingNum: waitingNum > 0 ? `예비 ${waitingNum}번` : `최초합 예상` };
  };

  const probabilities = {
    optimistic: getProbability(ranks.optimistic),
    realistic: getProbability(ranks.realistic),
    pessimistic: getProbability(ranks.pessimistic)
  };

  const userAdditionalPasses = (additionalPasses !== '' && additionalPasses !== null) 
      ? parseFloat(additionalPasses) 
      : Math.round(quota * 0.5);

  return {
    ranks,
    probabilities,
    weights,
    metrics: {
      competitionRate: competitionRate.toFixed(2),
      revealedRatio: (revealedRatio * 100).toFixed(1),
      additionalPasses: userAdditionalPasses,
      maxRank: Math.floor(quota + userAdditionalPasses)
    },
    breakdown: {
      isAutoWeight,
      baseWeight: baseWeight.toFixed(3),
      daysPassed,
      hoursLeft,
      totalHoursPassed,
      timeDecayPercent: (timeDecayFactor * 100).toFixed(2),
      unrevealedCount,
      myRatioPercent: (rankRatio * 100).toFixed(2),
      ratioCorrection: ((0.5 - revealedRatio) * 0.2).toFixed(3),
      aiFactor: aiFactor.toFixed(3),
      aiReason: aiCorrectionData.reason
    }
  };
};

// ==========================================
// 2. 입력 컴포넌트
// ==========================================
const InputField = ({ label, name, value, onChange, placeholder, subtext, type = "number", step, min, max }) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-bold mb-1">{label}</label>
    {subtext && <p className="text-xs text-gray-500 mb-2">{subtext}</p>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      step={step}
      min={min}
      max={max}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      placeholder={placeholder}
    />
  </div>
);

const InputForm = ({ inputs, setInputs, onCalculate, onReset, savedList, onLoad, onDelete, isAiLoading, apiKey }) => {
  const [error, setError] = useState(null);
  const [isLoadOpen, setIsLoadOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = () => {
    try {
      const q = parseFloat(inputs.quota);
      const a = parseFloat(inputs.realApplicants);
      const v = parseFloat(inputs.revealedCount);
      const r = parseFloat(inputs.myRank);
      
      if (!q || !a || !v || !r) {
        setError("모든 필수 항목을 입력해주세요.");
        return;
      }
      onCalculate(); 
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">데이터 입력</h2>
        </div>
        <button 
          onClick={onReset}
          className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
          title="초기화"
        >
          <RotateCcw size={14} /> 초기화
        </button>
      </div>

      <div className="mb-6 bg-indigo-50 rounded-lg p-3 relative">
        <button 
          onClick={() => setIsLoadOpen(!isLoadOpen)}
          className="w-full flex items-center justify-between text-indigo-800 font-semibold text-sm"
        >
          <span className="flex items-center gap-2">
            <FolderOpen size={18} /> 저장된 데이터 불러오기 ({savedList.length})
          </span>
          <ChevronDown size={16} className={`transform transition-transform ${isLoadOpen ? 'rotate-180' : ''}`} />
        </button>

        {isLoadOpen && (
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {savedList.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-2">저장된 내역이 없습니다.</p>
            ) : (
              savedList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100 shadow-sm hover:border-indigo-300 transition-colors">
                  <button 
                    onClick={() => {
                      onLoad(item);
                      setIsLoadOpen(false);
                      setError(null);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-bold text-gray-800">
                      {item.university || "대학 미입력"} <span className="text-indigo-600">{item.department || "학과 미입력"}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.lastUpdated} | {item.quota}명 / {item.myRank}등
                    </div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(idx);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-y-1">
        <div className="grid grid-cols-2 gap-3 mb-2">
          <InputField label="대학" name="university" type="text" value={inputs.university} onChange={handleChange} placeholder="예: 서울대" />
          <InputField label="모집 단위(학과)" name="department" type="text" value={inputs.department} onChange={handleChange} placeholder="예: 경영학과" />
        </div>

        <InputField label="모집 인원 (명)" name="quota" value={inputs.quota} onChange={handleChange} placeholder="예: 35" />
        <InputField label="예상 추합 인원 (명)" name="additionalPasses" value={inputs.additionalPasses} onChange={handleChange} placeholder="예: 15" subtext="미입력시 모집 인원의 50%로 계산" />
        <InputField label="전체 지원자 수" name="realApplicants" value={inputs.realApplicants} onChange={handleChange} placeholder="최종 경쟁률 기준" />
        <InputField label="점공 참여 인원" name="revealedCount" value={inputs.revealedCount} onChange={handleChange} placeholder="현재 점공 리포트 기준" />
        <InputField label="나의 점공 등수" name="myRank" value={inputs.myRank} onChange={handleChange} placeholder="예: 12" />
        
        <div className="mt-2 pt-4 border-t border-gray-100 bg-gray-50 p-3 rounded-lg">
          <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500"/> 분석 시점 설정
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              name="calcDate"
              value={inputs.calcDate}
              onChange={handleChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
            <div className="relative w-28">
              <input
                type="number"
                name="calcHour"
                value={inputs.calcHour}
                onChange={handleChange}
                min="0"
                max="23"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center pr-8 bg-white"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">시</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* API Key 경고 (키가 없을 때만 표시) */}
      {inputs.university && inputs.department && !apiKey && (
        <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 rounded text-xs flex items-center gap-2">
          <Key size={14} /> AI 분석을 위해 우측 상단 열쇠 아이콘을 눌러 키를 설정하세요.
        </div>
      )}

      <button 
        onClick={handleSubmit} 
        disabled={isAiLoading}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isAiLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            대학 성향 분석중...
          </>
        ) : (
          <>
            <Calculator size={20} /> 분석 및 저장하기
          </>
        )}
      </button>
    </div>
  );
};

// ==========================================
// 3. 결과 시각화 컴포넌트
// ==========================================
const ResultView = ({ result, inputs, isAiLoading }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [activeScenario, setActiveScenario] = useState('realistic');

  useEffect(() => {
    if (result) setActiveScenario('realistic');
  }, [result]);

  const handleDownloadImage = async () => {
    const element = document.getElementById('report-card');
    if (!element) return;

    try {
      // 1. dom-to-image 라이브러리 로드 (html2canvas의 oklch 에러 해결을 위해 변경)
      if (!window.domtoimage) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // 2. 고해상도 캡처를 위한 스케일 설정
      const scale = 2;
      const options = {
        quality: 0.95,
        bgcolor: '#ffffff',
        width: element.offsetWidth * scale,
        height: element.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${element.offsetWidth}px`,
          height: `${element.offsetHeight}px`
        }
      };

      // 3. 캡처 실행 (dom-to-image 사용)
      const dataUrl = await window.domtoimage.toJpeg(element, options);

      // 4. 다운로드 처리
      const link = document.createElement('a');
      
      let dateStr = "";
      if (inputs.calcDate) {
        const [y, m, d] = inputs.calcDate.split('-');
        dateStr = `_${m}월_${d}일`;
      }
      
      let hourStr = "";
      if (inputs.calcHour !== "" && inputs.calcHour !== undefined) {
        hourStr = `_${inputs.calcHour}시`;
      }

      const filename = `점공분석_${inputs.university || '대학'}_${inputs.department || '학과'}${dateStr}${hourStr}.jpg`;
      
      link.download = filename;
      link.href = dataUrl;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Screenshot failed:', error);
      alert(`이미지 저장 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  if (isAiLoading) return (
     <div className="bg-white p-12 rounded-xl shadow-md border border-dashed border-indigo-200 text-center h-full flex flex-col justify-center items-center animate-pulse">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
      <h3 className="text-xl font-bold text-indigo-900">AI 대학 성향 분석중...</h3>
      <p className="text-indigo-600 mt-2 text-sm">
        {inputs.university} {inputs.department}의<br/>점공 패턴과 군별 특성을 분석 중입니다.
      </p>
    </div>
  );

  if (!result) return (
    <div className="bg-white p-12 rounded-xl shadow-md border border-dashed border-gray-300 text-center h-full flex flex-col justify-center items-center">
      <div className="text-6xl mb-6 opacity-20">📊</div>
      <h3 className="text-xl font-bold text-gray-400">데이터를 입력해주세요</h3>
      <p className="text-gray-400 mt-2 text-sm">
        시나리오별 분석 결과와<br/>AI 맞춤 보정 결과를 확인하세요.
      </p>
    </div>
  );

  const { ranks, probabilities, metrics, weights, breakdown } = result;
  
  const currentRank = ranks[activeScenario];
  const currentProb = probabilities[activeScenario];
  const currentWeight = weights[activeScenario];
  
  const estimatedHidden = Math.round(breakdown.unrevealedCount * (breakdown.myRatioPercent/100) * currentWeight);

  const scenarioNames = {
    optimistic: '행복회로 (낙관)',
    realistic: '합리적 예측',
    pessimistic: '보수적 (비관)'
  };
  
  const today = new Date().toLocaleDateString();

  return (
    <div id="report-card" className="bg-white p-6 rounded-xl shadow-md border border-indigo-50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">분석 리포트</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {today} 기준
          </div>
          <button 
            onClick={handleDownloadImage}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="이미지로 저장 (.jpg)"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {(inputs.university || inputs.department) && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-gray-800">
            {inputs.university} <span className="text-indigo-600">{inputs.department}</span>
          </h3>
        </div>
      )}
      
      <div className={`p-6 rounded-2xl text-center mb-6 border-2 transition-all duration-300 ${currentProb.bgColor} ${currentProb.color.replace('text', 'border').replace('700', '200')}`}>
        <p className="text-sm text-gray-600 font-semibold mb-2 flex justify-center items-center gap-2">
          {scenarioNames[activeScenario]} 결과
        </p>
        {/* [MODIFIED] pb-2 추가하여 폰트 아랫부분 잘림 방지 */}
        <div className="text-6xl font-extrabold text-indigo-900 mb-2 tracking-tighter pb-2">
          {currentRank}
          <span className="text-2xl font-normal text-gray-400 ml-1">등</span>
        </div>
        <div className={`text-xl font-bold inline-flex items-center gap-2 ${currentProb.color} bg-white px-4 py-1 rounded-full shadow-sm`}>
          {currentProb.waitingNum}
        </div>
        <p className="text-xs text-gray-500 mt-3 font-medium">
           {currentProb.label}
        </p>
      </div>

      <div className="space-y-6 flex-grow">
        <div>
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-1">
            <MousePointerClick size={16}/> 시나리오 선택 (클릭하여 상세 확인)
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <button 
              onClick={() => setActiveScenario('optimistic')}
              className={`p-3 rounded-xl border transition-all duration-200 ${activeScenario === 'optimistic' ? 'bg-green-100 border-green-400 ring-2 ring-green-200' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}
            >
              <div className="font-bold text-green-700 text-lg">{ranks.optimistic}등</div>
              <div className="text-xs text-gray-500 font-medium">행복회로</div>
            </button>
            <button 
              onClick={() => setActiveScenario('realistic')}
              className={`p-3 rounded-xl border transition-all duration-200 ${activeScenario === 'realistic' ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-200 transform scale-105' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}`}
            >
              <div className="font-bold text-indigo-700 text-lg">{ranks.realistic}등</div>
              <div className="text-xs text-gray-500 font-medium">합리적</div>
            </button>
            <button 
              onClick={() => setActiveScenario('pessimistic')}
              className={`p-3 rounded-xl border transition-all duration-200 ${activeScenario === 'pessimistic' ? 'bg-red-100 border-red-400 ring-2 ring-red-200' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
            >
              <div className="font-bold text-red-700 text-lg">{ranks.pessimistic}등</div>
              <div className="text-xs text-gray-500 font-medium">보수적</div>
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <button 
            onClick={() => setShowDetail(!showDetail)}
            className="w-full flex items-center justify-between font-semibold text-gray-700 text-sm mb-3 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-2"><Search size={16}/> 
              {scenarioNames[activeScenario]} 상세 계산 과정
            </span>
            {showDetail ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          
          {showDetail && (
            <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-3 mb-4 border border-gray-200 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                 <p className="text-xs font-bold text-gray-500 border-b pb-1">1. 가중치 산출</p>
                 
                 {activeScenario === 'optimistic' && (
                   <div className="text-gray-600 text-xs bg-green-50 p-2 rounded">
                     행복회로 모드는 <strong>고정 가중치 0.2</strong>를 사용합니다.<br/>
                     (미점공자가 대부분 허수라고 가정)
                   </div>
                 )}
                 {activeScenario === 'pessimistic' && (
                   <div className="text-gray-600 text-xs bg-red-50 p-2 rounded">
                     보수적 모드는 <strong>가중치 1.0</strong>을 사용합니다.<br/>
                     (단순 비례식: 미점공자도 점공자와 수준이 같음)
                   </div>
                 )}
                 {activeScenario === 'realistic' && (
                   <>
                     <div className="flex justify-between text-gray-600">
                       <span>로그 공식 (경쟁률 {metrics.competitionRate}:1)</span>
                       <span className="font-mono">{breakdown.isAutoWeight ? (parseFloat(breakdown.baseWeight) - parseFloat(breakdown.ratioCorrection) - parseFloat(breakdown.aiFactor)).toFixed(3) : '수동'}</span>
                     </div>
                     {breakdown.isAutoWeight && (
                        <div className="flex justify-end mb-1">
                           <div className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                             * 0.7 - 0.15 × ln({metrics.competitionRate})
                           </div>
                        </div>
                     )}

                     {breakdown.isAutoWeight && (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>점공 비율 보정 ({metrics.revealedRatio}%)</span>
                            <span className={`font-mono ${parseFloat(breakdown.ratioCorrection) > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                              {parseFloat(breakdown.ratioCorrection) > 0 ? '+' : ''}{breakdown.ratioCorrection}
                            </span>
                          </div>
                          <div className="flex justify-end mb-1">
                             <div className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                               * 점공률이 낮을수록 보수적(+) 보정
                             </div>
                          </div>
                        </>
                     )}

                     <div className="flex justify-between text-gray-600 items-center">
                       <span className="flex items-center gap-1">AI 보정 <BrainCircuit size={12} className="text-violet-500"/></span>
                       <span className={`font-mono ${parseFloat(breakdown.aiFactor) > 0 ? 'text-red-500' : parseFloat(breakdown.aiFactor) < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                         {parseFloat(breakdown.aiFactor) > 0 ? '+' : ''}{breakdown.aiFactor}
                       </span>
                     </div>
                     {breakdown.aiReason && (
                       <div className="text-[10px] text-violet-600 bg-violet-50 px-2 py-1 rounded text-right mb-1">
                         {breakdown.aiReason}
                       </div>
                     )}

                     <div className="flex justify-between text-gray-600">
                       <span>시간 보정 (D+{breakdown.daysPassed})</span>
                       <span className="font-mono text-red-500">-{breakdown.timeDecayPercent}%</span>
                     </div>
                   </>
                 )}

                 <div className="flex justify-between font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                   <span>최종 적용 가중치</span>
                   <span className="font-mono">{currentWeight.toFixed(3)}</span>
                 </div>
              </div>

              <div className="space-y-2 pt-2">
                 <p className="text-xs font-bold text-gray-500 border-b pb-1">2. 미점공 상위권 예측</p>
                 <div className="flex justify-between text-gray-600 text-xs">
                   <span>미점공 인원</span>
                   <span className="font-mono">{breakdown.unrevealedCount}명</span>
                 </div>
                 <div className="flex justify-between text-gray-600 text-xs">
                   <span>나의 상위 비율</span>
                   <span className="font-mono">{breakdown.myRatioPercent}%</span>
                 </div>
                 <div className="bg-white border p-2 rounded text-xs text-center text-gray-600 font-mono">
                    {breakdown.unrevealedCount}명 × {breakdown.myRatioPercent}% × {currentWeight.toFixed(3)}
                    <div className="font-bold text-indigo-700 text-sm mt-1">
                      = {estimatedHidden}명 (반올림)
                    </div>
                 </div>
              </div>

              <div className="space-y-2 pt-2">
                 <p className="text-xs font-bold text-gray-500 border-b pb-1">3. 최종 등수 합산</p>
                 <div className="flex justify-between items-center">
                   <span>나의 등수</span>
                   <span className="font-mono font-bold">{inputs.myRank}등</span>
                 </div>
                 <div className="flex justify-center text-gray-400 text-xs">+</div>
                 <div className="flex justify-between items-center">
                   <span>미점공자 중 상위 인원수(예측)</span>
                   <span className="font-mono font-bold">{estimatedHidden}명</span>
                 </div>
                 <div className="border-t border-gray-300 my-1"></div>
                 <div className="flex justify-between items-center text-indigo-700 bg-indigo-50 p-2 rounded">
                   <span className="font-bold">최종 예상 등수</span>
                   <span className="font-mono font-extrabold text-lg">{currentRank}등</span>
                 </div>
              </div>
            </div>
          )}

          {!showDetail && (
            <ul className="text-sm space-y-2 text-gray-600 bg-gray-50 p-4 rounded-xl">
              <li className="flex justify-between items-center">
                <span>경쟁률</span>
                <span className="font-mono font-bold">{metrics.competitionRate} : 1</span>
              </li>
              <li className="flex justify-between items-center">
                <span>점공 참여율</span>
                <span className="font-mono font-bold">{metrics.revealedRatio}%</span>
              </li>
              <li className="flex justify-between items-center">
                <span>추가 합격 인원</span>
                <span className="font-mono font-bold text-indigo-600">+{metrics.additionalPasses}명</span>
              </li>
              <li className="flex justify-between items-center">
                <span>합격 커트라인(등수)</span>
                <span className="font-mono font-bold text-blue-600">{metrics.maxRank}등</span>
              </li>
              <li className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 mt-1">
                <span className="font-bold text-indigo-900">현재 적용 가중치</span>
                <span className="font-mono font-bold text-indigo-900">{currentWeight.toFixed(3)}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 메인 앱 통합
// ==========================================

// Helper functions for date/time
const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentHour = () => new Date().getHours();

function App() {
  // API Key State 관리 (localStorage 연동)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [showKeyModal, setShowKeyModal] = useState(false);

  // [NEW] calcDate, calcHour 초기값 추가
  const initialInputs = {
    university: '', 
    department: '', 
    quota: '', 
    realApplicants: '', 
    revealedCount: '', 
    myRank: '', 
    additionalPasses: '',
    calcDate: getToday(),
    calcHour: getCurrentHour()
  };

  const [inputs, setInputs] = useState(() => {
    const lastSession = localStorage.getItem('jeomgong_current_session');
    if (lastSession) {
      const parsed = JSON.parse(lastSession);
      return {
        ...parsed,
        calcDate: getToday(),
        calcHour: getCurrentHour()
      };
    }
    return initialInputs;
  });

  const [savedList, setSavedList] = useState(() => {
    const saved = localStorage.getItem('jeomgong_list');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [result, setResult] = useState(null);
  const [showLogicModal, setShowLogicModal] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => { localStorage.setItem('jeomgong_current_session', JSON.stringify(inputs)); }, [inputs]);
  useEffect(() => { localStorage.setItem('jeomgong_list', JSON.stringify(savedList)); }, [savedList]);

  const handleCalculate = async () => {
    const calcInputs = {
      ...inputs,
      quota: parseFloat(inputs.quota),
      realApplicants: parseFloat(inputs.realApplicants),
      revealedCount: parseFloat(inputs.revealedCount),
      myRank: parseFloat(inputs.myRank),
    };

    // 1. 기본 계산 결과
    let tempResult = calculatePrediction(calcInputs);
    setResult(tempResult);

    // 2. AI 보정 실행 (대학/학과 입력 및 API 키 존재 시)
    if (inputs.university || inputs.department) {
      if (apiKey) {
        setIsAiLoading(true);
        // [MODIFIED] API 키를 인자로 전달
        const aiData = await getAiAdjustment(calcInputs, apiKey);
        
        // AI 보정치 적용하여 재계산
        const finalResult = calculatePrediction(calcInputs, aiData);
        setResult(finalResult);
        setIsAiLoading(false);
      }
    }

    // 저장 로직
    if (inputs.university && inputs.department) {
      const now = new Date();
      const timestamp = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;
      
      const newItem = { ...inputs, lastUpdated: timestamp };

      setSavedList(prevList => {
        const existingIndex = prevList.findIndex(
          item => item.university === inputs.university && item.department === inputs.department
        );

        if (existingIndex >= 0) {
          const newList = [...prevList];
          newList[existingIndex] = newItem;
          return newList;
        } else {
          return [newItem, ...prevList];
        }
      });
    }
  };

  const handleLoad = (item) => {
    setInputs({ 
      ...item,
      calcDate: getToday(),
      calcHour: getCurrentHour()
    });
    setResult(null);
  };

  const handleDelete = (index) => {
    if (window.confirm('삭제하시겠습니까?')) {
      setSavedList(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleReset = () => {
    if (window.confirm('모두 지우시겠습니까?')) {
      setInputs({
        ...initialInputs,
        calcDate: getToday(), 
        calcHour: getCurrentHour()
      });
      setResult(null);
      localStorage.removeItem('jeomgong_current_session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-12">
      {/* 모달 렌더링 */}
      {showLogicModal && <LogicModal onClose={() => setShowLogicModal(false)} />}
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} apiKey={apiKey} setApiKey={setApiKey} />}

      <header className="bg-indigo-900 text-white py-8 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                🎓 점수공개 계산기
              </h1>
              <p className="text-indigo-200 text-sm mt-2 font-light">
                AI 기반 점수공개 예측 서비스
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 text-xs sm:text-sm bg-indigo-800 hover:bg-indigo-700 text-indigo-100 px-3 py-2 rounded-full transition-colors border border-indigo-700 shadow-sm"
                title="API 키 설정"
              >
                <Key size={16} />
                <span className="hidden sm:inline">{apiKey ? '키 변경' : '키 설정'}</span>
              </button>
              <button 
                onClick={() => setShowLogicModal(true)}
                className="flex items-center gap-1.5 text-xs sm:text-sm bg-indigo-800 hover:bg-indigo-700 text-indigo-100 px-4 py-2 rounded-full transition-colors border border-indigo-700 shadow-sm"
              >
                <HelpCircle size={16} />
                <span className="hidden sm:inline">계산과정 설명</span>
                <span className="sm:hidden">설명</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="w-full">
            <InputForm 
              inputs={inputs} setInputs={setInputs} onCalculate={handleCalculate} onReset={handleReset}
              savedList={savedList} onLoad={handleLoad} onDelete={handleDelete} isAiLoading={isAiLoading} apiKey={apiKey}
            />
            <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-600">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">💡 사용 안내</h3>
              <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm">
                <li><strong>시나리오</strong>를 클릭하면 해당 시나리오의 계산 과정을 볼 수 있습니다.</li>
                <li>예상 추합 인원을 비워두면 모집인원의 50%로 계산합니다.</li>
                <li>상단의 <strong>계산과정 설명</strong> 버튼을 누르면 자세한 원리를 볼 수 있습니다.</li>
              </ul>
            </div>
          </div>
          <div className="w-full md:min-h-[600px]">
             <ResultView result={result} inputs={inputs} isAiLoading={isAiLoading} />
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-gray-400 text-xs border-t border-gray-200 mt-8">
        <p>본 서비스는 통계적 추정치를 제공하며 실제 합격 여부를 보장하지 않습니다.</p>
        <p className="mt-1">Based on Open Source Research • Personal Project</p>
      </footer>
    </div>
  );
}

export default App;