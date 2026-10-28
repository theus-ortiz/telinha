package amigos

import (
	"path/filepath"
	"reflect"
	"testing"
)

func TestSalvarECarregar(t *testing.T) {
	arq := filepath.Join(t.TempDir(), "sub", "amigos.json")

	lista, err := Carregar(arq)
	if err != nil || len(lista) != 0 {
		t.Fatalf("arquivo inexistente deveria dar lista vazia, veio %v %v", lista, err)
	}

	quero := []Amigo{{Nome: "João", IP: "100.64.0.2"}, {Nome: "Ana", IP: "26.1.2.3"}}
	if err := Salvar(arq, quero); err != nil {
		t.Fatal(err)
	}
	veio, err := Carregar(arq)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(veio, quero) {
		t.Fatalf("veio %v, queria %v", veio, quero)
	}
}
