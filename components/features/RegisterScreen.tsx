'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { registerGymSource } from '@/lib/firebase/api';

export const RegisterScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      const result = await registerGymSource(url.trim());
      if (result.gymId && result.slotsAdded !== undefined) {
        alert(`URLを登録し、${result.slotsAdded}件の空き時間情報を追加しました。`);
        setUrl('');
      } else {
        alert('URLを登録しました。PDFの解析を開始しています...');
        setUrl('');
      }
    } catch (err) {
      console.error('Failed to register URL:', err);
      const message = err instanceof Error ? err.message : 'URLの登録に失敗しました';
      alert(`エラー: ${message}\n\nもう一度お試しください。`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-800">体育館を登録</h2>
        <p className="text-xs text-gray-500 mt-1">PDFやWebページのURLから空き情報を登録</p>
      </div>
      <div className="px-4 py-6">
        <p className="text-sm text-gray-600 mb-4">
          個人開放の予定が載っているPDFやWebページのURLを入力してください。
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
          <p className="text-xs text-blue-800">
            <strong>対応形式:</strong> PDFファイル、Webページ（HTML）
          </p>
          <p className="text-xs text-blue-700 mt-1">
            登録後、自動的に空き時間情報が抽出されます。
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!url.trim() || submitting}
          className={`w-full py-4 rounded-2xl font-bold transition-all ${
            url.trim() && !submitting
              ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
      </div>
    </div>
  );
};
