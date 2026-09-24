# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
# Comandos do projeto. Requer Python 3.11+ e Node 20+ (apenas para os testes do site).
.PHONY: dados dados-forcar publicar-dados servir test test-pipeline test-site pacote

# Anos do Censo processados (2007 é o primeiro no layout harmonizado do INEP).
ANOS ?= 2007-2025

dados: ## Coleta no INEP, extrai, processa e publica os ANOS em site/dados (reaproveita o que já existe)
	rm -rf site/dados
	python3 -m pipeline tudo --anos $(ANOS)

dados-forcar: ## Como "dados", mas reprocessa a camada prata de todos os ANOS (após mudar o pipeline)
	rm -rf site/dados
	python3 -m pipeline tudo --anos $(ANOS) --forcar

publicar-dados: ## Só refaz a camada ouro (site/dados) a partir de dados/processados
	rm -rf site/dados
	python3 -m pipeline publicar

servir: ## Serve o site em http://localhost:8000 (módulos ES e fetch não funcionam via file://)
	python3 -m http.server 8000 --directory site

test: test-pipeline test-site ## Executa todos os testes

test-pipeline:
	python3 -m unittest discover -s tests/pipeline -t . -v

test-site:
	node --test "tests/site/*.test.js"

# --- Publicação -------------------------------------------------------------
# Tag do release do GitHub que guarda o pacote de dados (ver .github/workflows/publicar.yml).
TAG_DADOS ?= dados-2025

pacote: ## Gera dist/site (pronto para Netlify/Cloudflare) e dist/sieerj-dados.zip (para o release do GitHub)
	test -f site/dados/indice.json || (echo "Rode 'make dados' antes: site/dados/indice.json não existe" && exit 1)
	rm -rf dist && mkdir -p dist
	cp -r site dist/site
	cd site && python3 -m zipfile -c ../dist/sieerj-dados.zip dados/
	@echo "dist/site pronto para upload; dist/sieerj-dados.zip pronto para o release $(TAG_DADOS)"
