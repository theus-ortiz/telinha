// Lista de amigos salvos + PCs do Tailscale + quem está online/transmitindo.
import { Amigos, SalvarAmigos, StatusAmigos, PCsTailscale } from '../wailsjs/go/main/App';
import { $ } from './util';
import { assistir, ipAssistindo, aoMudarAssistir } from './assistir';

const IP_VALIDO = /^\d{1,3}(\.\d{1,3}){3}$/;
const CORES = ['#6c5ce7', '#e67e22', '#1abc9c', '#e84393', '#0984e3', '#00b894', '#d63031', '#fdcb6e'];
const ICONE_X = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const ICONE_MAIS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

let amigos = [];
let pcsRede = [];   // outros PCs no Tailscale (o Radmin não tem como listar)
let situacao = {};  // ip -> 'transmitindo' | 'online' | 'offline'

const corDe = (nome) => CORES[[...nome].reduce((h, c) => h + c.charCodeAt(0), 0) % CORES.length];

/** Nome salvo para o IP, ou o próprio IP. */
export const nomeDoIp = (ip) => amigos.find((a) => a.ip === ip)?.nome ?? ip;

function itemPessoa({ nome, ip }, icone, tituloIcone) {
  const st = situacao[ip] ?? 'offline';
  const item = document.createElement('div');
  item.className = `amigo ${st}` + (ipAssistindo() === ip ? ' atual' : '');
  item.innerHTML = `
    <div class="inicial"></div>
    <div class="info"><div></div><div></div></div>
    <span class="aovivo">AO VIVO</span>
    <button class="icone acao">${icone}</button>`;
  const inicial = item.querySelector('.inicial');
  inicial.textContent = nome[0].toUpperCase();
  inicial.style.background = corDe(nome);
  const [n, sub] = item.querySelectorAll('.info div');
  n.textContent = nome;
  sub.textContent = { transmitindo: 'Transmitindo agora', online: 'App aberto' }[st] ?? ip;
  item.title = `${nome} · ${ip}`;
  item.querySelector('.acao').title = tituloIcone;
  return item;
}

// Remover pede um segundo clique em vez de abrir um confirm() do navegador.
function botaoRemover(item, amigo) {
  let armado = null;
  item.querySelector('.acao').onclick = (e) => {
    e.stopPropagation();
    if (armado) return salvar(amigos.filter((x) => x !== amigo));
    item.classList.add('confirmando');
    item.querySelector('.info div:last-child').textContent = 'Clique no ✕ de novo para remover';
    armado = setTimeout(desenhar, 3000);
  };
}

function desenhar() {
  const lista = $('listaAmigos');
  lista.replaceChildren();
  if (!amigos.length) {
    lista.innerHTML = '<div class="nenhum">Nenhum amigo salvo. Clique no + para adicionar.</div>';
  }
  // quem está transmitindo sobe para o topo
  const ordem = { transmitindo: 0, online: 1 };
  const ordenados = [...amigos].sort((a, b) => (ordem[situacao[a.ip]] ?? 2) - (ordem[situacao[b.ip]] ?? 2));
  for (const a of ordenados) {
    const item = itemPessoa(a, ICONE_X, 'Remover');
    item.onclick = () => assistir(a.ip, a.nome);
    botaoRemover(item, a);
    lista.append(item);
  }

  const rede = $('listaRede');
  rede.replaceChildren();
  const novos = pcsRede.filter((p) => !amigos.some((a) => a.ip === p.ip));
  $('tituloRede').hidden = !novos.length;
  for (const p of novos) {
    const item = itemPessoa(p, ICONE_MAIS, 'Salvar como amigo');
    item.classList.toggle('desligado', !p.online);
    item.onclick = () => mostrarForm(true, p);
    rede.append(item);
  }
}

async function salvar(nova) {
  amigos = nova;
  desenhar();
  try { await SalvarAmigos(amigos); } catch (e) { console.warn('não salvou amigos', e); }
}

function mostrarForm(abrir, sugestao) {
  const form = $('formAmigo');
  form.hidden = !abrir;
  if (!abrir) return form.reset();
  if (sugestao) {
    $('nomeAmigo').value = sugestao.nome;
    $('ipAmigo').value = sugestao.ip;
  } else {
    const ipDigitado = $('ip').value.trim();
    if (!amigos.some((a) => a.ip === ipDigitado)) $('ipAmigo').value = ipDigitado;
  }
  $('nomeAmigo').focus();
  $('nomeAmigo').select();
}

function enviarForm(e) {
  e.preventDefault();
  const ip = $('ipAmigo').value.trim();
  if (!IP_VALIDO.test(ip)) {
    $('ipAmigo').focus();
    $('ipAmigo').style.borderColor = 'var(--erro)';
    return;
  }
  const nome = $('nomeAmigo').value.trim() || ip;
  // mesmo IP salvo de novo só troca o nome
  salvar([...amigos.filter((a) => a.ip !== ip), { nome, ip }].sort((a, b) => a.nome.localeCompare(b.nome)));
  mostrarForm(false);
  atualizarSituacao();
}

async function carregarRede() {
  try { pcsRede = (await PCsTailscale()) ?? []; } catch { pcsRede = []; }
  desenhar();
}

async function atualizarSituacao() {
  const ips = [...new Set([...amigos.map((a) => a.ip), ...pcsRede.filter((p) => p.online).map((p) => p.ip)])];
  if (!ips.length) return;
  try { situacao = (await StatusAmigos(ips)) ?? {}; } catch { return; }
  desenhar();
}

/** Carrega tudo e devolve a lista de amigos salvos. */
export async function iniciarAmigos() {
  $('btnNovoAmigo').onclick = () => mostrarForm($('formAmigo').hidden);
  $('cancelarAmigo').onclick = () => mostrarForm(false);
  $('formAmigo').onsubmit = enviarForm;
  $('ipAmigo').oninput = (e) => { e.target.style.borderColor = ''; };
  aoMudarAssistir(desenhar);

  try { amigos = (await Amigos()) ?? []; } catch (e) { console.warn(e); }
  desenhar();
  carregarRede().then(atualizarSituacao);
  setInterval(carregarRede, 30_000);
  setInterval(atualizarSituacao, 8_000);
  return amigos;
}
