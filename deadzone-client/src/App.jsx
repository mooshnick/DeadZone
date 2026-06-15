import { useEffect, useState, useRef } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('מנותק 🔴');
  const ws = useRef(null);

  useEffect(() => {
    // מתחברים לשרת ה-Spring Boot שלנו בנתיב שהגדרנו
    ws.current = new WebSocket('ws://localhost:8080/game');

    ws.current.onopen = () => {
      console.log('Connected to server!');
      setStatus('מחובר לשרת 🟢');
    };

    ws.current.onmessage = (event) => {
      // כאן נקבל בהמשך את המיקומים של השחקנים האחרים
      const data = event.data;
      console.log('Received data from server:', data);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from server');
      setStatus('מנותק 🔴');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // פונקציה לבדיקת התקשורת לשרת
  const handleShoot = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'SHOOT',
        x: 150,
        y: 200,
        playerId: 'player_1'
      };
      // שולחים את הפעולה לשרת כטקסט (JSON)
      ws.current.send(JSON.stringify(payload));
    }
  };

  return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>DeadZone</h1>
        <h2>סטטוס: {status}</h2>
        <button
            onClick={handleShoot}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '20px' }}
        >
          בדיקת ירייה (שלח לשרת)
        </button>
      </div>
  );
}

export default App;