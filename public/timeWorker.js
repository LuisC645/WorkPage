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
    }, 500);
  } else if (e.data.action === 'stop') {
    clearInterval(timerId);
  }
};