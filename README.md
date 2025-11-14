# 📘 **README.md — GVTNas Disk Utility**

````md
# GVTNas Disk Utility

GVTNas é um painel web moderno inspirado no **Disk Utility do macOS**, criado para transformar qualquer servidor Linux em um NAS inteligente, bonito e fácil de usar.  
Ele faz gerenciamento completo de:

- Discos físicos  
- Partições  
- Montagens automáticas  
- Time Machine  
- Clonezilla  
- SMB (Samba)  
- Explorador de arquivos  
- Hotplug USB  
- Acesso remoto seguro via WireGuard  

Tudo rodando isolado dentro de containers Docker, sem mexer diretamente no seu sistema.

---

# 🔥 **TL;DR — Subir o GVTNas em 5 passos**

```bash
# 1. Clonar o projeto
git clone https://github.com/guianayans/GVTNasDiskUtility.git
cd GVTNasDiskUtility

# 2. Copiar .env
cp .env.example .env
nano .env   # definir APP_PASSWORD e NAS_SMB_PASSWORD

# 3. Subir a aplicação
docker compose up -d

# 4. Acessar o painel
http://SEU_IP:3010

# 5. Login do painel
Senha = APP_PASSWORD
````

Para acesso remoto seguro (fora da sua rede), instale o WireGuard com o compose incluso neste README.

---

# 🧱 **Instalação completa do zero (para iniciantes)**

Essa é a rota oficial e mais simples para instalar o GVTNas em qualquer servidor.

---

## **1. Instalar Ubuntu Server LTS**

Baixe e instale:

[https://ubuntu.com/download/server](https://ubuntu.com/download/server)

Versões recomendadas: **22.04 LTS ou 24.04 LTS**

Durante a instalação:

* Nome do servidor: `linux-server`
* Usuário: `seuusuario`
* Habilite SSH (opcional, mas recomendado)

---

## **2. Instalar Docker + Docker Compose**

```bash
sudo apt update
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
```

Logout e login novamente.

Verifique:

```bash
docker --version
docker compose version
```

---

## **3. Instalar Coolify (opcional, mas recomendado)**

Coolify é um painel que facilita deploys:

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

Configure e faça login.

---

## **4. Configurar DDNS com NO-IP**

Se sua operadora te dá IP dinâmico, use DDNS.

```bash
sudo apt install noip2 -y
sudo noip2 -C
sudo systemctl enable noip2 --now
```

Crie seu hostname antes:
[https://www.noip.com](https://www.noip.com)

---

## **5. Abrir portas no roteador**

Acesse seu modem/roteador e adicione:

| Finalidade    | Porta | Protocolo | Para IP interno |
| ------------- | ----- | --------- | --------------- |
| GVTNas painel | 3010  | TCP       | IP do servidor  |
| WireGuard VPN | 51820 | UDP       | IP do servidor  |

⚠️ **NUNCA abra portas SMB (445/139) na internet.
SMB só funciona e só deve ser usado via WireGuard.**

---

# 📦 **Deploy do GVTNas (padrão oficial)**

O projeto deve estar localizado exatamente em:

```
/pendriver/GVTNas
```

Crie o diretório:

```bash
sudo mkdir -p /pendriver/GVTNas
sudo chown -R $USER:$USER /pendriver/GVTNas
```

---

## **1. Clonar o repositório**

```bash
cd /pendriver/GVTNas
git clone https://github.com/guianayans/GVTNasDiskUtility.git .
```

> ### Nota sobre Deploy via **Docker Compose (Empty)** no Coolify
> 
> Se você realizar o deploy do GVTNas utilizando a opção **Docker Compose (Empty)** no Coolify, **não é necessário criar ou editar o arquivo `.env` no servidor**.  
> 
> Todas as variáveis de ambiente utilizadas pelo container devem ser definidas diretamente no painel do Coolify, em:
> 
> **Application → Environment Variables**  
> 
> O Coolify injeta automaticamente essas variáveis no container durante o processo de build e execução, substituindo completamente a necessidade de um arquivo `.env` local.  
> 
> Certifique-se apenas de preencher corretamente:
> - `APP_PASSWORD`
> - `NAS_SMB_PASSWORD`
> - `PUBLIC_SMB_HOST`
- `PUBLIC_BASE_URL`
> - `NAS_SMB_USER` (opcional, padrão: `nasuser`)
> - `NAS_SMB_GROUP` (opcional, padrão: `nasuser`)
> 
> Com isso, o deploy acontecerá normalmente sem qualquer arquivo `.env` no repositório.

---

## **2. Configurar o .env**

```bash
cp .env.example .env
nano .env
```

Campos principais:

```env
APP_PASSWORD=senha_para_login_do_painel
NAS_SMB_PASSWORD=senha_do_samba
PUBLIC_SMB_HOST=seu_dominio_ddns
PUBLIC_BASE_URL=http://seu_dominio_ou_ip:3010
```

---

## **3. Subir o container**

```bash
docker compose up -d
```

Acesse:

```
http://SEU_IP:3010
```

### 🔑 **Login do painel**

* Usuário: *(não existe usuário, somente senha)*
* Senha: valor de `APP_PASSWORD`

---

# 🗂️ Recursos do GVTNas

### ✓ Árvore de discos igual ao macOS

### ✓ Montagem e desmontagem com 1 clique

### ✓ Explorador de arquivos moderno

### ✓ Compartilhamentos SMB automáticos

### ✓ Configuração para Time Machine

### ✓ Compartilhamento Clonezilla

### ✓ Logs ao vivo

### ✓ Hotplug USB e detecção automática

### ✓ UI glassy/glammorphism estilo Apple

---

# 🔧 **Deploy do WireGuard para acesso remoto (recomendado)**

A pasta oficial para WireGuard é:

```
/pendriver/wireguard
```

Crie:

```bash
sudo mkdir -p /pendriver/wireguard/config
sudo chmod -R 777 /pendriver/wireguard
```

---

## **1. docker-compose.yml do WireGuard**

Crie um app no Coolify ou arquivo `docker-compose.yml`:

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

## **2. Subir**

```bash
docker compose up -d
```

Isso vai gerar pastas como:

```
/pendriver/wireguard/config/peer_iphone/peer_iphone.png
```

---

## **3. Conectar no iPhone (ou qualquer dispositivo)**

No app WireGuard:

* “Adicionar túnel”
* “Criar *a partir do QR Code*”
* Escaneie `peer_iphone.png`

Pronto. Agora sua VPN está ativa.

---

# 🌐 **Acesso remoto ao GVTNas via WireGuard**

### Painel:

```
http://10.10.0.1:3010
```

### SMB:

```
smb://10.10.0.1
```

### Funções liberadas via VPN:

* Acesso a discos
* SMB
* Time Machine
* File Explorer
* Interface do GVTNas
* Apps adicionais no servidor

Sem expor nada para a internet.

---

# 🔒 **Credenciais internas**

## Painel Web

* usuário: *(não existe)*
* senha: `APP_PASSWORD`

## SMB

* usuário: `NAS_SMB_USER` (padrão: nasuser)
* senha: `NAS_SMB_PASSWORD`

---

# 🧰 Troubleshooting

### Disco não aparece

* Verifique se `/run/udev` está montado no container
* USB 3.0 funciona melhor

### iPhone não conecta ao SMB

* Use WireGuard (obrigatório para acesso remoto)

### Painel não sobe

```bash
docker compose logs -f gvtnas
```

### Mudar senha SMB

```bash
docker exec -it gvtnas smbpasswd nasuser
```

---

# 📜 Licença

MIT

---

# ✨ Criado por Guianayans

Open-source, moderno e acessível.
Sinta-se livre para abrir issues, contribuir ou sugerir melhorias.
