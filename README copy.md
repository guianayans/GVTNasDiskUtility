# **GVTNas Disk Utility**

Painel web moderno inspirado no Disk Utility do macOS para administração de discos, partições, volumes e compartilhamentos SMB diretamente em um contêiner Docker.
Compatível com discos externos, Time Machine, Clonezilla e diversos filesystems suportados pelo kernel Linux.

---

## **📦 Stack Tecnológica**

* **Backend:** Node.js 20 + Express + TypeScript
* **Frontend:** React + Vite + TailwindCSS
* **Infra interna do container:** `smbd`, `udisks2`, `lsblk`, `blkid`, `mount/umount`
* **Deploy:** Docker Compose (privileged)
* **Ambiente:** Totalmente isolado do host; Samba e utilitários rodam apenas dentro do container.

---

## **🧩 Docker Compose (oficial)**

Este projeto utiliza o seguinte `docker-compose.yml`:

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

## **🔧 Pré-requisitos do Host**

O host **não** precisa ter Samba instalado.

O host precisa apenas:

1. Docker + Docker Compose
2. Pasta do projeto localizada em:

   ```
   /pendriver/GVTNas
   ```
3. Permitir acesso privilegiado ao container (para acesso a `/dev`, `/run/udev`, etc.)
4. Ter suporte no kernel aos filesystems desejados (ex.: NTFS, ExFAT, EXT4).
5. USBs e discos externos devem aparecer normalmente em `/dev/sdX` no sistema.

---

## **🚀 Inicialização**

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/GVTNasDiskUtility.git
cd GVTNasDiskUtility
```

### 2. Criar o arquivo `.env`

```bash
cp .env.example .env
```

Preencher:

```env
APP_PASSWORD=senha-do-painel
NAS_SMB_PASSWORD=
PUBLIC_SMB_HOST=
PUBLIC_BASE_URL=http://SEU_IP:3010
NAS_SMB_USER=nasuser
NAS_SMB_GROUP=nasuser
```

### 3. Subir o serviço

```bash
docker compose up -d
```

A interface ficará disponível em:

```
http://SEU_IP:3010
```

---

## **📑 Detalhes da Inicialização do Container**

Durante o boot, o container executa:

1. `apt-get update`
2. Instalação de:

   * `samba`
   * `samba-common-bin`
   * `udisks2`
   * `ntfs-3g`
   * `exfatprogs`
3. Criação automática do usuário Samba interno:

   ```
   nasuser / NAS_SMB_PASSWORD
   ```
4. Início do serviço `smbd`
5. Build e inicialização da aplicação:

   * `npm ci`
   * `npm run build`
   * `npm start`

Isso garante que o app funciona **em qualquer máquina nova**, sem depender de configuração extra no host.

---

## **📂 Recursos principais**

### **Gerenciamento de discos**

* Visualização completa via `lsblk` e `udisks2`
* Árvore de dispositivos com discos → partições → volumes
* Detecção automática de hotplug USB

### **Montagem**

* Montagem segura via `udisksctl`
* Ajuste automático de permissões
* Suporte a NTFS, EXFAT, EXT4 e outros

### **Compartilhamento SMB**

* Configuração automática no arquivo `smb.conf`
* Reinicialização limpa do `smbd`
* Compatível com:

  * Windows Explorer
  * Finder (macOS)
  * App Arquivos (iOS)
  * Linux (Nautilus / Dolphin)

### **Explorador de Arquivos**

* Navegação segura dentro de `/mnt` e `/media`
* Breadcrumb, download e pré-visualização

### **Time Machine / Clonezilla**

* Criação de shares específicos com parâmetros Apple
* Habilitar/desabilitar via API e interface

---

## **🌐 Variáveis de Ambiente**

| Variável              | Descrição                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `APP_PASSWORD`        | **Obrigatória.** Senha usada pelo overlay de login do painel web (share com Vite via `VITE_APP_PASSWORD`). |
| `NAS_SMB_PASSWORD`    | **Obrigatória.** Senha usada para o usuário Samba interno (`nasuser` por padrão).          |
| `NAS_SMB_USER`        | Nome do usuário Samba (padrão: `nasuser`).                                                |
| `NAS_SMB_GROUP`       | Grupo Samba utilizado nos `force user/group` (padrão: `nasuser`).                         |
| `PUBLIC_SMB_HOST`     | Hostname/IP público exibido nos links de conexão SMB dentro do painel.                    |
| `PUBLIC_BASE_URL`     | URL pública utilizada pelo frontend para chamadas HTTP (padrão: `http://localhost:3010`).|
| `SAMBA_CONFIG_PATH`   | Caminho do `smb.conf` dentro do container (padrão: `/etc/samba/smb.conf`).                |
| `VITE_APP_PASSWORD`   | Opcional no `.env`: se não definido, o valor de `APP_PASSWORD` será reutilizado pelo build do frontend. |
| `MOUNT_BASE`          | Base onde os volumes são montados (`/media/gvtnas` por padrão).                           |
| `MIN_DEVICE_BYTES`    | Discos abaixo desse tamanho (padrão 3 GB) são considerados partições do sistema e ignorados. |
| `ALLOWED_MOUNT_ROOTS` | Lista de roots permitidos para o explorador e mounts (padrão `/mnt,/media`).              |
| `SHARE_STATE_PATH`    | Caminho do arquivo JSON que guarda o estado dos shares (opcional).                        |
| `SAMBA_USERNAME_MAP`  | Caminho do `username.map` usado para mapear logins para `nasuser`.                        |
| `VITE_API_BASE_URL`   | URL da API usada pelo frontend em modo dev/build (padrão: `http://localhost:3010`).        |

---

## **📜 Endpoints Principais**

| Método | Caminho                     | Função                        |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/api/disks`                | Lista discos e partições      |
| POST   | `/api/mount`                | Monta dispositivo             |
| POST   | `/api/unmount`              | Desmonta                      |
| GET    | `/api/fs/list`              | Lista arquivos                |
| GET    | `/api/fs/download`          | Baixa arquivo                 |
| POST   | `/api/time-machine/enable`  | Ativa share Time Machine      |
| POST   | `/api/time-machine/disable` | Desativa                      |
| POST   | `/api/clonezilla/enable`    | Ativa share Clonezilla        |
| POST   | `/api/clonezilla/disable`   | Desativa                      |
| POST   | `/api/smb/reset`            | Redefine todos os shares SMB  |
| GET    | `/api/shares`               | Lista shares criados          |

---

## **🛠 Logs e Debug**

Logs do app:

```bash
docker logs -f gvtnas
```

Logs do Samba:

```bash
docker exec -it gvtnas tail -f /var/log/samba/log.smbd
```

Ver discos dentro do container:

```bash
docker exec -it gvtnas lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
```

---

* **Disco não aparece na interface**
  Verifique se `/run/udev` está montado corretamente no container.

* **Não acessa via SMB no iOS/macOS/Windows**
  Usar:

  ```
  Usuário: nasuser
  Senha:  <definida no NAS_SMB_PASSWORD>
  ```

* **Erro ao montar NTFS ou EXFAT**
  Confirmar instalação dos drivers no host/kernel.

---

## **📄 Licença**

MIT ou outra à sua escolha.

---