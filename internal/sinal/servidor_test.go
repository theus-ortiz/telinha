package sinal

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"telinha/internal/rede"
)

func ler(t *testing.T, c *websocket.Conn) map[string]any {
	t.Helper()
	c.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, d, err := c.ReadMessage()
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	json.Unmarshal(d, &m)
	return m
}

func conectar(t *testing.T, url string, origem string) *websocket.Conn {
	t.Helper()
	h := http.Header{}
	if origem != "" {
		h.Set("Origin", origem)
	}
	c, _, err := websocket.DefaultDialer.Dial(url, h)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Close() })
	return c
}

func transmitindo(t *testing.T, base string) bool {
	t.Helper()
	r, err := http.Get(base + "/ping")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	var p rede.Ping
	json.NewDecoder(r.Body).Decode(&p)
	return p.Transmitindo
}

func TestRoteamento(t *testing.T) {
	srv := httptest.NewServer(Novo().Handler())
	defer srv.Close()
	u := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"

	// viewer chega antes de o host começar
	v1 := conectar(t, u, "")
	v1.WriteJSON(map[string]any{"oi": true})
	time.Sleep(50 * time.Millisecond)
	if transmitindo(t, srv.URL) {
		t.Fatal("/ping disse que transmite sem host")
	}

	h := conectar(t, u+"?host=1", "http://wails.localhost")
	if m := ler(t, h); m["oi"] != true || m["de"] != 1.0 {
		t.Fatal("host não recebeu o oi pendente do v1:", m)
	}
	if !transmitindo(t, srv.URL) {
		t.Fatal("/ping deveria dizer que transmite")
	}

	v2 := conectar(t, u, "wails://wails")
	v2.WriteJSON(map[string]any{"oi": true})
	if m := ler(t, h); m["de"] != 2.0 {
		t.Fatal(m)
	}

	// mensagem com "para" vai só para aquele viewer
	h.WriteJSON(map[string]any{"para": 2, "sdp": "x"})
	if m := ler(t, v2); m["sdp"] != "x" {
		t.Fatal(m)
	}

	// sem "para" vai para todos
	h.WriteJSON(map[string]any{"pausado": true})
	if ler(t, v1)["pausado"] != true || ler(t, v2)["pausado"] != true {
		t.Fatal("broadcast falhou")
	}

	v1.Close()
	if m := ler(t, h); m["saiu"] != true || m["de"] != 1.0 {
		t.Fatal("host não soube que v1 saiu:", m)
	}
}

func TestBloqueiaSiteQualquer(t *testing.T) {
	srv := httptest.NewServer(Novo().Handler())
	defer srv.Close()
	u := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"

	h := http.Header{"Origin": {"https://site-malicioso.com"}}
	if _, _, err := websocket.DefaultDialer.Dial(u, h); err == nil {
		t.Fatal("deveria recusar origem de outro site")
	}
}

func TestOrigemPermitida(t *testing.T) {
	casos := map[string]bool{
		"":                          true,
		"wails://wails":             true,
		"http://wails.localhost":    true,
		"https://wails.localhost":   true,
		"http://localhost:34115":    true,
		"http://127.0.0.1:5173":     true,
		"https://evil.com":          false,
		"http://wails.localhost.io": false,
	}
	for o, quero := range casos {
		r := httptest.NewRequest("GET", "/ws", nil)
		if o != "" {
			r.Header.Set("Origin", o)
		}
		if veio := origemPermitida(r); veio != quero {
			t.Errorf("origem %q: %v, queria %v", o, veio, quero)
		}
	}
}

func TestHostSoDoProprioPC(t *testing.T) {
	s := Novo()
	r := httptest.NewRequest("GET", "/ws?host=1", nil)
	r.RemoteAddr = "100.64.0.9:5000" // outro PC da VPN
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("PC de fora virou host (status %d)", w.Code)
	}
}
