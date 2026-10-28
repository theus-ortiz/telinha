// Rodapé com o IP da VPN deste PC.
import { MeusIPs } from '../wailsjs/go/main/App';
import { ClipboardSetText } from '../wailsjs/runtime/runtime';
import { $ } from './util';

async function carregar() {
  try {
    const ips = await MeusIPs();
    $('meuIp').textContent = ips?.length ? ips.join(' · ') : 'VPN desligada (Tailscale/Radmin)';
  } catch {
    $('meuIp').textContent = 'não consegui ler';
  }
}

export function iniciarMeuIp() {
  carregar();
  setInterval(carregar, 10_000);
  $('copiar').onclick = async () => {
    const ip = $('meuIp').textContent.split(' · ')[0];
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return;
    await ClipboardSetText(ip);
    $('meuIp').textContent = 'Copiado!';
    setTimeout(carregar, 1200);
  };
}
