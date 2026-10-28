import './style.css';
import { iniciarTransmitir } from './transmitir';
import { iniciarAssistir } from './assistir';
import { iniciarPalco, telaCheia, alternarTela } from './palco';
import { iniciarAmigos, nomeDoIp } from './amigos';
import { iniciarAjuda, ajudaNaPrimeiraVez, ajudaAberta, mostrarAjuda } from './ajuda';
import { iniciarMeuIp } from './meuip';

iniciarTransmitir();
iniciarAssistir(nomeDoIp);
iniciarPalco();
iniciarAjuda();
iniciarMeuIp();
iniciarAmigos().then((amigos) => ajudaNaPrimeiraVez(amigos.length > 0));

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (ajudaAberta()) mostrarAjuda(false);
  else if (telaCheia()) alternarTela();
});
