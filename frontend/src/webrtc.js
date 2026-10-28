export const FPS = 60;
const BITRATE_AUDIO = 128_000;
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function criarPeer(enviar, aoMudar) {
  const pc = new RTCPeerConnection(ICE);
  pc.onicecandidate = (e) => e.candidate && enviar({ ice: e.candidate });
  pc.onconnectionstatechange = () => aoMudar(pc.connectionState);
  return pc;
}

// H.264 costuma ter codificação por hardware, o que alivia a CPU durante o jogo.
export function preferirH264(pc) {
  const codecs = RTCRtpSender.getCapabilities('video')?.codecs ?? [];
  const h264 = codecs.filter((c) => c.mimeType === 'video/H264');
  if (!h264.length) return;
  const resto = codecs.filter((c) => c.mimeType !== 'video/H264');
  pc.getTransceivers()
    .filter((t) => t.sender.track?.kind === 'video')
    .forEach((t) => t.setCodecPreferences([...h264, ...resto]));
}

// modo: 'jogo' (fluidez) ou 'nitidez' (texto)
export async function ajustarBitrate(pc, { bitrate, modo }) {
  for (const sender of pc.getSenders()) {
    if (!sender.track) continue;
    const p = sender.getParameters();
    if (!p.encodings?.length) p.encodings = [{}];
    if (sender.track.kind === 'video') {
      p.encodings[0].maxBitrate = bitrate;
      p.encodings[0].maxFramerate = FPS;
      p.degradationPreference = modo === 'jogo' ? 'maintain-framerate' : 'maintain-resolution';
    } else {
      p.encodings[0].maxBitrate = BITRATE_AUDIO;
    }
    try { await sender.setParameters(p); } catch (e) { console.warn(e); }
  }
}

export const dicaDeConteudo = (modo) => (modo === 'jogo' ? 'motion' : 'detail');
