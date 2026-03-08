import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const TIEMPO_TOTAL = 3600; 
  const TIEMPO_TAREA = 212; 

  const [segundos, setSegundos] = useState(TIEMPO_TOTAL); 
  const [cronometro, setCronometro] = useState(0); 
  const [corriendo, setCorriendo] = useState(false);
  const [tareasAuto, setTareasAuto] = useState(0);
  const [contadorManual, setContadorManual] = useState(0);
  
  const workerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const endTimeRef = useRef(null);
  const startTimeRef = useRef(null);
  const ultimaTareaRef = useRef(0);

  useEffect(() => {
    const workerCode = `
      let timerId = null;
      self.onmessage = function(e) {
        if (e.data.action === 'start') {
          const { endTime, startTime } = e.data;
          timerId = setInterval(() => {
            const ahora = Date.now();
            const restante = Math.max(0, Math.round((endTime - ahora) / 1000));
            const transcurrido = Math.round((ahora - startTime) / 1000);
            self.postMessage({ restante, transcurrido });
            if (restante <= 0) clearInterval(timerId);
          }, 200);
        } else if (e.data.action === 'stop') {
          clearInterval(timerId);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    
    workerRef.current.onmessage = (e) => {
      const { restante, transcurrido } = e.data;
      if (restante !== undefined) setSegundos(restante);
      if (transcurrido !== undefined) {
        setCronometro(transcurrido);
        const tareasActuales = Math.floor(transcurrido / TIEMPO_TAREA);
        if (tareasActuales > ultimaTareaRef.current) {
          sonarPitido();
          setTareasAuto(tareasActuales);
          ultimaTareaRef.current = tareasActuales;
        }
      }
      if (restante <= 0) { pausarTodo(); sonarPitido(); }
    };
    return () => workerRef.current.terminate();
  }, []);

  const sonarPitido = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      const osc = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime); 
      osc.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      osc.start();
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 1);
      osc.stop(audioCtxRef.current.currentTime + 1);
    } catch (e) { console.log(e); }
  };

  const iniciarTodo = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ahora = Date.now();
    endTimeRef.current = ahora + (segundos * 1000);
    startTimeRef.current = ahora - (cronometro * 1000);
    workerRef.current.postMessage({ action: 'start', endTime: endTimeRef.current, startTime: startTimeRef.current });
    setCorriendo(true);
  };

  const pausarTodo = () => {
    if (workerRef.current) workerRef.current.postMessage({ action: 'stop' });
    setCorriendo(false);
  };

  const reiniciarTodo = () => {
    pausarTodo();
    setSegundos(TIEMPO_TOTAL);
    setCronometro(0);
    setTareasAuto(0);
    setContadorManual(0);
    ultimaTareaRef.current = 0;
  };

  const formatear = (s) => {
    const min = Math.floor(s / 60);
    const seg = s % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1 className="titulo">Trabajo</h1>
        
        <div className="stats-col">
          <p className="tiempo-grande">{formatear(segundos)}</p>
          <p className="tiempo-guia-info">Transcurrido: {formatear(cronometro)}</p>
          <p className="cycle-info">Ciclo: {tareasAuto + 1} / 17</p>
          
          <div className="dots-container">
            {[...Array(17)].map((_, i) => (
              <div key={i} className={`dot ${i < tareasAuto ? 'dot-active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="controles-col">
          {!corriendo ? (
            <button className="btn" onClick={iniciarTodo}>INICIAR</button>
          ) : (
            <button className="btn" style={{backgroundColor: '#ef4444'}} onClick={pausarTodo}>PAUSAR</button>
          )}
          <button className="btn" style={{backgroundColor: '#334155'}} onClick={reiniciarTodo}>REINICIAR</button>
        </div>

        <div className="manual-col">
          <p style={{color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase'}}>Manual</p>
          <div className="manual-controls">
            <button className="btn-small" onClick={() => setContadorManual(m => Math.max(0, m - 1))}>-</button>
            <span className="manual-num">{contadorManual}</span>
            <button className="btn-small" onClick={() => setContadorManual(m => m + 1)}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}