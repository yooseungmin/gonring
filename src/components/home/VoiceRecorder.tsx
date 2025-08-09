'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, StopCircle, Loader2 } from 'lucide-react';
import BrandButton from '@/components/brand/BrandButton';

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onTextResult?: (text: string) => void;
  maxDuration?: number; // 최대 녹음 시간 (초)
  className?: string;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onTextResult,
  maxDuration = 60,
  className = ''
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 녹음 시간 업데이트
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  // 녹음 시작
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
        
        // 음성 인식 처리는 실제 구현 시 추가
        if (onTextResult) {
          setIsProcessing(true);
          // 예시로 3초 후 텍스트 반환
          setTimeout(() => {
            setIsProcessing(false);
            onTextResult("예시 음성 인식 결과입니다. 실제로는 서버에서 처리된 텍스트가 반환됩니다.");
          }, 3000);
        }
        
        // 스트림 트랙 종료
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('음성 녹음 오류:', error);
      setErrorMessage('마이크 접근 권한이 필요합니다.');
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 시간 포맷 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-md p-4 ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-notion-black mb-1">
            {isRecording ? '녹음 중...' : '음성 메모'}
          </h3>
          <p className="text-sm text-notion-gray-700">
            {isRecording 
              ? `남은 시간: ${formatTime(maxDuration - recordingTime)}`
              : '마이크 버튼을 눌러 음성 메모를 시작하세요'
            }
          </p>
        </div>

        {errorMessage && (
          <p className="text-red-500 text-sm">{errorMessage}</p>
        )}

        <div className={`p-4 rounded-full ${isRecording ? 'bg-red-50 animate-pulse' : 'bg-notion-gray-50'}`}>
          {isProcessing ? (
            <Loader2 size={32} className="text-notion-gray-700 animate-spin" />
          ) : isRecording ? (
            <StopCircle 
              size={32} 
              className="text-red-500 cursor-pointer" 
              onClick={stopRecording}
            />
          ) : (
            <Mic 
              size={32} 
              className="text-notion-gray-700 cursor-pointer" 
              onClick={startRecording}
            />
          )}
        </div>

        {isRecording && (
          <BrandButton
            onClick={stopRecording}
            variant="outline"
            size="small"
            icon={MicOff}
          >
            녹음 종료
          </BrandButton>
        )}
      </div>
    </div>
  );
}
