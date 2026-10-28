package rede

import (
	"net"
	"testing"
)

func TestEhVPN(t *testing.T) {
	casos := map[string]bool{
		"100.64.0.1":    true,  // Tailscale
		"100.127.255.1": true,  // Tailscale (fim da faixa)
		"100.128.0.1":   false, // fora da faixa do Tailscale
		"100.63.0.1":    false,
		"26.10.20.30":   true, // Radmin
		"192.168.0.10":  false,
		"127.0.0.1":     false,
		"::1":           false,
	}
	for ip, quero := range casos {
		if veio := EhVPN(net.ParseIP(ip)); veio != quero {
			t.Errorf("EhVPN(%s) = %v, queria %v", ip, veio, quero)
		}
	}
}
