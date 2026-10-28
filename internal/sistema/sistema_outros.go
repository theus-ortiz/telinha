//go:build !windows

package sistema

import "os/exec"

func EsconderJanela(cmd *exec.Cmd) {}

func AtalhoGlobal(aoApertar func()) {}
