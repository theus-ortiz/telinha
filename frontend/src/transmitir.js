// Lado de quem mostra a tela: uma conexão WebRTC por amigo assistindo,
// indexada pelo id que o servidor Go (internal/sinal) dá a cada um.
import { Hospedar } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { $, setStatus, msgErro, conectar, PORTA } from './util';
import { FPS, criarPeer, preferirH264, ajustarBitrate, dicaDeConteudo } from './webrtc';

let host = null; // { stream, ws, pcs: Map<id, RTCPeerConnection>, pausado }

const config = () => ({ modo: $('modo').value, bitrate: Number($('bitrate').value) });

function atualizar() {
  const b = $('btnHost');
  b.textContent = host ? 'Parar' : 'Transmitir tela';
  b.classList.toggle('perigo', !!host);
  b.classList.toggle('primario', !host);
  $('btnPausar').hidden = !host;
  $('btnPausar').textContent = host?.pausado ? 'Continuar' : 'Pausar';
  $('previewBox').classList.toggle('pausado', !!host?.pausado);
  if (!host) return;

  const assistindo = [...host.pcs.values()].filter((pc) => pc.connectionState === 'connected').length;
  if (host.pausado) setStatus('statusHost', 'wait', 'Pausado · Ctrl+Alt+P volta');
  else if (assistindo) setStatus('statusHost', 'ok', `Ao vivo · ${assistindo} assistindo`);
  else setStatus('statusHost', 'wait', 'Ao vivo · esperando amigos');
}

function parar() {
  if (!host) return;
  try { host.ws.send(JSON.stringify({ tchau: true })); } catch {}
  host.stream.getTracks().forEach((t) => t.stop());
  host.pcs.forEach((pc) => pc.close());
  host.ws.close();
  host = null;
  $('local').srcObject = null;
  $('previewBox').classList.remove('ativo');
  atualizar();
  setStatus('statusHost', 'idle', 'Parado');
}

function alternarPausa() {
  if (!host) return;
  host.pausado = !host.pausado;
  // trilha desligada manda tela preta e silêncio, sem derrubar a conexão
  host.stream.getTracks().forEach((t) => (t.enabled = !host.pausado));
  host.ws.send(JSON.stringify({ pausado: host.pausado }));
  atualizar();
}

async function receberAmigo(id) {
  const enviar = (obj) => host?.ws.send(JSON.stringify({ ...obj, para: id }));
  host.pcs.get(id)?.close();
  const pc = criarPeer(enviar, (s) => {
    if (s === 'failed' || s === 'closed') host?.pcs.delete(id);
    atualizar();
  });
  host.pcs.set(id, pc);
  host.stream.getTracks().forEach((t) => pc.addTrack(t, host.stream));
  preferirH264(pc);
  await pc.setLocalDescription(await pc.createOffer());
  enviar({ sdp: pc.localDescription });
  if (host.pausado) enviar({ pausado: true });
  await ajustarBitrate(pc, config());
}

async function iniciar() {
  let stream;
  try {
    await Hospedar();
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: FPS, max: FPS } },
      audio: true,
    });
    const trilha = stream.getVideoTracks()[0];
    trilha.contentHint = dicaDeConteudo(config().modo);
    trilha.onended = parar; // "Parar compartilhamento" do Windows

    const ws = await conectar(`ws://localhost:${PORTA}/ws?host=1`);
    host = { stream, ws, pcs: new Map(), pausado: false };
    $('local').srcObject = stream;
    $('previewBox').classList.add('ativo');
    atualizar();

    ws.onmessage = async ({ data }) => {
      if (!host) return;
      const msg = JSON.parse(data);
      const pc = host.pcs.get(msg.de);
      try {
        if (msg.oi) await receberAmigo(msg.de);
        else if (msg.saiu) { pc?.close(); host.pcs.delete(msg.de); atualizar(); }
        else if (msg.sdp) await pc?.setRemoteDescription(msg.sdp);
        else if (msg.ice) await pc?.addIceCandidate(msg.ice);
      } catch (e) {
        console.warn('amigo', msg.de, e);
      }
    };
  } catch (e) {
    if (!host) stream?.getTracks().forEach((t) => t.stop());
    if (e?.name === 'NotAllowedError') setStatus('statusHost', 'idle', 'Cancelado');
    else setStatus('statusHost', 'erro', 'Erro: ' + msgErro(e));
  }
}

function aplicarAjustesAoVivo() {
  if (!host) return;
  const c = config();
  host.stream.getVideoTracks()[0].contentHint = dicaDeConteudo(c.modo);
  host.pcs.forEach((pc) => ajustarBitrate(pc, c));
}

export function iniciarTransmitir() {
  $('btnHost').onclick = () => (host ? parar() : iniciar());
  $('btnPausar').onclick = alternarPausa;
  EventsOn('atalho-pausar', alternarPausa);
  $('modo').onchange = aplicarAjustesAoVivo;
  $('bitrate').onchange = aplicarAjustesAoVivo;
}
