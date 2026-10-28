package rede

import (
	"reflect"
	"testing"
)

func TestLerStatus(t *testing.T) {
	saida := []byte(`{
	  "Self": {"HostName": "eu"},
	  "Peer": {
	    "a": {"HostName": "DESKTOP-1", "DNSName": "joao-pc.tail123.ts.net.", "OS": "windows",
	          "TailscaleIPs": ["fd7a::1", "100.64.0.2"], "Online": false},
	    "b": {"HostName": "ANA", "DNSName": "", "OS": "windows",
	          "TailscaleIPs": ["100.64.0.3"], "Online": true},
	    "c": {"HostName": "celular", "OS": "android", "TailscaleIPs": ["100.64.0.4"], "Online": true}
	  }
	}`)
	veio, err := lerStatus(saida)
	if err != nil {
		t.Fatal(err)
	}
	quero := []PC{
		{Nome: "ANA", IP: "100.64.0.3", Online: true}, // online vem primeiro
		{Nome: "joao-pc", IP: "100.64.0.2", Online: false},
	}
	if !reflect.DeepEqual(veio, quero) {
		t.Fatalf("veio %+v\nqueria %+v", veio, quero)
	}
}
