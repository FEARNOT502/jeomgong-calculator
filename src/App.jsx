import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle2, TrendingUp, Users, AlertTriangle, GraduationCap, Clock, Save, RotateCcw, Calendar, FolderOpen, Trash2, ChevronDown } from 'lucide-react';

// ==========================================
// 1. 핵심 알고리즘 (추합 인원, 예비번호 로직)
// ==========================================
const calculatePrediction = (inputs) => {
  const { quota, realApplicants, revealedCount, myRank, weight, additionalPasses } = inputs;
  
  if (revealedCount > realApplicants) throw new Error("점공 인원이 전체 지원자보다 많을 수 없습니다.");
  if (myRank > revealedCount) throw new Error("나의 등수가 점공 인원보다 클 수 없습니다.");
  if (quota <= 0) throw new Error("모집 인원은 0보다 커야 합니다.");

  const competitionRate = realApplicants / quota;
  
  // 날짜 기반 로직
  const now = new Date();
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, 0, 1); 
  const timeDiff = now - startDate;
  const daysPassed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  const timeDecayFactor = Math.min(0.3, daysPassed * 0.02); 

  let baseWeight = weight ? parseFloat(weight) : null;
  if (baseWeight === null) {
    baseWeight = Math.max(0.2, 0.7 - (0.15 * Math.log(competitionRate)));
  }
  const appliedWeight = baseWeight * (1 - timeDecayFactor);

  const unrevealedCount = realApplicants - revealedCount;
  const rankRatio = myRank / revealedCount;

  const optimisticRank = myRank + (unrevealedCount * rankRatio * 0.2);
  const realisticRank = myRank + (unrevealedCount * rankRatio * appliedWeight);
  const pessimisticRank = myRank * (realApplicants / revealedCount);

  // --- [Modified] 추합 인원 반영 합격 확률 판정 ---
  // 사용자 입력 추합 인원이 없으면 기본적으로 모집인원의 50% 가정
  const userAdditionalPasses = (additionalPasses !== '' && additionalPasses !== null) 
    ? parseFloat(additionalPasses) 
    : Math.round(quota * 0.5);
    
  const maxRank = quota + userAdditionalPasses; // 모집인원 + 추합인원 = 최종 등수 컷

  // 예비 번호 계산 (예상 등수 - 모집 인원)
  // 음수면 최초합, 양수면 예비 번호
  const waitingNum = Math.ceil(realisticRank) - quota;
  
  let probability = { label: "분석 불가", color: "text-gray-500", bgColor: "bg-gray-100", score: 0 };

  // 모집인원 안쪽이면 최초합
  if (waitingNum <= 0) {
    if (realisticRank <= quota * 0.8) probability = { label: "최초합 확실 (Very Safe)", color: "text-blue-700", bgColor: "bg-blue-50", score: 95 };
    else probability = { label: "최초합 적정 (Safe)", color: "text-green-700", bgColor: "bg-green-50", score: 85 };
  } else {
    // 예비 번호를 받았을 때
    if (realisticRank <= maxRank * 0.8) probability = { label: "추합 유력 (Probable)", color: "text-yellow-700", bgColor: "bg-yellow-50", score: 65 };
    else if (realisticRank <= maxRank) probability = { label: "추합권 (Risky)", color: "text-orange-700", bgColor: "bg-orange-50", score: 45 };
    else probability = { label: "불합격 유력 (Danger)", color: "text-red-700", bgColor: "bg-red-50", score: 15 };
  }

  return {
    ranks: {
      optimistic: Math.floor(optimisticRank),
      realistic: Math.floor(realisticRank),
      pessimistic: Math.floor(pessimisticRank)
    },
    waitingNum: waitingNum > 0 ? `예비 ${waitingNum}번` : `최초합 예상`,
    probability,
    metrics: {
      competitionRate: competitionRate.toFixed(2),
      appliedWeight: appliedWeight.toFixed(2),
      revealedRatio: ((revealedCount / realApplicants) * 100).toFixed(1),
      additionalPasses: userAdditionalPasses,
      maxRank: Math.floor(maxRank)
    }
  };
};

// ==========================================
// 2. 입력 컴포넌트 (추합 인원 입력으로 변경)
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

