package rede

import (
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"
)

// Estado que cada telinha responde em /ping.
type Ping struct {
	Transmitindo bool `json:"transmitindo"`
}

// Situacao pergunta a cada IP se o telinha está aberto.
// Resposta por IP: "transmitindo", "online" ou "offline".
func Situacao(ips []string) map[string]string {
	cli := http.Client{Timeout: 1500 * time.Millisecond}
	res := make(map[string]string, len(ips))
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, ip := range ips {
		wg.Add(1)
		go func() {
			defer wg.Done()
			st := "offline"
			if r, err := cli.Get("http://" + net.JoinHostPort(ip, Porta) + "/ping"); err == nil {
				var p Ping
				if json.NewDecoder(r.Body).Decode(&p) == nil {
					st = "online"
					if p.Transmitindo {
						st = "transmitindo"
					}
				}
				r.Body.Close()
			}
			mu.Lock()
			res[ip] = st
			mu.Unlock()
		}()
	}
	wg.Wait()
	return res
}
