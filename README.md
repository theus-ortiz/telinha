# telinha

Compartilhe a tela com seus amigos em até 60 FPS, direto de PC para PC, sem servidor no meio.
Funciona com **Tailscale** ou **Radmin VPN**.

## Instalar

**Pelo winget** (recomendado):

```
winget install telinha
```

**Ou baixe o instalador** na página de [Releases](../../releases/latest) (`telinha-amd64-installer.exe`).

O instalador já libera o telinha no firewall do Windows, mas só para conexões vindas da VPN (Tailscale `100.64.0.0/10` e Radmin `26.0.0.0/8`).

## Como usar

1. Você e seu amigo instalam a mesma VPN (Tailscale ou Radmin) e entram na mesma rede.
2. Quem vai mostrar a tela clica em **Transmitir tela**.
3. Quem vai assistir clica no amigo na lista (ou digita o IP dele).

O passo a passo completo está no próprio app, no botão **?**.

### Recursos

- Lista de amigos, mostrando quem está online e quem está **AO VIVO**
- PCs da rede Tailscale aparecem sozinhos
- Vários amigos assistindo ao mesmo tempo
- Modo jogo (fluidez) ou nitidez (texto), de 4 a 12 Mbps
- **Ctrl+Alt+P** pausa a transmissão mesmo com o jogo em tela cheia

## Como funciona

O vídeo vai por WebRTC direto entre os dois PCs. Cada telinha aberto escuta na porta `8765`
só para a "apresentação" inicial (sinalização) e para dizer aos amigos se está transmitindo.

```
main.go, app.go        janela (Wails) e funções que o frontend chama
internal/sinal/        servidor de sinalização (WebSocket) e /ping
internal/rede/         IPs da VPN, status dos amigos, PCs do Tailscale
internal/amigos/       lista de amigos em %APPDATA%\telinha\amigos.json
internal/sistema/      coisas do Windows (atalho global, esconder console)
frontend/src/          interface (JS puro, um módulo por parte da tela)
build/windows/         ícone, metadados e instalador (NSIS)
```

## Desenvolvimento

Precisa de [Go](https://go.dev/dl/), [Node.js](https://nodejs.org/) e do [Wails](https://wails.io/docs/gettingstarted/installation):

```
go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.0
wails dev                                  # abre com recarregamento automático
go test ./internal/...                     # testes
wails build -platform windows/amd64 -nsis  # gera o instalador em build/bin/
```

Para lançar uma versão, crie uma tag (`git tag v1.0.0 && git push --tags`). O GitHub Actions
gera o instalador e publica na página de Releases.

## Licença

[MIT](LICENSE)
