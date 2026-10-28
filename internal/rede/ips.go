// Package rede cuida do que envolve as VPNs (Tailscale e Radmin).
package rede

import "net"

// Porta onde o telinha escuta a sinalização.
const Porta = "8765"

// EhVPN diz se o IP é do Tailscale (100.64.0.0/10) ou do Radmin (26.0.0.0/8).
func EhVPN(ip net.IP) bool {
	ip = ip.To4()
	if ip == nil {
		return false
	}
	return (ip[0] == 100 && ip[1]&0xC0 == 64) || ip[0] == 26
}

// MeusIPs devolve os IPs de VPN desta máquina.
func MeusIPs() []string {
	ips := []string{}
	addrs, _ := net.InterfaceAddrs()
	for _, ad := range addrs {
		if ipnet, ok := ad.(*net.IPNet); ok && EhVPN(ipnet.IP) {
			ips = append(ips, ipnet.IP.To4().String())
		}
	}
	return ips
}
