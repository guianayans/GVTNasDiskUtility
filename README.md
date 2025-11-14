# **README.md – GVTNas Disk Utility**

````md
# GVTNas Disk Utility

O **GVTNas Disk Utility** transforma qualquer servidor Linux em um **NAS moderno**, inspirado no Disk Utility do macOS, com interface glassy, navegação limpa, gerenciamento completo de discos e compartilhamentos SMB, além de integração pronta com VPN WireGuard para acesso remoto 100% seguro.

Ele oferece:

- Gerenciamento de discos, partições e volumes  
- Montagem automática via udisks2  
- Explorador de arquivos integrado  
- Compartilhamentos SMB  
- Time Machine / Clonezilla  
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

📌 Para acesso remoto seguro, configure o **WireGuard** (guia abaixo).

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

### 📌 Nota para Coolify (Docker Compose Empty)

> **Se você fizer deploy via *Docker Compose (Empty)* no Coolify, NÃO precisa criar ou editar `.env` no servidor.**
> As variáveis devem ser definidas em:
> **Application → Environment Variables**
> O Coolify injeta tudo no container, substituindo completamente o `.env`.

---

## 3. Subir com Docker Compose

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

Pasta padrão:

```
/pendriver/wireguard
```

Crie:

```bash
sudo mkdir -p /pendriver/wireguard/config
sudo chmod -R 777 /pendriver/wireguard
```

---

## Docker Compose do WireGuard

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

---

## Ativar

```bash
docker compose up -d
```

Serão criados:

```
/pendriver/wireguard/config/peer_iphone/peer_iphone.png
```

---

## Conectar no iPhone

1. App **WireGuard**
2. “Adicionar túnel”
3. “Criar a partir do QR Code”
4. Escaneie `peer_iphone.png`

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