const InputForm = ({ inputs, setInputs, onCalculate, onReset, savedList, onLoad, onDelete }) => {
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

      {/* 저장된 데이터 불러오기 */}
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
          <InputField label="학과" name="department" type="text" value={inputs.department} onChange={handleChange} placeholder="예: 경영학과" />
        </div>

        <InputField label="모집 인원 (명)" name="quota" value={inputs.quota} onChange={handleChange} placeholder="예: 35" />
        
        {/* [Modified] 추합 인원 입력 필드 */}
        <InputField 
          label="예상 추합 인원 (명)" 
          name="additionalPasses" 
          value={inputs.additionalPasses} 
          onChange={handleChange} 
          placeholder="예: 15 (작년 입결 참고)" 
          subtext="미입력시 모집 인원의 50%로 계산합니다."
        />

        <InputField label="전체 지원자 수" name="realApplicants" value={inputs.realApplicants} onChange={handleChange} placeholder="최종 경쟁률 기준" />
        <InputField label="점공 참여 인원" name="revealedCount" value={inputs.revealedCount} onChange={handleChange} placeholder="현재 점공 리포트 기준" />
        <InputField label="나의 점공 등수" name="myRank" value={inputs.myRank} onChange={handleChange} placeholder="예: 12" />
        
        <div className="mt-2 pt-4 border-t border-gray-100 bg-gray-50 p-3 rounded-lg">
          <label className="block text-gray-700 text-sm font-bold mb-1 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500"/> 시간 반영 가중치 설정
          </label>
          <input type="number" name="weight" value={inputs.weight} onChange={handleChange} step="0.1" min="0.1" max="1.0" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="자동 계산 (권장)" />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button onClick={handleSubmit} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg flex justify-center items-center gap-2">
        <Calculator size={20} /> 분석 및 저장하기
      </button>
    </div>
  );
};

// ==========================================
// 3. 결과 시각화 컴포넌트 (공유 기능 제거)
// ==========================================
const ResultView = ({ result, inputs }) => {
  if (!result) return (
    <div className="bg-white p-12 rounded-xl shadow-md border border-dashed border-gray-300 text-center h-full flex flex-col justify-center items-center">
      <div className="text-6xl mb-6 opacity-20">📊</div>
      <h3 className="text-xl font-bold text-gray-400">데이터를 입력해주세요</h3>
      <p className="text-gray-400 mt-2 text-sm">
        추합 인원까지 고려한 정밀 분석 결과를<br/>제공해 드립니다.
      </p>
    </div>
  );

  const { ranks, probability, metrics, waitingNum } = result;
  const today = new Date().toLocaleDateString();

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-50 h-full flex flex-col">
      {/* Header with No Share Button */}
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">분석 리포트</h2>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {today} 기준
        </div>
      </div>

      {(inputs.university || inputs.department) && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-gray-800">
            {inputs.university} <span className="text-indigo-600">{inputs.department}</span>
          </h3>
        </div>
      )}
      
      <div className={`p-6 rounded-2xl text-center mb-6 border-2 ${probability.bgColor} ${probability.color.replace('text', 'border').replace('700', '200')}`}>
        <p className="text-sm text-gray-600 font-semibold mb-2">최종 예상 등수 (Realistic)</p>
        <div className="text-6xl font-extrabold text-indigo-900 mb-2 tracking-tighter">
          {ranks.realistic}
          <span className="text-2xl font-normal text-gray-400 ml-1">등</span>
        </div>
        <div className={`text-xl font-bold inline-flex items-center gap-2 ${probability.color} bg-white px-4 py-1 rounded-full shadow-sm`}>
          {waitingNum}
        </div>
        <p className="text-xs text-gray-500 mt-3 font-medium">
           {probability.label}
        </p>
      </div>

      <div className="space-y-6 flex-grow">
        <div>
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-1">
            <Users size={16}/> 시나리오별 예측
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="font-bold text-green-700 text-lg">{ranks.optimistic}등</div>
              <div className="text-xs text-gray-500 font-medium">행복회로</div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border-2 border-indigo-200 shadow-sm transform scale-105">
              <div className="font-bold text-indigo-700 text-lg">{ranks.realistic}등</div>
              <div className="text-xs text-gray-500 font-medium">합리적</div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="font-bold text-red-700 text-lg">{ranks.pessimistic}등</div>
              <div className="text-xs text-gray-500 font-medium">최악/보수</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">분석 상세 데이터</h3>
          <ul className="text-sm space-y-2 text-gray-600 bg-gray-50 p-4 rounded-xl">
            <li className="flex justify-between items-center">
              <span>경쟁률</span>
              <span className="font-mono font-bold">{metrics.competitionRate} : 1</span>
            </li>
            <li className="flex justify-between items-center">
              <span>적용된 추합 인원</span>
              <span className="font-mono font-bold text-indigo-600">+{metrics.additionalPasses}명</span>
            </li>
            <li className="flex justify-between items-center">
              <span>예상 합격 최종등수(Cut)</span>
              <span className="font-mono font-bold text-blue-600">{metrics.maxRank}등</span>
            </li>
            <li className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 mt-1">
              <span className="font-bold text-indigo-900">최종 적용 가중치(w)</span>
              <span className="font-mono font-bold text-indigo-900">{metrics.appliedWeight}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 메인 앱 통합
