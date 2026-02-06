import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle, XCircle, Circle, RotateCcw, Trophy, ChevronRight, ChevronLeft, MapPin, Globe, RefreshCw, List, Layers, ArrowLeft, History, Brain } from 'lucide-react';
import { subjects, type SubjectId } from './data';

// --- 教科タイプ ---
type Subject = SubjectId;

// --- データ参照 ---
const historyData = subjects.history.questions;
const ethicsData = subjects.ethics.questions;
const historyCategoryOrder = subjects.history.categoryOrder;
const ethicsCategoryOrder = subjects.ethics.categoryOrder;

// NOTE: historyData, ethicsData, historyCategoryOrder, ethicsCategoryOrder は
// src/data/index.ts からインポートされています。
// 新しい教科を追加する場合は src/data/ にJSONファイルを追加してください。

// --- ユーティリティ関数 ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getUniqueCategories = (data: typeof historyData, subject: Subject) => {
  const order = subject === 'history' ? historyCategoryOrder : ethicsCategoryOrder;
  const uniqueCats = Array.from(new Set(data.map(item => item.category)));
  return uniqueCats.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
};

const getStorageKey = (subject: Subject, type: 'mastered' | 'failed') => `kioku-${subject}-${type}-ids`;
const SUBJECT_STORAGE_KEY = 'kioku-selected-subject';

const loadIds = (subject: Subject, type: 'mastered' | 'failed'): number[] => {
  try {
    const saved = localStorage.getItem(getStorageKey(subject, type));
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load saved progress', e);
  }
  return [];
};

const loadSelectedSubject = (): Subject | null => {
  try {
    const saved = localStorage.getItem(SUBJECT_STORAGE_KEY);
    if (saved === 'history' || saved === 'ethics') return saved;
  } catch (e) {
    console.error('Failed to load selected subject', e);
  }
  return null;
};

type StatusFilter = 'all' | 'unseen' | 'failed' | 'learned';

