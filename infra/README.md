# Infraestrutura AWS - Prompt Optimizer

## Template do prompt otimizado

O template está em `src/App.jsx` (função `buildOptimizedPrompt`). Regras:
- Só incluir campos que o usuário respondeu; respostas passadas verbatim; não variar por nível de conhecimento.
- Estrutura: Solicitação original → Detalhes adicionais (Label: valor) → Instruções adicionais (quando Sim) → Fontes/Segurança → Instruções finais.

## Arquitetura

- **ALB** (`prompt-optimizer-project`): Application Load Balancer internet-facing, expõe a aplicação na porta 80.
- **EC2**: Instância única registrada como target no ALB.
- **Acesso**: Use a URL do ALB (ex: `http://prompt-optimizer-project-xxx.elb.region.amazonaws.com`) — sem custo de domínio nem Route 53.

## Parâmetros obrigatórios

- **SubnetId**: Subnet pública para a EC2.
- **SubnetId2**: Segunda subnet pública (outra AZ) para o ALB. O ALB exige 2 subnets em zonas de disponibilidade diferentes.


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

## Preencher .env manualmente (sem Secrets Manager)

Se o Secrets Manager não estiver configurado, use o template:

```bash
cd /home/ubuntu/app
cp .env.template .env
nano .env
```

Preencha `GEMINI_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `JWT_SECRET`. Salve (Ctrl+O, Enter) e saia (Ctrl+X). Depois:

```bash
docker-compose down && docker-compose up -d --build app
```

## Atualizar a aplicação na EC2

```bash
cd /home/ubuntu/app
git fetch origin
git checkout main
git pull origin main
docker-compose down
docker-compose up -d --build app
```

## Recarregar segredos do Secrets Manager

Se alterou os valores no Secrets Manager:

```bash
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
aws secretsmanager get-secret-value --secret-id prompt-optimizer/app-secrets --region "$REGION" --query SecretString --output text | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env
docker-compose down && docker-compose up -d --build app
```