// ==========================================
function App() {
  const initialInputs = {
    university: '', department: '', quota: '', realApplicants: '', revealedCount: '', myRank: '', weight: '', additionalPasses: ''
  };

  const [inputs, setInputs] = useState(() => {
    const lastSession = localStorage.getItem('jeomgong_current_session');
    return lastSession ? JSON.parse(lastSession) : initialInputs;
  });

  const [savedList, setSavedList] = useState(() => {
    const saved = localStorage.getItem('jeomgong_list');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [result, setResult] = useState(null);

  useEffect(() => { localStorage.setItem('jeomgong_current_session', JSON.stringify(inputs)); }, [inputs]);
  useEffect(() => { localStorage.setItem('jeomgong_list', JSON.stringify(savedList)); }, [savedList]);

  const handleCalculate = () => {
    // 입력값을 계산 함수로 전달
    const calcInputs = {
      ...inputs,
      quota: parseFloat(inputs.quota),
      realApplicants: parseFloat(inputs.realApplicants),
      revealedCount: parseFloat(inputs.revealedCount),
      myRank: parseFloat(inputs.myRank),
      // 추합인원(additionalPasses)는 calculatePrediction 내부에서 처리됨 (입력 안하면 자동 계산)
    };
    const calcResult = calculatePrediction(calcInputs);
    setResult(calcResult);

    // 대학/학과 입력 시 저장 목록 업데이트
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
    setInputs({ ...item });
    setResult(null);
  };

  const handleDelete = (index) => {
    if (window.confirm('삭제하시겠습니까?')) {
      setSavedList(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleReset = () => {
    if (window.confirm('모두 지우시겠습니까?')) {
      setInputs(initialInputs);
      setResult(null);
      localStorage.removeItem('jeomgong_current_session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-12">
      <header className="bg-indigo-900 text-white py-8 shadow-lg">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🎓 점수공개 계산기
          </h1>
          <p className="text-indigo-200 text-sm mt-2 font-light">
            AI 기반 점수공개 예측 서비스
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="w-full">
            <InputForm 
              inputs={inputs} setInputs={setInputs} onCalculate={handleCalculate} onReset={handleReset}
              savedList={savedList} onLoad={handleLoad} onDelete={handleDelete}
            />
            <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-600">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">💡 꿀팁</h3>
              <ul className="list-disc list-inside space-y-1 ml-1 text-xs sm:text-sm">
                <li><strong>예상 추합 인원</strong>을 입력하면 합격 커트라인을 더 정확히 계산합니다. (미입력시 모집인원의 절반으로 계산)</li>
                <li>'예상 등수'가 모집인원보다 크면 <strong>예비 번호</strong>를 보여줍니다.</li>
                <li>'계산하기'를 누르면 입력한 내용이 자동으로 저장됩니다.</li>
              </ul>
            </div>
          </div>
          <div className="w-full md:min-h-[600px]">
             <ResultView result={result} inputs={inputs} />
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