// --- 教科選択画面 ---
function SubjectSelector({ onSelect }: { onSelect: (subject: Subject) => void }) {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Kioku</h1>
          <p className="text-zinc-400 text-sm">学習する教科を選択してください</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('history')}
            className="w-full p-5 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/80 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                <History className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">歴史</h2>
                <p className="text-sm text-zinc-400">{historyData.length} 問</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('ethics')}
            className="w-full p-5 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-purple-500/50 hover:bg-zinc-800/80 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white">倫理</h2>
                <p className="text-sm text-zinc-400">{ethicsData.length} 問</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KiokuApp() {
  const initialSubject = loadSelectedSubject();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(initialSubject);
  const [questions, setQuestions] = useState(() =>
    initialSubject === 'history' ? historyData : initialSubject === 'ethics' ? ethicsData : historyData
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<number[]>(() =>
    initialSubject ? loadIds(initialSubject, 'mastered') : []
  );
  const [failedIds, setFailedIds] = useState<number[]>(() =>
    initialSubject ? loadIds(initialSubject, 'failed') : []
  );
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [showList, setShowList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(!!initialSubject);

  const rawData = selectedSubject === 'history' ? historyData : ethicsData;

  // 教科変更時にデータを更新
  useEffect(() => {
    if (selectedSubject && !isInitialized) {
      // 新しく教科が選ばれた場合
      const newData = selectedSubject === 'history' ? historyData : ethicsData;
      setQuestions(newData);
      setMasteredIds(loadIds(selectedSubject, 'mastered'));
      setFailedIds(loadIds(selectedSubject, 'failed'));
      setCurrentIndex(0);
      setFilterCategory('All');
      setStatusFilter('all');
      setIsFlipped(false);
      localStorage.setItem(SUBJECT_STORAGE_KEY, selectedSubject);
      setIsInitialized(true);
    }
  }, [selectedSubject, isInitialized]);

  // 教科切り替え時のリセット
  const handleChangeSubjectInternal = () => {
    setSelectedSubject(null);
    setIsInitialized(false);
    localStorage.removeItem(SUBJECT_STORAGE_KEY);
  };

  useEffect(() => {
    if (selectedSubject && isInitialized) {
      localStorage.setItem(getStorageKey(selectedSubject, 'mastered'), JSON.stringify(masteredIds));
    }
  }, [masteredIds, selectedSubject, isInitialized]);

  useEffect(() => {
    if (selectedSubject && isInitialized) {
      localStorage.setItem(getStorageKey(selectedSubject, 'failed'), JSON.stringify(failedIds));
    }
  }, [failedIds, selectedSubject, isInitialized]);

  const filteredQuestions = useMemo(() => {
    let filtered = questions;
    if (filterCategory !== 'All') {
      filtered = filtered.filter(q => q.category === filterCategory);
    }
    if (statusFilter === 'unseen') {
      // 未学習: まだ見ていない問題
      filtered = filtered.filter(q => !masteredIds.includes(q.id) && !failedIds.includes(q.id));
    } else if (statusFilter === 'failed') {
      // わからなかった問題
      filtered = filtered.filter(q => failedIds.includes(q.id));
    } else if (statusFilter === 'learned') {
      // 習得済み
      filtered = filtered.filter(q => masteredIds.includes(q.id));
    }
    return filtered;
  }, [questions, filterCategory, statusFilter, masteredIds, failedIds]);

  // currentIndexが範囲外になったら調整
  useEffect(() => {
    if (filteredQuestions.length > 0 && currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions.length, currentIndex]);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  const handleChangeSubject = handleChangeSubjectInternal;

  // 教科選択画面を表示
  if (!selectedSubject) {
    return <SubjectSelector onSelect={handleSelectSubject} />;
  }

  const currentQuestion = filteredQuestions[currentIndex];
  const progressPercentage = Math.round((masteredIds.length / rawData.length) * 100);
  const unseenCount = rawData.length - masteredIds.length - failedIds.length;
  const failedCount = failedIds.length;
  const learnedCount = masteredIds.length;

  const handleNext = () => {
    if (filteredQuestions.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
  };

  const handlePrev = () => {
    if (filteredQuestions.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
  };

  // 一覧用: ステータスを循環切り替え (未学習 → わからない → 習得済み → 未学習)
  const cycleStatus = (id: number) => {
    const isMastered = masteredIds.includes(id);
    const isFailed = failedIds.includes(id);

    if (isMastered) {
      // 習得済み → 未学習
      setMasteredIds(prev => prev.filter(mid => mid !== id));
    } else if (isFailed) {
      // わからない → 習得済み
      setFailedIds(prev => prev.filter(fid => fid !== id));
      setMasteredIds(prev => [...prev, id]);
    } else {
      // 未学習 → わからない
      setFailedIds(prev => [...prev, id]);
    }
  };

  const markAsLearned = () => {
    if (!currentQuestion) return;

    const doMark = () => {
      if (!masteredIds.includes(currentQuestion.id)) {
        setMasteredIds(prev => [...prev, currentQuestion.id]);
      }
      setFailedIds(prev => prev.filter(fid => fid !== currentQuestion.id));
      setIsFlipped(false);
      setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    };

    if (!isFlipped) {
      setIsFlipped(true);
      setTimeout(doMark, 600);
    } else {
      doMark();
    }
  };

  const markAsFailed = () => {
    if (!currentQuestion) return;

    const doMark = () => {
      if (!failedIds.includes(currentQuestion.id)) {
        setFailedIds(prev => [...prev, currentQuestion.id]);
      }
      setMasteredIds(prev => prev.filter(mid => mid !== currentQuestion.id));
      setIsFlipped(false);
      setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    };

    if (!isFlipped) {
      setIsFlipped(true);
      setTimeout(doMark, 600);
    } else {
      doMark();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;
    // 画面端50px以内からのスワイプはブラウザジェスチャー用に無視
    if (touchX < 50 || touchX > screenWidth - 50) {
      setTouchStart(null);
      return;
    }
    setTouchStart(touchX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.touches[0].clientX - touchStart;
    // 水平方向に動き始めたらブラウザのデフォルト動作を防ぐ
    if (Math.abs(diff) > 10) {
      e.preventDefault();
    }
    setSwipeOffset(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (touchStart !== null && Math.abs(swipeOffset) > 60) {
      const direction = swipeOffset > 0 ? 'right' : 'left';
      // カードを画面外にアニメーション
      setSwipeOffset(direction === 'right' ? 300 : -300);
      setIsExiting(true);
      setTouchStart(null);

      setTimeout(() => {
        if (currentQuestion) {
          if (direction === 'right') {
            if (!masteredIds.includes(currentQuestion.id)) {
              setMasteredIds(prev => [...prev, currentQuestion.id]);
            }
            setFailedIds(prev => prev.filter(fid => fid !== currentQuestion.id));
          } else {
            if (!failedIds.includes(currentQuestion.id)) {
              setFailedIds(prev => [...prev, currentQuestion.id]);
            }
            setMasteredIds(prev => prev.filter(mid => mid !== currentQuestion.id));
          }
        }
        setIsFlipped(false);
        setCurrentIndex(prev => (prev + 1) % filteredQuestions.length);
        setSwipeOffset(0);
        setIsExiting(false);
      }, 250);
    } else {
      setSwipeOffset(0);
      setTouchStart(null);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowList(false);
  };

  const shuffleQuestions = () => {
    setQuestions(shuffleArray([...questions]));
    setCurrentIndex(0);
    setIsFlipped(false);
  };



  return (
    <div className="min-h-screen bg-zinc-900">
      {/* ヘッダー */}
      <header className="bg-zinc-800/80 backdrop-blur border-b border-zinc-700/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={handleChangeSubject}
                className="w-7 h-7 bg-zinc-700 rounded-lg flex items-center justify-center hover:bg-zinc-600 transition-colors"
                title="教科を変更"
              >
                <ArrowLeft className="w-4 h-4 text-zinc-300" />
              </button>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedSubject === 'history' ? 'bg-amber-500' : 'bg-purple-500'}`}>
                {selectedSubject === 'history' ? (
                  <History className="w-4 h-4 text-white" />
                ) : (
                  <Brain className="w-4 h-4 text-white" />
                )}
              </div>
              <h1 className="font-semibold text-sm text-white">
                {selectedSubject === 'history' ? '歴史' : '倫理'}
              </h1>
            </div>

            {/* 進捗 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 hidden sm:inline">{masteredIds.length}/{rawData.length}</span>
              <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${selectedSubject === 'history' ? 'bg-amber-500' : 'bg-purple-500'}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-zinc-300">{progressPercentage}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* コントロールバー */}
      <div className="bg-zinc-800/50 border-b border-zinc-700/30">
        <div className="max-w-5xl mx-auto px-3 py-1.5">
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* モード切替 */}
            <div className="flex bg-zinc-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setShowList(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${!showList ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Layers size={12} />
                <span className="hidden sm:inline">カード</span>
              </button>
              <button
                onClick={() => setShowList(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${showList ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <List size={12} />
                <span className="hidden sm:inline">一覧</span>
              </button>
            </div>

            {/* 状態フィルター */}
            <div className="flex bg-zinc-700/50 rounded-lg p-0.5">
              <button
                onClick={() => { setStatusFilter('all'); setCurrentIndex(0); setIsFlipped(false); }}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                全て
              </button>
              <button
                onClick={() => { setStatusFilter('unseen'); setCurrentIndex(0); setIsFlipped(false); }}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === 'unseen' ? 'bg-zinc-500 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                未学習 ({unseenCount})
              </button>
              <button
                onClick={() => { setStatusFilter('failed'); setCurrentIndex(0); setIsFlipped(false); }}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === 'failed' ? 'bg-rose-500 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                復習 ({failedCount})
              </button>
              <button
                onClick={() => { setStatusFilter('learned'); setCurrentIndex(0); setIsFlipped(false); }}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === 'learned' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                習得 ({learnedCount})
              </button>
            </div>

            <button
              onClick={shuffleQuestions}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-700/50 text-zinc-400 text-xs font-medium hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">シャッフル</span>
            </button>

            <button
              onClick={() => { if (confirm('学習記録をリセットしますか？')) { setMasteredIds([]); setFailedIds([]); } }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-700/50 text-zinc-400 text-xs font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <RefreshCw size={12} />
            </button>

            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`ml-auto px-2.5 py-1 rounded-lg bg-zinc-700/50 text-zinc-300 text-xs font-medium border-none outline-none focus:ring-1 cursor-pointer ${selectedSubject === 'history' ? 'focus:ring-amber-500' : 'focus:ring-purple-500'}`}
            >
              <option value="All" className="bg-zinc-800">全範囲 ({rawData.length})</option>
              {getUniqueCategories(rawData, selectedSubject).map(cat => (
                <option key={cat} value={cat} className="bg-zinc-800">{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* メインエリア */}
      <main className="max-w-5xl mx-auto px-3 py-4">
        {(filteredQuestions.length === 0 || !currentQuestion) ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center p-6 bg-zinc-800 rounded-xl border border-zinc-700 max-w-sm w-full">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${selectedSubject === 'history' ? 'bg-amber-500' : 'bg-purple-500'
                }`}>
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {statusFilter === 'unseen' ? 'Complete!' :
                  statusFilter === 'failed' ? 'Great!' :
                    statusFilter === 'learned' ? 'No Questions' :
                      'No Questions'}
              </h2>
              <p className="text-sm text-zinc-400 mb-5">
                {statusFilter === 'unseen' ? '全ての問題を学習しました！' :
                  statusFilter === 'failed' ? '復習問題を全てクリアしました！' :
                    statusFilter === 'learned' ? '習得済みの問題はまだありません。' :
                      'このカテゴリの問題はありません。'}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setFilterCategory('All'); setStatusFilter('all'); }}
                  className="px-5 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
                >
                  全問題に戻る
                </button>
                <button
                  onClick={handleChangeSubject}
                  className="px-5 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
                >
                  教科変更
                </button>
              </div>
            </div>
          </div>
        ) : showList ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredQuestions.map((q) => {
              const isMastered = masteredIds.includes(q.id);
              const isFailed = failedIds.includes(q.id);
              return (
                <div
                  key={q.id}
                  className={`bg-zinc-800 rounded-lg p-3 border transition-colors ${isMastered
                      ? 'border-emerald-500/40'
                      : isFailed
                        ? 'border-rose-500/40'
                        : 'border-zinc-700/50 hover:border-zinc-600'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded">
                      {q.category}
                    </span>
                    <button onClick={() => cycleStatus(q.id)} className="p-0.5" title="クリックでステータス変更">
                      {isMastered ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : isFailed ? (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 mb-2.5 leading-relaxed">{q.question}</p>
                  <div className={`px-2.5 py-1.5 rounded border ${isMastered
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : isFailed
                        ? 'bg-rose-500/10 border-rose-500/20'
                        : 'bg-zinc-700/30 border-zinc-600/30'
                    }`}>
                    <span className={`font-medium text-xs ${isMastered ? 'text-emerald-300' : isFailed ? 'text-rose-300' : 'text-zinc-300'
                      }`}>{q.answer}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center pt-4 md:pt-8">
            <span className="text-zinc-500 text-[10px] font-medium tracking-wider mb-3">
              {currentIndex + 1} / {filteredQuestions.length}
            </span>

            {/* スワイプヒント */}
            <div className="flex justify-between w-full max-w-lg px-2 mb-2">
              <span className={`text-[10px] transition-opacity ${swipeOffset < -20 ? 'text-rose-400 opacity-100' : 'text-zinc-600 opacity-50'}`}>← わからない</span>
              <span className={`text-[10px] transition-opacity ${swipeOffset > 20 ? 'text-emerald-400 opacity-100' : 'text-zinc-600 opacity-50'}`}>わかった →</span>
            </div>

            <div
              key={currentQuestion.id}
              className="w-full max-w-lg cursor-pointer select-none"
              onClick={() => !isExiting && setIsFlipped(!isFlipped)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`,
                opacity: isExiting ? 0 : 1,
                transition: touchStart ? 'none' : 'transform 0.25s ease-out, opacity 0.2s ease-out',
                touchAction: 'pan-y'
              }}
            >
              <div className={`bg-zinc-800 rounded-xl border overflow-hidden transition-colors ${swipeOffset > 30 ? 'border-emerald-500/50' : swipeOffset < -30 ? 'border-amber-500/50' : 'border-zinc-700/50'
                }`}>
                <div className="px-4 py-2.5 border-b border-zinc-700/50 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                    {currentQuestion.category.includes('地図') && <MapPin size={10} className="text-rose-400" />}
                    {currentQuestion.category.includes('世界') && <Globe size={10} className="text-sky-400" />}
                    {currentQuestion.category}
                  </span>
                  {masteredIds.includes(currentQuestion.id) ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <CheckCircle size={10} /> 習得済み
                    </span>
                  ) : failedIds.includes(currentQuestion.id) ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400">
                      <XCircle size={10} /> 復習
                    </span>
                  ) : null}
                </div>

                <div className="p-5 min-h-[180px] flex flex-col justify-center">
                  <p className="text-sm md:text-base text-zinc-200 text-center leading-relaxed">
                    {currentQuestion.question.split('（　？　）').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className={`inline-block mx-0.5 px-2 py-0.5 rounded font-semibold transition-all ${isFlipped
                            ? 'text-indigo-300 bg-indigo-500/20'
                            : 'text-transparent bg-zinc-700 min-w-[3em]'
                            }`}>
                            {isFlipped ? currentQuestion.answer : '???'}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </p>

                  {!currentQuestion.question.includes('（　？　）') && (
                    <div className={`mt-4 w-full p-3 rounded-lg text-center transition-all ${isFlipped ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-zinc-700/30'
                      }`}>
                      <span className="text-[10px] text-zinc-500 block mb-1">
                        {isFlipped ? 'ANSWER' : 'TAP TO REVEAL'}
                      </span>
                      <span className={`text-base md:text-lg font-semibold ${isFlipped ? 'text-indigo-300' : 'text-transparent'}`}>
                        {currentQuestion.answer}
                      </span>
                    </div>
                  )}

                  {!isFlipped && (
                    <p className="text-center text-zinc-600 text-[10px] mt-3">タップして答えを表示</p>
                  )}
                </div>
              </div>
            </div>

            {/* アクションボタン - 常に表示 */}
            <div className="flex gap-3 mt-4 w-full max-w-lg">
              <button
                onClick={markAsFailed}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                <ChevronLeft size={14} />
                わからない
              </button>
              <button
                onClick={markAsLearned}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors"
              >
                わかった
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, filteredQuestions.length) }, (_, i) => {
                  const startIdx = Math.max(0, Math.min(currentIndex - 2, filteredQuestions.length - 5));
                  const idx = startIdx + i;
                  return (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all ${idx === currentIndex
                        ? (selectedSubject === 'history' ? 'bg-amber-400 w-4' : 'bg-purple-400 w-4')
                        : 'bg-zinc-700 w-1'
                        }`}
                    />
                  );
                })}
              </div>

              <button
                onClick={handleNext}
                className={`p-2 rounded-lg text-white transition-colors ${selectedSubject === 'history' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-500 hover:bg-purple-600'
                  }`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
