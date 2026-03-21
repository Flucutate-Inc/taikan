'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, FileText, Calendar, Dumbbell, X, Pencil } from 'lucide-react';
import { registerGymSource, updateGymName } from '@/lib/firebase/api';

interface ParseResult {
  success: boolean;
  gymId?: string;
  gymName?: string;
  gymNameAutoDetected?: boolean;
  areaName?: string;
  slotsAdded?: number;
  slotsFailed?: number;
  summary?: {
    totalSlots: number;
    dates: string[];
    sports: string[];
    dateCount: number;
    sportCount: number;
  };
  error?: string;
}

type ProgressStep = 'idle' | 'registering' | 'downloading' | 'parsing' | 'saving' | 'done' | 'error';

const STEP_LABELS: Record<ProgressStep, string> = {
  idle: '',
  registering: 'URL登録中...',
  downloading: 'PDFをダウンロード中...',
  parsing: 'スケジュール表を解析中...',
  saving: 'Firebaseにデータを保存中...',
  done: '完了！',
  error: 'エラーが発生しました',
};

export const RegisterScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<ProgressStep>('idle');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [gymNameInput, setGymNameInput] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const isSubmitting = step !== 'idle' && step !== 'done' && step !== 'error';
  const needsGymName = step === 'done' && result?.success && !result.gymNameAutoDetected;

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }
    try {
      new URL(url);
    } catch {
      setError('有効なURLを入力してください');
      return;
    }

    setError('');
    setResult(null);
    setStep('registering');

    try {
      setStep('downloading');
      const res = await registerGymSource(url.trim());

      setStep('done');
      setGymNameInput(res.gymName || '');
      setResult({
        success: true,
        gymId: res.gymId,
        gymName: res.gymName,
        gymNameAutoDetected: res.gymNameAutoDetected,
        areaName: res.areaName,
        slotsAdded: res.slotsAdded,
        slotsFailed: res.slotsFailed,
        summary: res.summary,
      });
    } catch (err) {
      console.error('Failed to register URL:', err);
      setStep('error');
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'URLの登録に失敗しました',
      });
    }
  };

  const handleUpdateGymName = async () => {
    if (!gymNameInput.trim() || !result?.gymId) return;
    setIsUpdatingName(true);
    try {
      await updateGymName(result.gymId, gymNameInput.trim());
      setResult(prev => prev ? { ...prev, gymName: gymNameInput.trim(), gymNameAutoDetected: true } : prev);
    } catch (err) {
      console.error('Failed to update gym name:', err);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setStep('idle');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-800">体育館を登録</h2>
        <p className="text-xs text-gray-500 mt-1">PDFのURLからスケジュールを自動登録</p>
      </div>
      <div className="px-4 py-6">

        {/* URL入力フォーム */}
        {step === 'idle' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              個人開放スケジュールが載っているPDFのURLを入力してください。
              表形式のPDFから日付・時間・競技・空き状況を自動で抽出します。
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 mb-2">URL</label>
              <div className="flex items-center h-[52px] px-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <input
                  type="url"
                  placeholder="https://example.com/schedule.pdf"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  className="flex-1 min-w-0 bg-transparent text-gray-800 text-sm font-medium placeholder-gray-400 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              {error && (
                <div className="flex items-center space-x-1 mt-2 text-red-500 text-xs">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
              <p className="text-xs text-blue-800 font-bold mb-1">対応形式</p>
              <p className="text-xs text-blue-700">
                体育館の個人開放スケジュールPDF（表形式）。
                日付・時間帯・競技名・空き状況（○△×）が含まれる表を自動解析します。
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!url.trim()}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                url.trim()
                  ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              解析を開始する
            </button>
          </>
        )}

        {/* 進行中 */}
        {isSubmitting && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={40} className="text-teal-500 animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-700 mb-2">{STEP_LABELS[step]}</p>
            <p className="text-xs text-gray-400">複雑な表の場合、数十秒かかることがあります</p>
            <div className="mt-6 w-full max-w-xs bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-teal-500 h-1.5 rounded-full transition-all duration-1000"
                style={{
                  width: step === 'registering' ? '10%' : step === 'downloading' ? '30%' : step === 'parsing' ? '60%' : step === 'saving' ? '85%' : '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* 結果表示：成功 */}
        {step === 'done' && result?.success && (
          <div className="space-y-4">
            {/* 施設名が自動検出できなかった場合の入力フォーム */}
            {needsGymName && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Pencil size={16} className="text-amber-600" />
                  <span className="text-sm font-bold text-amber-800">施設名を確認してください</span>
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  PDFから施設名を自動検出できませんでした。正しい施設名を入力してください。
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={gymNameInput}
                    onChange={(e) => setGymNameInput(e.target.value)}
                    placeholder="例: 新郷スポーツセンター"
                    className="flex-1 h-11 px-3 bg-white text-gray-800 text-sm rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateGymName}
                    disabled={!gymNameInput.trim() || isUpdatingName}
                    className={`h-11 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                      gymNameInput.trim() && !isUpdatingName
                        ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.97]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isUpdatingName ? <Loader2 size={16} className="animate-spin" /> : '確定'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="text-sm font-bold text-green-800">登録完了</span>
              </div>

              {result.gymName && (
                <div className="flex items-center space-x-2 mb-2">
                  <Dumbbell size={14} className="text-green-600" />
                  <span className="text-sm text-green-800">{result.gymName}</span>
                  {result.areaName && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {result.areaName}
                    </span>
                  )}
                </div>
              )}

              {result.summary && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText size={14} className="text-green-600" />
                    <span className="text-xs text-green-700">
                      <strong>{result.slotsAdded}</strong> 件のスロットを登録
                      {(result.slotsFailed ?? 0) > 0 && (
                        <span className="text-orange-600">（{result.slotsFailed}件失敗）</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar size={14} className="text-green-600" />
                    <span className="text-xs text-green-700">
                      <strong>{result.summary.dateCount}</strong> 日分
                      {result.summary.dates.length > 0 && (
                        <span className="ml-1 text-gray-500">
                          ({result.summary.dates[0]}〜{result.summary.dates[result.summary.dates.length - 1]})
                        </span>
                      )}
                    </span>
                  </div>

                  {result.summary.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {result.summary.sports.map((sport) => (
                        <span key={sport} className="text-xs bg-white text-green-700 px-2 py-1 rounded-lg border border-green-200">
                          {sport}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-4 rounded-2xl font-bold bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98] transition-all"
            >
              別のURLを登録する
            </button>
          </div>
        )}

        {/* 結果表示：エラー */}
        {step === 'error' && result && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <X size={20} className="text-red-600" />
                <span className="text-sm font-bold text-red-800">解析に失敗しました</span>
              </div>
              <p className="text-xs text-red-700">{result.error}</p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('idle');
                  setResult(null);
                }}
                className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
