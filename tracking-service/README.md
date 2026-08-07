# Tracking Service

Serviço de rastreamento automático para o Módulo 360° utilizando BootsTAPIR (Apache 2.0).

## Deploy (Modal)

```bash
pip install modal
modal setup
modal deploy app.py
```

Anote a URL gerada e configure no painel do sistema no arquivo `.env` como `VITE_TRACKING_ENDPOINT`.
