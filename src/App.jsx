import React, { useState } from 'react';
import { Calculator, AlertCircle, CheckCircle2, TrendingUp, Users, AlertTriangle, GraduationCap } from 'lucide-react';

// ==========================================
// 1. 핵심 알고리즘 (utils/calculator.js 통합)
// ==========================================
const calculatePrediction = (quota, realApplicants, revealedCount, myRank, weight = null) => {
  // 유효성 검사
  if (revealedCount > realApplicants) throw new Error("점공 인원이 전체 지원자보다 많을 수 없습니다.");
  if (myRank > revealedCount) throw new Error("나의 등수가 점공 인원보다 클 수 없습니다.");
  if (quota <= 0) throw new Error("모집 인원은 0보다 커야 합니다.");

  const competitionRate = realApplicants / quota;
  
  // 가중치 자동 산출 (사용자 지정값이 없을 경우)
  // 경쟁률이 높을수록(허수 많음) 가중치를 낮게 설정하는 로그 모델 적용
  let appliedWeight = weight;
  if (appliedWeight === null || appliedWeight === '') {
    // 기본값 0.7에서 시작하여 경쟁률 로그값에 비례해 감소, 최소 0.2 유지
    appliedWeight = Math.max(0.2, 0.7 - (0.15 * Math.log(competitionRate)));
  }

  const unrevealedCount = realApplicants - revealedCount; // 미점공 인원
  const rankRatio = myRank / revealedCount; // 점공 내 상위 비율

  // (1) 낙관적 예측 (Optimistic): 미점공자는 거의 다 허수다 (w = 0.2 수준)
  const optimisticRank = myRank + (unrevealedCount * rankRatio * 0.2);

  // (2) 중도적/합리적 예측 (Realistic): 계산된 가중치 적용
  const realisticRank = myRank + (unrevealedCount * rankRatio * appliedWeight);

  // (3) 비관적 예측 (Pessimistic): 단순 비례식 (w = 1.0)
  const pessimisticRank = myRank * (realApplicants / revealedCount);

  // 합격 확률 판정
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
      appliedWeight: appliedWeight.toFixed(2),
      revealedRatio: ((revealedCount / realApplicants) * 100).toFixed(1)
    }
  };
};

// ==========================================
// 2. 입력 컴포넌트 (components/InputForm.jsx 통합)
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

const InputForm = ({ inputs, setInputs, onCalculate }) => {
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
      
      // 상위 컴포넌트의 계산 함수 호출
      onCalculate(); 
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <GraduationCap className="text-indigo-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">데이터 입력</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-y-1">
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
          placeholder="경쟁률 × 모집인원"
          subtext="진학사/유웨이 최종 경쟁률 기준" 
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
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-gray-700 text-sm font-bold mb-1">
            가중치 직접 설정 (선택사항, 0.1 ~ 1.0)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            입력하지 않으면 경쟁률에 따라 자동 계산됩니다.<br/>
            (1.0 = 보수적, 0.2 = 낙관적)
          </p>
          <input
            type="number"
            name="weight"
            value={inputs.weight}
            onChange={handleChange}
            step="0.1"
            min="0.1"
            max="1.0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="자동 계산 권장"
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
    </div>
  );
};

// ==========================================
// 3. 결과 시각화 컴포넌트 (components/ResultView.jsx 통합)
// ==========================================
const ResultView = ({ result, quota }) => {
  if (!result) return (
    <div className="bg-white p-12 rounded-xl shadow-md border border-dashed border-gray-300 text-center h-full flex flex-col justify-center items-center">
      <div className="text-6xl mb-6 opacity-20">📊</div>
      <h3 className="text-xl font-bold text-gray-400">데이터를 입력해주세요</h3>
      <p className="text-gray-400 mt-2 text-sm">
        좌측 패널에 점공 정보를 입력하면<br/>심층 분석 리포트가 생성됩니다.
      </p>
    </div>
  );

  const { ranks, probability, metrics } = result;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-50 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <TrendingUp className="text-indigo-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">분석 리포트</h2>
      </div>
      
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
           모집인원 {quota}명 기준 (충원율 포함 고려)
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
          <ul className="text-sm space-y-3 text-gray-600 bg-gray-50 p-4 rounded-xl">
            <li className="flex justify-between items-center">
              <span>경쟁률</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{metrics.competitionRate} : 1</span>
            </li>
            <li className="flex justify-between items-center">
              <span>점공 참여율</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{metrics.revealedRatio}%</span>
            </li>
            <li className="flex justify-between items-center">
              <span>적용 가중치(w)</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{metrics.appliedWeight}</span>
            </li>
          </ul>
        </div>
        
        <div className="text-xs text-gray-400 mt-2 leading-relaxed text-center">
           * 가중치(w) {metrics.appliedWeight} 적용: 미점공자 중 내 앞등수 비율이 점공자 집단의 약 {Math.round(metrics.appliedWeight * 100)}% 수준이라고 가정함.
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 메인 앱 통합 (App.jsx 통합)
// ==========================================
function App() {
  // State를 상위 컴포넌트(App)로 끌어올림 (Lifting State Up)
  const [inputs, setInputs] = useState({
    quota: '',
    realApplicants: '',
    revealedCount: '',
    myRank: '',
    weight: ''
  });
  
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const q = parseFloat(inputs.quota);
    const a = parseFloat(inputs.realApplicants);
    const v = parseFloat(inputs.revealedCount);
    const r = parseFloat(inputs.myRank);
    const w = inputs.weight ? parseFloat(inputs.weight) : null;

    const calcResult = calculatePrediction(q, a, v, r, w);
    setResult(calcResult);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-12">
      <header className="bg-indigo-900 text-white py-8 shadow-lg">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🎓 Jeom-Gong Master
          </h1>
          <p className="text-indigo-200 text-sm mt-2 font-light">
            SDIJ 및 Delphi 분석 기반 정시 점수공개 예측 솔루션
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
            />
            
            <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-600">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                💡 사용 가이드
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-1 text-xs sm:text-sm">
                <li>진학사 등 점공 사이트의 실시간 데이터를 입력하세요.</li>
                <li><strong>모집인원</strong>은 이월 인원이 포함된 최종 인원입니다.</li>
                <li>새벽 시간대에는 표본 변화가 적어 정확도가 높습니다.</li>
              </ul>
            </div>
          </div>

          {/* 결과 출력 */}
          <div className="w-full md:min-h-[600px]">
             <ResultView 
               result={result} 
               quota={inputs.quota} 
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