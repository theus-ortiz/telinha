// Package amigos guarda a lista de amigos num arquivo JSON.
package amigos

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Amigo struct {
	Nome string `json:"nome"`
	IP   string `json:"ip"`
}

// Arquivo padrão: %APPDATA%\telinha\amigos.json no Windows.
func Arquivo() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "telinha", "amigos.json"), nil
}

// Carregar devolve a lista salva (vazia se o arquivo ainda não existe).
func Carregar(arq string) ([]Amigo, error) {
	lista := []Amigo{}
	dados, err := os.ReadFile(arq)
	if errors.Is(err, os.ErrNotExist) {
		return lista, nil
	}
	if err != nil {
		return lista, err
	}
	if err := json.Unmarshal(dados, &lista); err != nil {
		return []Amigo{}, err
	}
	return lista, nil
}

// Salvar grava a lista inteira por cima, via arquivo temporário
// para não corromper a lista se o PC desligar no meio.
func Salvar(arq string, lista []Amigo) error {
	if err := os.MkdirAll(filepath.Dir(arq), 0o755); err != nil {
		return err
	}
	dados, err := json.MarshalIndent(lista, "", "  ")
	if err != nil {
		return err
	}
	tmp := arq + ".tmp"
	if err := os.WriteFile(tmp, dados, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, arq)
}
