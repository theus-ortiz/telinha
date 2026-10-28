export const $ = (id) => document.getElementById(id);

export function setStatus(id, estado, texto) {
  const el = $(id);
  el.dataset.estado = estado;
  el.querySelector('span').textContent = texto;
}

// connectionState do WebRTC -> cor da bolinha / texto do status
export const estadoDe = (s) =>
  ({ connected: 'ok', connecting: 'wait', new: 'wait', disconnected: 'erro', failed: 'erro' })[s] ?? 'idle';
export const textoDe = (s) =>
  ({ connected: 'Conectado', connecting: 'Conectando...', new: 'Conectando...',
     disconnected: 'Conexão instável', failed: 'Falhou', closed: 'Encerrado' })[s] ?? s;

export const msgErro = (e) => e?.message ?? String(e);

export function conectar(url) {
  return new Promise((ok, erro) => {
    const ws = new WebSocket(url);
    ws.onopen = () => ok(ws);
    ws.onerror = () => erro(new Error('sem resposta'));
  });
}

export const PORTA = 8765;
