# Infraestrutura AWS - Prompt Optimizer

## Como a app recebe os segredos

1. O **UserData** da instância EC2 instala `awscli` e `jq`
2. Antes de subir o Docker, executa:
   ```bash
   aws secretsmanager get-secret-value --secret-id prompt-optimizer/app-secrets --region $REGION ...
   ```
3. O JSON retornado é convertido em formato `.env` (chave=valor)
4. O arquivo `.env` é passado ao `docker-compose` via `env_file`
5. A aplicação Node lê as variáveis via `process.env` (dotenv)

## Preencher valores manualmente

Após o deploy do stack, acesse o [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/) e edite o secret `prompt-optimizer/app-secrets` para substituir os placeholders:

| Chave | Descrição |
|-------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini (https://aistudio.google.com/apikey) |
| `ADMIN_EMAIL` | E-mail do administrador inicial |
| `ADMIN_PASSWORD` | Senha do administrador inicial |
| `JWT_SECRET` | Segredo para assinatura de tokens JWT |

## Atualizar a aplicação na EC2

Conecte via SSH e execute:

```bash
cd /home/ubuntu/app
git fetch origin
git checkout main
git pull origin main
docker-compose down
docker-compose up -d --build app
```

O `.env` é recriado a cada deploy? Não — ele foi gerado apenas no primeiro boot. Para recarregar os segredos após alterar no Secrets Manager:

```bash
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
aws secretsmanager get-secret-value --secret-id prompt-optimizer/app-secrets --region "$REGION" --query SecretString --output text | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env
docker-compose down && docker-compose up -d --build app
```
