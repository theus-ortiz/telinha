// Área do vídeo de quem você está assistindo: som e tela cheia.
import { WindowFullscreen, WindowUnfullscreen } from '../wailsjs/runtime/runtime';
import { $ } from './util';

let cheia = false;

export const telaCheia = () => cheia;

export function alternarTela() {
  cheia = !cheia;
  document.body.classList.toggle('cheia', cheia);
  cheia ? WindowFullscreen() : WindowUnfullscreen();
}

export function iniciarPalco() {
  const remoto = $('remoto');
  const atualizarSom = () => $('btnSom').classList.toggle('mudo', remoto.muted || remoto.volume === 0);
  $('btnSom').onclick = () => { remoto.muted = !remoto.muted; atualizarSom(); };
  $('volume').oninput = (e) => { remoto.volume = Number(e.target.value); remoto.muted = false; atualizarSom(); };
  $('btnTela').onclick = alternarTela;
  remoto.ondblclick = alternarTela;
}
