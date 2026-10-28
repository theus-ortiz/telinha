// Package sinal é o servidor que apresenta quem transmite a quem assiste
// para o WebRTC conectar os dois direto. O vídeo não passa por aqui.
//
// O host (o próprio PC, via localhost, com ?host=1) conversa com cada viewer
// separado: mensagens do viewer chegam ao host com "de": id, e o host responde
// com "para": id. Sem "para", a mensagem do host vai para todos.
package sinal

import (
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"telinha/internal/rede"
)

const (
	limiteMensagem = 64 << 10 // SDP e ICE cabem com folga
	prazoEscrita   = 5 * time.Second
)

type Servidor struct {
	mu      sync.Mutex
	host    *websocket.Conn
	viewers map[int]*websocket.Conn
	proximo int
	rodando bool
}

func Novo() *Servidor {
	return &Servidor{viewers: map[int]*websocket.Conn{}}
}

var upgrader = websocket.Upgrader{CheckOrigin: origemPermitida}

// origemPermitida só aceita o próprio telinha. Sem isso, qualquer site aberto
// no navegador poderia se conectar em ws://localhost:8765.
func origemPermitida(r *http.Request) bool {
	o := r.Header.Get("Origin")
	if o == "" {
		return true // não veio de navegador
	}
	u, err := url.Parse(o)
	if err != nil {
		return false
	}
	switch h := u.Hostname(); {
	case u.Scheme == "wails", h == "wails.localhost":
		return true // app instalado
	case h == "localhost" || h == "127.0.0.1":
		return true // wails dev
	}
	return false
}

func doProprioPC(r *http.Request) bool {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	return err == nil && net.ParseIP(h).IsLoopback()
}

// Iniciar escuta em todas as interfaces; quem filtra a VPN é a regra
// do firewall que o instalador cria. Chamar de novo não faz nada.
func (s *Servidor) Iniciar() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.rodando {
		return nil
	}
	ln, err := net.Listen("tcp", ":"+rede.Porta)
	if err != nil {
		return err
	}
	srv := &http.Server{Handler: s.Handler(), ReadHeaderTimeout: 5 * time.Second}
	go srv.Serve(ln)
	s.rodando = true
	return nil
}

func (s *Servidor) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.ws)
	mux.HandleFunc("/ping", s.ping)
	return mux
}

func (s *Servidor) Transmitindo() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.host != nil
}

func (s *Servidor) ping(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rede.Ping{Transmitindo: s.Transmitindo()})
}

func (s *Servidor) ws(w http.ResponseWriter, r *http.Request) {
	ehHost := r.URL.Query().Get("host") == "1"
	if ehHost && !doProprioPC(r) {
		http.Error(w, "só o próprio PC transmite", http.StatusForbidden)
		return
	}
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c.SetReadLimit(limiteMensagem)
	if ehHost {
		s.loopHost(c)
	} else {
		s.loopViewer(c)
	}
}

func (s *Servidor) loopHost(c *websocket.Conn) {
	s.mu.Lock()
	if s.host != nil {
		s.host.Close()
	}
	s.host = c
	// quem já estava esperando recebe a transmissão agora
	for id := range s.viewers {
		enviar(c, map[string]any{"de": id, "oi": true})
	}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		if s.host == c {
			s.host = nil
		}
		s.mu.Unlock()
		c.Close()
	}()

	for {
		_, dados, err := c.ReadMessage()
		if err != nil {
			return
		}
		var msg struct {
			Para *int `json:"para"`
		}
		json.Unmarshal(dados, &msg)

		s.mu.Lock()
		if msg.Para != nil {
			if v := s.viewers[*msg.Para]; v != nil {
				escrever(v, dados)
			}
		} else {
			for _, v := range s.viewers {
				escrever(v, dados)
			}
		}
		s.mu.Unlock()
	}
}

func (s *Servidor) loopViewer(c *websocket.Conn) {
	s.mu.Lock()
	s.proximo++
	id := s.proximo
	s.viewers[id] = c
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.viewers, id)
		if s.host != nil {
			enviar(s.host, map[string]any{"de": id, "saiu": true})
		}
		s.mu.Unlock()
		c.Close()
	}()

	for {
		_, dados, err := c.ReadMessage()
		if err != nil {
			return
		}
		var msg map[string]any
		if json.Unmarshal(dados, &msg) != nil {
			continue
		}
		msg["de"] = id
		s.mu.Lock()
		if s.host != nil {
			enviar(s.host, msg)
		}
		s.mu.Unlock()
	}
}

// escrever e enviar devem ser chamados com s.mu travado:
// o websocket não aceita duas escritas ao mesmo tempo.
func escrever(c *websocket.Conn, dados []byte) {
	c.SetWriteDeadline(time.Now().Add(prazoEscrita))
	c.WriteMessage(websocket.TextMessage, dados)
}

func enviar(c *websocket.Conn, v any) {
	if dados, err := json.Marshal(v); err == nil {
		escrever(c, dados)
	}
}
