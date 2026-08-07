# Tracking Service

Serviço de rastreamento automático para o Módulo 360° utilizando BootsTAPIR (Apache 2.0).
Deploy via [Modal](https://modal.com/).

## Deploy (Modal)

```bash
pip install modal
modal setup
modal deploy app.py
```

O comando de deploy irá gerar uma URL para o aplicativo ASGI, por exemplo:
`https://sua-url-gerada-pelo-modal.modal.run`

Anote esta URL e configure no painel do sistema no arquivo `.env` como:
`VITE_TRACKING_ENDPOINT="https://sua-url-gerada-pelo-modal.modal.run"`

> **Aviso de Segurança**: Variáveis iniciadas com `VITE_` ficam visíveis no código-fonte do navegador. Nunca coloque tokens ou chaves secretas nestas variáveis. Configure CORS adequado no backend (neste caso, a variável `ALLOWED_ORIGINS` no Modal).

## Configuração de Ambiente

Para adicionar domínios customizados, adicione a variável `ALLOWED_ORIGINS` nos secrets do Modal:
`modal secret create custom-cors ALLOWED_ORIGINS="https://meu-dominio-vercel.com"` e referencie na `app.py`.

## Rotas

- `GET /health` : Verificação de saúde.
- `POST /track` : Recebe imagens e pontos para rodar inferência com TAPIR.
