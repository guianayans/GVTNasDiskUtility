# **GVTNas Disk Utility**

````md

O **GVTNas Disk Utility** transforma qualquer servidor Linux em um **NAS moderno**, inspirado no Disk Utility do macOS, com interface glassy, navegação limpa, gerenciamento completo de discos e compartilhamentos SMB, além de integração pronta com VPN WireGuard para acesso remoto 100% seguro.

Ele oferece:

- Gerenciamento de discos, partições e volumes  
- Montagem automática via udisks2  
- Explorador de arquivos integrado  
- Compartilhamentos SMB  
- Time Machine / Clonezilla (Função Desativada - Ativar via Código)
- Hotplug USB  
- Configuração de usuários  
- Acesso local e remoto via WireGuard  
- UI moderna estilo Apple  

---

# 🔥 TL;DR – Subir o GVTNas em 5 passos

```bash
# 1. Clonar o projeto
git clone https://github.com/guianayans/GVTNasDiskUtility.git
cd GVTNasDiskUtility

# 2. Criar .env
cp .env.example .env
nano .env  # defina APP_PASSWORD e NAS_SMB_PASSWORD

# 3. Subir a aplicação
docker compose up -d

# 4. Acessar o painel
http://SEU_IP:3010

# 5. Login
Senha = APP_PASSWORD
````

📌 A partir desta versão, `docker compose up -d` já sobe **GVTNas + WireGuard** no mesmo stack.  
Use o painel de “Instruções de conexão” dentro do app para acessar os QR Codes e configs dos peers.

---

# 🧱 Instalação completa do zero

A seguir está o processo completo para quem está começando agora com servidor Linux.

---

# 1️⃣ Instalar Ubuntu Server LTS

Baixe e instale:

[https://ubuntu.com/download/server](https://ubuntu.com/download/server)

Versões recomendadas:

* **22.04 LTS**
* **24.04 LTS**

Durante a instalação:

* Nome do servidor: `linux-server`
* Usuário: qualquer
* (opcional) Ative SSH

---

# 2️⃣ Instalar Docker (caso NÃO use o instalador direto do Coolify)

O GVTNas roda sobre Docker, mas **Docker não depende do Coolify**.

Instale manualmente se quiser total controle:

```bash
sudo apt update
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
```

Faça logout e login novamente.

Verifique:

```bash
docker --version
docker compose version
```

---

# 3️⃣ Instalar Coolify (opcional, mas o caminho mais curto e recomendado)

Coolify facilita a vida de quem quer apenas:

**Linux Server → Coolify → Importar Repo → Deploy**

Existem dois métodos:

---

### 🅰️ Método recomendado — Instalar Coolify diretamente (inclui Docker)

Esse comando instala:

✔ Docker
✔ Docker Compose
✔ Coolify
✔ Todas as dependências

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Acesse:

```
http://SEU_IP:3000
```

---

### 🅱️ Método alternativo — Instalar Docker manualmente + rodar Coolify em Docker

Caso queira mais controle:

```bash
docker run -d \
  --name coolify \
  --pull always \
  -p 3000:3000 \
  -v coolify:/data \
  ghcr.io/coollabsio/coolify:latest
