// Aba "Como usar".
import { $ } from './util';

export const ajudaAberta = () => document.body.classList.contains('ajuda-aberta');

export function mostrarAjuda(abrir) {
  document.body.classList.toggle('ajuda-aberta', abrir);
}

export function iniciarAjuda() {
  $('btnAjuda').onclick = () => mostrarAjuda(!ajudaAberta());
  $('abrirAjuda').onclick = () => mostrarAjuda(true);
  $('fecharAjuda').onclick = () => mostrarAjuda(false);
}

/** Abre o passo a passo sozinho só na primeira vez que o app é aberto. */
export function ajudaNaPrimeiraVez(temAmigos) {
  let jaViu = false;
  try { jaViu = !!localStorage.getItem('viuAjuda'); localStorage.setItem('viuAjuda', '1'); } catch {}
  if (!jaViu && !temAmigos) mostrarAjuda(true);
}
