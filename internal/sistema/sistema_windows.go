package sistema

import (
	"os/exec"
	"runtime"
	"syscall"
	"unsafe"
)

// EsconderJanela evita que o comando abra uma janela de console.
func EsconderJanela(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
}

// AtalhoGlobal registra Ctrl+Alt+P, que funciona mesmo com o jogo em foco.
func AtalhoGlobal(aoApertar func()) {
	const (
		modAlt      = 0x0001
		modControl  = 0x0002
		modNoRepeat = 0x4000
		wmHotkey    = 0x0312
		teclaP      = 0x50
	)
	user32 := syscall.NewLazyDLL("user32.dll")
	registrar := user32.NewProc("RegisterHotKey")
	pegarMsg := user32.NewProc("GetMessageW")

	// a mensagem do atalho chega na fila da thread que registrou
	runtime.LockOSThread()
	if ok, _, _ := registrar.Call(0, 1, modControl|modAlt|modNoRepeat, teclaP); ok == 0 {
		return // outro programa já usa esse atalho
	}
	var msg struct {
		hwnd    uintptr
		message uint32
		wParam  uintptr
		lParam  uintptr
		time    uint32
		x, y    int32
		priv    uint32
	}
	for {
		r, _, _ := pegarMsg.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(r) <= 0 {
			return
		}
		if msg.message == wmHotkey {
			aoApertar()
		}
	}
}
