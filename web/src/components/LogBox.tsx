"use client";

import { useEffect, useRef } from 'react';

interface LogBoxProps {
  logs: string[];
  title?: string;
}

export default function LogBox({ logs, title = "진행 로그" }: LogBoxProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 새로운 로그가 추가될 때마다 자동으로 스크롤
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-box">
      <h4>{title}</h4>
      <div className="logs-container" ref={logContainerRef}>
        {logs.length > 0 ? (
          <ul>
            {logs.map((log, index) => (
              <li key={index} className="log-entry">
                {log}
              </li>
            ))}
          </ul>
        ) : (
          <p>로그가 여기에 표시됩니다...</p>
        )}
      </div>
    </div>
  );
}
