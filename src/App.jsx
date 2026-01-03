import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle2, TrendingUp, Users, AlertTriangle, GraduationCap, Clock, Save, RotateCcw, Calendar } from 'lucide-react';

// ==========================================
// 1. 핵심 알고리즘 (날짜 연동 로직 추가됨)
// ==========================================
const calculatePrediction = (inputs) => {
  const { quota, realApplicants, revealedCount, myRank, weight } = inputs;
  
  // 유효성 검사
  if (revealedCount > realApplicants) throw new Error("점공 인원이 전체 지원자보다 많을 수 없습니다.");
  if (myRank > revealedCount) throw new Error("나의 등수가 점공 인원보다 클 수 없습니다.");
  if (quota <= 0) throw new Error("모집 인원은 0보다 커야 합니다.");

  const competitionRate = realApplicants / quota;
  
  // --- 날짜 기반 로직 추가 ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, 0, 1); // 올해 1월 1일 00:00
  
  // 1월 1일로부터 며칠 지났는지 계산 (음수면 0으로 처리)
  const timeDiff = now - startDate;
  const daysPassed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  
  // 시간 경과에 따른 가중치 감소율 (Time Decay)
  // 논리: 시간이 지날수록 고득점자는 이미 공개했을 확률이 높음 -> 미점공자의 위협도 감소
  // 하루에 2%씩 가중치 감소, 최대 30%까지만 감소 (안전장치)
  const timeDecayFactor = Math.min(0.3, daysPassed * 0.02); 

  // --- 가중치 산출 ---
  let baseWeight = weight ? parseFloat(weight) : null;
  
  if (baseWeight === null) {
    // 기본값: 경쟁률 로그 모델
    baseWeight = Math.max(0.2, 0.7 - (0.15 * Math.log(competitionRate)));
  }

  // 날짜 보정 적용: (기본 가중치) * (1 - 시간감소율)
  const appliedWeight = baseWeight * (1 - timeDecayFactor);

  // --- 등수 계산 ---
  const unrevealedCount = realApplicants - revealedCount; // 미점공 인원
  const rankRatio = myRank / revealedCount; // 점공 내 상위 비율

  // (1) 낙관적 (Optimistic)
  const optimisticRank = myRank + (unrevealedCount * rankRatio * 0.2);

  // (2) 합리적 (Realistic) - 날짜 보정된 가중치 사용
  const realisticRank = myRank + (unrevealedCount * rankRatio * appliedWeight);

  // (3) 비관적 (Pessimistic)
  const pessimisticRank = myRank * (realApplicants / revealedCount);

  // --- 합격 확률 판정 ---
  const ratio = realisticRank / quota;
  let probability = { label: "분석 불가", color: "text-gray-500", bgColor: "bg-gray-100", score: 0 };

  if (ratio <= 0.8) probability = { label: "최초합 확실 (Very Safe)", color: "text-blue-700", bgColor: "bg-blue-50", score: 95 };
  else if (ratio <= 1.0) probability = { label: "최초합 적정 (Safe)", color: "text-green-700", bgColor: "bg-green-50", score: 80 };
  else if (ratio <= 1.3) probability = { label: "추합 유력 (Probable)", color: "text-yellow-700", bgColor: "bg-yellow-50", score: 60 };
  else if (ratio <= 1.6) probability = { label: "추합 가능 (Risky)", color: "text-orange-700", bgColor: "bg-orange-50", score: 40 };
  else probability = { label: "불합격 유력 (Danger)", color: "text-red-700", bgColor: "bg-red-50", score: 10 };

  return {
    ranks: {
      optimistic: Math.floor(optimisticRank),
      realistic: Math.floor(realisticRank),
      pessimistic: Math.floor(pessimisticRank)
    },
    probability,
    metrics: {
      competitionRate: competitionRate.toFixed(2),
      baseWeight: baseWeight.toFixed(2),
      appliedWeight: appliedWeight.toFixed(2),
      timeDecayPercent: (timeDecayFactor * 100).toFixed(0),
      daysPassed: daysPassed,
      revealedRatio: ((revealedCount / realApplicants) * 100).toFixed(1)
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

const InputForm = ({ inputs, setInputs, onCalculate, onReset }) => {
  const [error, setError] = useState(null);

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
      <div className="flex items-center justify-between mb-6 border-b pb-4">
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
      
      <div className="grid grid-cols-1 gap-y-1">
        {/* 학교/학과 입력 필드 추가 */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <InputField 
            label="목표 대학" 
            name="university" 
            type="text"
            value={inputs.university} 
            onChange={handleChange} 
            placeholder="예: 서울대" 
          />
          <InputField 
            label="모집 단위(학과)" 
            name="department" 
            type="text"
            value={inputs.department} 
            onChange={handleChange} 
            placeholder="예: 경영학과" 
          />
        </div>

        <InputField 
          label="모집 인원 (명)" 
          name="quota" 
          value={inputs.quota} 
          onChange={handleChange} 
          placeholder="예: 35" 
        />
        <InputField 
          label="전체 지원자 수 (명)" 
          name="realApplicants" 
          value={inputs.realApplicants} 
          onChange={handleChange} 
          placeholder="최종 경쟁률 기준"
        />
        <InputField 
          label="점수공개 참여 인원 (명)" 
          name="revealedCount" 
          value={inputs.revealedCount} 
          onChange={handleChange} 
          placeholder="현재 점공 리포트 기준" 
        />
        <InputField 
          label="나의 점공 등수" 
          name="myRank" 
          value={inputs.myRank} 
          onChange={handleChange} 
          placeholder="예: 12" 
        />
        
        <div className="mt-2 pt-4 border-t border-gray-100 bg-gray-50 p-3 rounded-lg">
          <label className="block text-gray-700 text-sm font-bold mb-1 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500"/> 시간 반영 가중치 설정
          </label>
          <p className="text-xs text-gray-500 mb-2">
            1월 1일 이후 시간이 지날수록 미점공자의 위협도를 자동으로 낮춥니다.<br/>
            (직접 입력 시 자동 계산 무시)
          </p>
          <input
            type="number"
            name="weight"
            value={inputs.weight}
            onChange={handleChange}
            step="0.1"
            min="0.1"
            max="1.0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="자동 계산 (권장)"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg flex justify-center items-center gap-2"
      >
        <Calculator size={20} />
        분석 결과 확인하기
      </button>
      
      <div className="mt-3 flex justify-center text-xs text-gray-400 items-center gap-1">
        <Save size={12} /> 데이터는 브라우저에 자동 저장됩니다.
      </div>
    </div>
  );
};

// ==========================================
// 3. 결과 시각화 컴포넌트
// ==========================================
const ResultView = ({ result, inputs }) => {
  if (!result) return (
    <div className="bg-white p-12 rounded-xl shadow-md border border-dashed border-gray-300 text-center h-full flex flex-col justify-center items-center">
      <div className="text-6xl mb-6 opacity-20">📊</div>
      <h3 className="text-xl font-bold text-gray-400">데이터를 입력해주세요</h3>
      <p className="text-gray-400 mt-2 text-sm">
        입력하신 데이터는 자동으로 저장되어<br/>나중에 다시 확인할 수 있습니다.
      </p>
    </div>
  );

  const { ranks, probability, metrics } = result;
  const today = new Date().toLocaleDateString();

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">분석 리포트</h2>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {today} 기준
        </div>
      </div>

      {/* 학교 정보 표시 */}
      {(inputs.university || inputs.department) && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-gray-800">
            {inputs.university} <span className="text-indigo-600">{inputs.department}</span>
          </h3>
        </div>
      )}
      
      {/* 메인 결과 카드 */}
      <div className={`p-6 rounded-2xl text-center mb-6 border-2 ${probability.bgColor} ${probability.color.replace('text', 'border').replace('700', '200')}`}>
        <p className="text-sm text-gray-600 font-semibold mb-2">최종 예상 등수 (Realistic)</p>
        <div className="text-6xl font-extrabold text-indigo-900 mb-2 tracking-tighter">
          {ranks.realistic}
          <span className="text-2xl font-normal text-gray-400 ml-1">등</span>
        </div>
        <div className={`text-lg font-bold inline-flex items-center gap-1 ${probability.color}`}>
          {probability.score >= 80 ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
          {probability.label}
        </div>
        <p className="text-xs text-gray-500 mt-3 bg-white/50 inline-block px-3 py-1 rounded-full">
           모집인원 {inputs.quota}명 기준 (충원율 포함 고려)
        </p>
      </div>

      {/* 상세 지표 테이블 */}
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
              <span>점공 참여율</span>
              <span className="font-mono font-bold">{metrics.revealedRatio}%</span>
            </li>
            <li className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
              <span className="flex items-center gap-1"><Calendar size={12}/> 점공 경과일 (1/1~)</span>
              <span className="font-mono font-bold text-indigo-600">D+{metrics.daysPassed}</span>
            </li>
            <li className="flex justify-between items-center">
              <span>시간 보정 감소율</span>
              <span className="font-mono font-bold text-blue-600">-{metrics.timeDecayPercent}%</span>
            </li>
            <li className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 mt-1">
              <span className="font-bold text-indigo-900">최종 적용 가중치(w)</span>
              <span className="font-mono font-bold text-indigo-900">{metrics.appliedWeight}</span>
            </li>
          </ul>
        </div>
        
        <div className="text-xs text-gray-400 mt-2 leading-relaxed text-center">
           * 1월 1일 이후 시간이 지날수록 실제 지원자 중 미점공자의 비율이 낮아진다고 가정하여 가중치를 소폭 하향 조정합니다.
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
    university: '',
    department: '',
    quota: '',
    realApplicants: '',
    revealedCount: '',
    myRank: '',
    weight: ''
  };

  // State 초기화 시 localStorage에서 데이터 불러오기 (Lazy Initialization)
  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('jeomgong_data');
    return saved ? JSON.parse(saved) : initialInputs;
  });
  
  const [result, setResult] = useState(null);

  // inputs가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('jeomgong_data', JSON.stringify(inputs));
  }, [inputs]);

  const handleCalculate = () => {
    // 텍스트를 숫자로 변환하여 전달
    const calcInputs = {
      ...inputs,
      quota: parseFloat(inputs.quota),
      realApplicants: parseFloat(inputs.realApplicants),
      revealedCount: parseFloat(inputs.revealedCount),
      myRank: parseFloat(inputs.myRank),
    };
    const calcResult = calculatePrediction(calcInputs);
    setResult(calcResult);
  };

  const handleReset = () => {
    if (window.confirm('입력된 데이터를 모두 초기화하시겠습니까?')) {
      setInputs(initialInputs);
      setResult(null);
      localStorage.removeItem('jeomg_data');
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
            AI 기반 점수공개 예측 서비스 (자동저장/날짜연동)
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 입력 폼 */}
          <div className="w-full">
            <InputForm 
              inputs={inputs} 
              setInputs={setInputs} 
              onCalculate={handleCalculate} 
              onReset={handleReset}
            />
            
            <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-600">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                💡 사용 가이드
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-1 text-xs sm:text-sm">
                <li>진학사 등 점공 사이트의 실시간 데이터를 입력하세요.</li>
                <li><strong>모집인원</strong>은 이월 인원이 포함된 최종 인원입니다.</li>
                <li>1월 1일 이후 경과일에 따라 예측 가중치가 자동 보정됩니다.</li>
                <li>입력한 데이터는 브라우저 닫아도 유지됩니다.</li>
              </ul>
            </div>
          </div>

          {/* 결과 출력 */}
          <div className="w-full md:min-h-[600px]">
             <ResultView 
               result={result} 
               inputs={inputs}
             />
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