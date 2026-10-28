// Lado de quem assiste: conecta no telinha do amigo e recebe o vídeo.
import { $, setStatus, estadoDe, textoDe, conectar, PORTA } from './util';
import { criarPeer } from './webrtc';
import { telaCheia, alternarTela } from './palco';

let viewer = null; // { ws, pc, ip }
const ouvintes = [];

/** IP de quem está sendo assistido agora (ou undefined). */
export const ipAssistindo = () => viewer?.ip;

/** Avisa quando começa ou para de assistir alguém. */
export const aoMudarAssistir = (fn) => ouvintes.push(fn);

function atualizar() {
  const b = $('btnVer');
  b.textContent = viewer ? 'Sair' : 'Assistir';
  b.classList.toggle('perigo', !!viewer);
  $('ip').disabled = !!viewer;
  ouvintes.forEach((fn) => fn());
}

export function pararAssistir(texto = 'Desconectado', estado = 'idle') {
  if (!viewer) return;
  const v = viewer;
  viewer = null;
  v.pc.close();
  v.ws.close();
  $('remoto').srcObject = null;
  document.body.classList.remove('assistindo', 'pausado');
  if (telaCheia()) alternarTela();
  atualizar();
  setStatus('statusVer', estado, texto);
}

export async function assistir(ip, nome = ip) {
  if (viewer?.ip === ip) return;
  if (viewer) pararAssistir();
  $('ip').value = ip;
  if (!ip) return setStatus('statusVer', 'erro', 'Digite o IP do amigo');
  try { localStorage.setItem('ultimoIp', ip); } catch {}
  setStatus('statusVer', 'wait', 'Procurando o amigo...');

  try {
    const ws = await conectar(`ws://${ip}:${PORTA}/ws`);
    const pc = criarPeer((obj) => ws.send(JSON.stringify(obj)), (s) => setStatus('statusVer', estadoDe(s), textoDe(s)));
    viewer = { ws, pc, ip };
    atualizar();

    pc.ontrack = (e) => {
      const remoto = $('remoto');
      remoto.srcObject = e.streams[0];
      remoto.play().catch(() => {});
      $('nomeRemoto').textContent = nome;
      document.body.classList.add('assistindo');
    };

    ws.onmessage = async ({ data }) => {
      if (viewer?.ws !== ws) return;
      const msg = JSON.parse(data);
      if (msg.tchau) {
        pararAssistir('O amigo parou de transmitir');
      } else if ('pausado' in msg) {
        document.body.classList.toggle('pausado', msg.pausado);
      } else if (msg.sdp) {
        await pc.setRemoteDescription(msg.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        ws.send(JSON.stringify({ sdp: pc.localDescription }));
      } else if (msg.ice) {
        await pc.addIceCandidate(msg.ice);
      }
    };
    ws.onclose = () => {
      if (viewer?.ws === ws) pararAssistir('O amigo fechou o app', 'erro');
    };

    // se ele ainda não começou, o servidor dele avisa quando começar
    ws.send(JSON.stringify({ oi: true }));
    setStatus('statusVer', 'wait', 'Esperando ele transmitir...');
  } catch {
    setStatus('statusVer', 'erro', 'Não achei o telinha aberto nesse IP');
  }
}

export function iniciarAssistir(nomeDoIp) {
  const doCampo = () => {
    const ip = $('ip').value.trim();
    assistir(ip, nomeDoIp(ip));
  };
  $('btnVer').onclick = () => (viewer ? pararAssistir() : doCampo());
  $('ip').onkeydown = (e) => { if (e.key === 'Enter' && !viewer) doCampo(); };
  try { $('ip').value = localStorage.getItem('ultimoIp') ?? ''; } catch {}
}
