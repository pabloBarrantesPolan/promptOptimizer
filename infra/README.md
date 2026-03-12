# Infraestrutura AWS - Prompt Optimizer

## Secrets Manager

O template principal `cloudformation.yml` (na raiz do projeto) inclui o recurso Secrets Manager com a estrutura esperada pela aplicação.

### Preencher valores manualmente

Após o deploy do stack, acesse o [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/) e edite o secret `prompt-optimizer/app-secrets` para substituir os placeholders:

| Chave | Descrição |
|-------|-----------|
| `GEMINI_API_KEY` | Chave da API Google Gemini (https://aistudio.google.com/apikey) |
| `ADMIN_EMAIL` | E-mail do administrador inicial |
| `ADMIN_PASSWORD` | Senha do administrador inicial |
| `JWT_SECRET` | Segredo para assinatura de tokens JWT |

### Uso na aplicação

A instância EC2 possui permissão IAM para ler o secret. O UserData do CloudFormation pode ser estendido para buscar os valores e passá-los ao `docker-compose` via variáveis de ambiente.
