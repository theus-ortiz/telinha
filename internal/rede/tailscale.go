package rede

import (
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"telinha/internal/sistema"
)

// PC é um computador da rede Tailscale.
type PC struct {
	Nome   string `json:"nome"`
	IP     string `json:"ip"`
	Online bool   `json:"online"`
}

func acharTailscale() (string, error) {
	if p, err := exec.LookPath("tailscale"); err == nil {
		return p, nil
	}
	// no Windows o instalador não coloca no PATH
	p := filepath.Join(os.Getenv("ProgramFiles"), "Tailscale", "tailscale.exe")
	if _, err := os.Stat(p); err == nil {
		return p, nil
	}
	return "", errors.New("Tailscale não encontrado")
}

// PCsTailscale lista os outros computadores da rede Tailscale.
// O Radmin não tem como listar a rede por fora, então só vale para o Tailscale.
func PCsTailscale() ([]PC, error) {
	exe, err := acharTailscale()
	if err != nil {
		return []PC{}, err
	}
	cmd := exec.Command(exe, "status", "--json")
	sistema.EsconderJanela(cmd)
	saida, err := cmd.Output()
	if err != nil {
		return []PC{}, errors.New("Tailscale desligado")
	}
	return lerStatus(saida)
}

// lerStatus interpreta a saída de "tailscale status --json".
func lerStatus(saida []byte) ([]PC, error) {
	lista := []PC{}
	var st struct {
		Peer map[string]struct {
			HostName     string
			DNSName      string
			OS           string
			TailscaleIPs []string
			Online       bool
		}
	}
	if err := json.Unmarshal(saida, &st); err != nil {
		return lista, err
	}
	for _, p := range st.Peer {
		if p.OS == "android" || p.OS == "iOS" {
			continue // celular não roda o telinha
		}
		ip := ""
		for _, x := range p.TailscaleIPs {
			if !strings.Contains(x, ":") {
				ip = x
				break
			}
		}
		if ip == "" {
			continue
		}
		// o nome do DNS é o que a pessoa vê/renomeia no painel; HostName é o do Windows
		nome := strings.SplitN(p.DNSName, ".", 2)[0]
		if nome == "" {
			nome = p.HostName
		}
		lista = append(lista, PC{Nome: nome, IP: ip, Online: p.Online})
	}
	sort.Slice(lista, func(i, j int) bool {
		if lista[i].Online != lista[j].Online {
			return lista[i].Online
		}
		return lista[i].Nome < lista[j].Nome
	})
	return lista, nil
}
