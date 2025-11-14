Segue um **README.md totalmente revisado**, claro, profissional e com a nova sessão completa sobre **WireGuard + acesso remoto seguro**, além de instruções de **DDNS (NO-IP)**, **port forwarding**, **roteadores comuns**, e tudo que alguém precisa para instalar o GVTNas em qualquer servidor e usar remotamente sem quebrar nada.

Está no tom certo para documentação pública, sem expor nada sensível, e mantendo o app elegante.

---

# ✔️ **README.md atualizado (versão final)**

````md
# GVTNas Disk Utility

Painel web moderno inspirado no Disk Utility do macOS para administração de discos, volumes, partições, Time Machine, Clonezilla e compartilhamentos SMB — tudo isolado dentro de um container Docker.

O GVTNas transforma qualquer servidor Linux em um NAS elegante e funcional, com UI moderna, hotplug USB, montagens seguras via `udisks2` e compartilhamento Samba totalmente automatizado.

---

# 📦 Stack Tecnológica

- **Backend:** Node.js 20 + Express + TypeScript  
- **Frontend:** React + Vite + TailwindCSS  
- **Sistema de arquivos:** `lsblk`, `udisksctl`, `mount/umount`, `blkid`  
- **Serviços internos:** `smbd`, `udisks2`  
- **Deploy:** Docker Compose (modo privileged)  

Todo o gerenciamento (montagem, permissões, shares) ocorre **inteiramente dentro do container**, mantendo o host limpo.

---

# ⚙️ Pré-requisitos

- Linux com Docker + Docker Compose  
- A pasta do projeto **deve estar** em:  
  `/pendriver/GVTNas/`
- Kernel com suporte aos filesystems desejados (ext4, exfat, ntfs, etc.)
- Suporte a hotplug USB (normal em qualquer distro)
- Roteador com IPv4 público ou DDNS

---

# 🚀 Subindo a aplicação

## 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/GVTNasDiskUtility.git
cd GVTNasDiskUtility
````

## 2. Criar o arquivo `.env`

```bash
cp .env.example .env
```

Preencha pelo menos:

```env
APP_PASSWORD=senha-do-painel
NAS_SMB_PASSWORD=senha-do-samba
PUBLIC_SMB_HOST=seu-dominio-ddns
PUBLIC_BASE_URL=http://seu-ip-ou-dominio:3010
NAS_SMB_USER=nasuser
NAS_SMB_GROUP=nasuser
```

## 3. Subir com Docker Compose

```bash
docker compose up -d
```

Acesse:

```
http://SEU_IP:3010
```

---

# 📑 Docker Compose Oficial

```yaml
services:
  gvtnas:
    image: 'node:20'
    container_name: gvtnas
    working_dir: /app
    privileged: true
    volumes:
      - '/pendriver/GVTNas:/app'
      - '/run/udev:/run/udev'
      - '/mnt:/mnt'
      - '/media:/media'
      - '/var/lib/gvtnas-samba:/var/lib/samba'
      - '/etc/gvtnas-samba:/etc/samba'
    ports:
      - '3010:3010'
      - '445:445'
      - '139:139'
    environment:
      APP_PASSWORD: ${APP_PASSWORD}
      VITE_APP_PASSWORD: ${APP_PASSWORD}
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3010
      SAMBA_CONFIG_PATH: /etc/samba/smb.conf
      PUBLIC_SMB_HOST: ${PUBLIC_SMB_HOST}
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL:-http://localhost:3010}
      NAS_SMB_PASSWORD: ${NAS_SMB_PASSWORD}
      NAS_SMB_USER: ${NAS_SMB_USER:-nasuser}
      NAS_SMB_GROUP: ${NAS_SMB_GROUP:-nasuser}
    command: >
      bash -c '
        set -e
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y samba samba-common-bin udisks2 ntfs-3g exfatprogs
        useradd -M -s /usr/sbin/nologin ${NAS_SMB_USER:-nasuser} >/dev/null 2>&1 || true
        service smbd start
        PASS=${NAS_SMB_PASSWORD}
        if ! pdbedit -L | grep -q "^${NAS_SMB_USER:-nasuser}:"; then
          printf "%s\n%s\n" "$$PASS" "$$PASS" | smbpasswd -a -s ${NAS_SMB_USER:-nasuser}
        else
          printf "%s\n%s\n" "$$PASS" "$$PASS" | smbpasswd -s ${NAS_SMB_USER:-nasuser}
        fi
        npm_config_production=false npm ci --no-audit --no-fund
        npm run build --if-present
        npm start
      '
    restart: unless-stopped
```

