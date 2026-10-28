package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"telinha/internal/amigos"
	"telinha/internal/rede"
	"telinha/internal/sinal"
	"telinha/internal/sistema"
)

// App é o que o frontend enxerga: cada método público vira uma função em
// frontend/wailsjs/go/main/App.js. A lógica fica nos pacotes de internal/.
type App struct {
	ctx   context.Context
	sinal *sinal.Servidor
}

func NewApp() *App { return &App{sinal: sinal.Novo()} }

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Sobe já na abertura para os amigos verem que o app está aberto.
	if err := a.sinal.Iniciar(); err != nil {
		runtime.LogError(ctx, "servidor: "+err.Error())
	}
	go sistema.AtalhoGlobal(func() { runtime.EventsEmit(ctx, "atalho-pausar") })
}

// Hospedar garante que o servidor está no ar (tenta de novo se falhou na abertura).
func (a *App) Hospedar() error { return a.sinal.Iniciar() }

func (a *App) MeusIPs() []string { return rede.MeusIPs() }

func (a *App) StatusAmigos(ips []string) map[string]string { return rede.Situacao(ips) }

func (a *App) PCsTailscale() ([]rede.PC, error) { return rede.PCsTailscale() }

func (a *App) Amigos() ([]amigos.Amigo, error) {
	arq, err := amigos.Arquivo()
	if err != nil {
		return []amigos.Amigo{}, err
	}
	return amigos.Carregar(arq)
}

func (a *App) SalvarAmigos(lista []amigos.Amigo) error {
	arq, err := amigos.Arquivo()
	if err != nil {
		return err
	}
	return amigos.Salvar(arq, lista)
}
