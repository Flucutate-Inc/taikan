'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Search, AlertCircle } from 'lucide-react';

interface RegisterGymModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export const RegisterGymModal: React.FC<RegisterGymModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // URLのバリデーション
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    try {
      new URL(url);
      setError('');
      onSubmit(url);
      setUrl('');
      onClose();
    } catch (e) {
      setError('有効なURLを入力してください');
    }
  };

  const handleClose = () => {
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="体育館を登録">
      <div className="flex flex-col space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            個人開放の予定が載っているPDFやWebページのURLを入力してください。
          </p>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 mb-2">
              URL
            </label>
            <div className="flex items-center h-[52px] px-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <Search className="text-teal-500 mr-3" size={20} />
              <input
                type="url"
                placeholder="https://example.com/schedule.pdf"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                className="flex-1 bg-transparent text-gray-800 text-sm font-medium placeholder-gray-400 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
            </div>
            {error && (
              <div className="flex items-center space-x-1 mt-2 text-red-500 text-xs">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-blue-800">
              <strong>対応形式:</strong> PDFファイル、Webページ（HTML）
            </p>
            <p className="text-xs text-blue-700 mt-1">
              登録後、自動的に空き時間情報が抽出されます。
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              url.trim()
                ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            登録する
          </button>
        </div>
      </div>
    </Modal>
  );
};