```

Acesse:

```
http://SEU_IP:3000
```

---

> 💡 **Resumo:**
> ➜ Docker pode ser instalado com ou sem Coolify
> ➜ Coolify pode ser instalado com ou sem Docker manual
> ➜ **O caminho mais curto e recomendado é usar o instalador automático do Coolify**

---

# 4️⃣ Configurar DDNS (NO-IP)

Se sua internet tem IP dinâmico:

```bash
sudo apt install noip2 -y
sudo noip2 -C
sudo systemctl enable noip2 --now
```

Crie o hostname em:
[https://www.noip.com](https://www.noip.com)

---

# 5️⃣ Abrir portas no roteador

Adicione as seguintes regras:

| Serviço       | Porta | Protocolo | Destino        |
| ------------- | ----- | --------- | -------------- |
| GVTNas Web    | 3010  | TCP       | IP do servidor |
| WireGuard VPN | 51820 | UDP       | IP do servidor |

⚠️ **Nunca abra as portas SMB (445/139) na internet.
Acesso SMB só funciona via WireGuard.**

---

# 📦 Deploy do GVTNas (modo oficial)

O projeto deve estar em:

```
/pendriver/GVTNas
```

Crie:

```bash
sudo mkdir -p /pendriver/GVTNas
sudo chown -R $USER:$USER /pendriver/GVTNas
```

---

## 1. Clonar o repositório

```bash
cd /pendriver/GVTNas
git clone https://github.com/guianayans/GVTNasDiskUtility.git .
```

---

## 2. Configurar o `.env`

```bash
cp .env.example .env
nano .env
```

Preencher:

```env
APP_PASSWORD=sua_senha_do_painel
NAS_SMB_PASSWORD=sua_senha_smb
PUBLIC_SMB_HOST=seu_dominio_ddns
PUBLIC_BASE_URL=http://SEU_IP:3010
```

---

## 3. docker-compose.yml unificado (GVTNas + WireGuard)

O arquivo `docker-compose.yml` que está na raiz do projeto já inclui **dois serviços**:

```yaml
services:
  gvtnas:
    image: node:20
    privileged: true
    volumes:
      - /pendriver/GVTNas:/app
      - /run/udev:/run/udev
      - /mnt:/mnt
      - /media:/media
      - /var/lib/gvtnas-samba:/var/lib/samba
      - /etc/gvtnas-samba:/etc/samba
      - /pendriver/wireguard/config:/wg-config:ro
    ports:
      - 3010:3010
      - 445:445
      - 139:139
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
      bash -c "apt-get update && ... && npm start"
    restart: unless-stopped

  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    volumes:
      - /pendriver/wireguard/config:/config
      - /lib/modules:/lib/modules
    environment:
      SERVERURL: ${SERVERURL}
      SERVERPORT: ${SERVERPORT:-51820}
      PEERS: ${PEERS:-iphone,macbook,windows}
      TZ: ${TZ:-America/Sao_Paulo}
      PUID: ${PUID:-0}
      PGID: ${PGID:-0}
    ports:
      - 51820:51820/udp
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped
```

> Esse mesmo compose funciona em servidores bare metal e também em **Coolify (Docker Compose – Empty)**. Basta colar o conteúdo e definir as variáveis de ambiente no painel do Coolify.

---

### 📌 Nota para Coolify (Docker Compose Empty)

> **Se você fizer deploy via *Docker Compose (Empty)* no Coolify, NÃO precisa criar ou editar `.env` no servidor.**
> As variáveis devem ser definidas em:
> **Application → Environment Variables**
> O Coolify injeta tudo no container, substituindo completamente o `.env`.

---

## 4. Subir com Docker Compose

```bash
docker compose up -d
```

Acesse o painel:

```
http://SEU_IP:3010
```

---

# 🔑 Credenciais internas

### Painel Web:

* Usuário: *(não existe usuário, apenas senha)*
* Senha: `APP_PASSWORD`

### SMB:

* Usuário: `NAS_SMB_USER` (padrão: nasuser)
* Senha: `NAS_SMB_PASSWORD`

---

# 🌐 Deploy do WireGuard (Acesso remoto seguro)

O WireGuard agora faz parte do **mesmo docker-compose** do GVTNas.  
Você só precisa preparar a pasta dos peers antes do `docker compose up -d`.

### Pastas e permissões

```bash
sudo mkdir -p /pendriver/GVTNas/wireguard/config
sudo chmod -R 777 /pendriver/GVTNas/wireguard
```

### Já incluso no compose principal

O serviço `wireguard` já está no `docker-compose.yml` unificado. Eis o trecho relevante:

```yaml
  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      SERVERURL: ${SERVERURL}
      SERVERPORT: ${SERVERPORT:-51820}
      PEERS: ${PEERS:-iphone,macbook,windows}
      PEERDNS: ${PEERDNS:-1.1.1.1}
      INTERNAL_SUBNET: ${INTERNAL_SUBNET:-10.10.0.0/24}
      TZ: ${TZ:-America/Sao_Paulo}
      PUID: ${PUID:-0}
      PGID: ${PGID:-0}
    volumes:
      - /pendriver/GVTNas/wireguard/config:/config
      - /lib/modules:/lib/modules
    ports:
      - 51820:51820/udp
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped
```

Rodando `docker compose up -d` o WireGuard é iniciado junto com o GVTNas.  
Os arquivos dos peers (`peer_iphone.png`, `peer_macbook.conf`, etc.) serão gerados em `/pendriver/GVTNas/wireguard/config` e montados como `/wg-config` dentro do container do GVTNas.

Não há compose separado nem passos extras. É apenas:

```bash
docker compose up -d
```

Depois disso, abra o painel do GVTNas → “Instruções de conexão” para ver os QR Codes e configs.

---

# 🌍 Acesso remoto via VPN

### Painel

```
http://10.10.0.1:3010
```

### SMB

```
smb://10.10.0.1
```

Aqui tudo funciona:

* iPhone (app Arquivos)
* Mac Finder
* Windows Explorer
* Time Machine
* Clonezilla
* Arquivos grandes

Sem expor nada ao mundo.

---

# 🗂️ Funcionalidades do GVTNas

* UI estilo macOS Disk Utility
* Árvore de discos e partições
* Montagem automática
* Time Machine
* Clonezilla
* SMB fácil
* Explorador de arquivos completo
* Hotplug USB
* Logs ao vivo
* API REST
* Estilo glassy/glassmorphism

---

# 🛠 Troubleshooting

### Disco não aparece

* Confirme que `/run/udev` está montado no container

### iPhone não conecta no SMB

* Deve usar WireGuard
* Nunca via portas públicas

### Reiniciar o GVTNas

```bash
docker compose restart gvtnas
```

### Logs

```bash
docker compose logs -f gvtnas
```

---

# 📜 Licença

MIT

---

# ✨ Criado por Guianayans

Open-source, elegante e eficiente.
---

# 🪟 Página “Instruções de conexão”

Assim que você faz login no painel, o GVTNas exibe um overlay com as instruções de acesso.  
Ele mostra:

- QR Codes dos peers do WireGuard (lidos diretamente de `/pendriver/wireguard/config/peer_*/*.png`);
- Conteúdo `.conf` de cada peer (para copiar ou baixar);
- IP/Domínio local para SMB (`smb://SEU_HOST`) e para o painel via VPN (`http://10.10.0.1:3010`);
- Um checklist rápido (montar discos, habilitar SMB, usar o explorer com upload e download).

Depois de fechar o overlay, você pode reabrir a qualquer momento pelo botão **“Instruções de conexão”** no topo do painel.  
Isso evita expor SMB publicamente: todo acesso remoto continua sendo feito via WireGuard.

---