---

# 🌐 Acesso Remoto Seguro (WireGuard VPN)

O acesso SMB pela internet **NÃO funciona de forma segura** e muitos ISPs bloqueiam portas 445/139.
Para acesso externo 100% funcional (iOS, macOS, Windows), use **WireGuard**.

O servidor passa a ser acessado como se você estivesse na mesma rede local.

---

# 🔐 Instalando o WireGuard (Docker + Coolify)

## 1. Criar pasta de configuração:

```bash
sudo mkdir -p /pendriver/wireguard/config
sudo chmod -R 777 /pendriver/wireguard
```

## 2. Criar novo app Docker no Coolify e colar:

```yaml
services:
  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=0
      - PGID=0
      - TZ=America/Sao_Paulo
      - SERVERURL=SEU_DDNS
      - SERVERPORT=51820
      - PEERS=iphone,macbook,windows
      - PEERDNS=1.1.1.1
      - INTERNAL_SUBNET=10.10.0.0
    volumes:
      - /pendriver/wireguard/config:/config
      - /lib/modules:/lib/modules
    ports:
      - 51820:51820/udp
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped
```

## 3. Deployar

Serão criados arquivos como:

```
/pendriver/wireguard/config/peer_iphone/peer_iphone.png
```

Escaneie esse QR Code no app **WireGuard** (iOS/Android).

---

# 📡 Acesso Remoto ao GVTNas via VPN

Depois de conectado à VPN, acesse:

### Interface Web:

```
http://10.10.0.1:3010
```

### SMB:

```
smb://10.10.0.1
```

Total compatibilidade com:

* iPhone (app Arquivos)
* macOS Finder
* Windows Explorer

---

# 🌍 Configuração de DDNS (NO-IP)

1. Crie conta em: [https://www.noip.com](https://www.noip.com)
2. Crie um hostname (ex.: `seuservidor.ddns.net`)
3. Instale o cliente NO-IP no servidor:

```bash
sudo apt install noip2 -y
sudo noip2 -C
```

4. Verifique:

```bash
sudo systemctl status noip2
```

---

# 🔧 Port Forwarding Necessário

No roteador, abra:

| Serviço       | Porta | Protocolo | Para                 |
| ------------- | ----- | --------- | -------------------- |
| **GVTNas**    | 3010  | TCP       | IP local do servidor |
| **WireGuard** | 51820 | UDP       | IP local do servidor |

**NÃO abra portas 445 ou 139** na internet.
SMB só deve ser usado via WireGuard (segurança + funcionamento garantido).

---

# 📁 Recursos do GVTNas

### ✓ Árvore completa de discos/partições

### ✓ Montagem automática de volumes

### ✓ Explorador de arquivos em `/mnt` e `/media`

### ✓ Hotplug USB monitorado

### ✓ Compartilhamentos SMB automáticos

### ✓ Perfis de Time Machine / Clonezilla

### ✓ Mapeamento de usuários interno

### ✓ Logs detalhados

### ✓ API REST completa

---

# 🛠 Troubleshooting

### Disco não aparece

* Verifique se `/run/udev` está montado no container

### Samba não autentica

* O usuário sempre será `nasuser`
* A senha é `NAS_SMB_PASSWORD` do `.env`

### iPhone não conecta ao SMB

* Isso é esperado sem VPN
* Conecte via **WireGuard**
* Acesse `smb://10.10.0.1`

### Desempenho lento em USB

* Use portas USB 3.0 / cabo adequado
* Prefira formatos nativos (ext4, exfat)

---

# 📄 Licença

MIT

```

---
```
