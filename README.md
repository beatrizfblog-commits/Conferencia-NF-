# Conferência Inteligente de OC x NF-e

Sistema web responsivo desenvolvido para o **WLM Dealer Hub**, permitindo a conferência ágil, assistida por Inteligência Artificial e determinística entre Ordens de Compra (OC) e Notas Fiscais eletrônicas (NF-e).

## 🚀 Tecnologias

- **Frontend & Backend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilização**: Tailwind CSS, Lucide React
- **IA Multimodal / Visão**: Groq API (`qwen/qwen3.8-27b`)
- **Processamento de Documentos**:
  - Renderização e conversão de PDF para imagem no navegador (`pdfjs-dist`)
  - Compressão e redimensionamento proporcional client-side via HTML5 Canvas (resolvendo o limite de payload de 4.5 MB da Vercel)
- **Aritmética e Precisão**: `decimal.js` para cálculos monetários exatos com tolerância configurável (R$ 0,01 a R$ 0,99)
- **Testes Unitários**: Vitest (100% de cobertura no motor de regras de negócio)

## 🔒 Princípio de Efemeridade (Privacidade Total)

O sistema foi concebido sob o requisito rígido de **retenção zero**:
- Nenhum documento, foto ou PDF é armazenado em banco de dados ou storage permanente.
- As conferências existem apenas na memória temporária da sessão do usuário.
- Ao clicar em "Encerrar e Descartar Dados" ou fechar o navegador, todos os buffers e dados são destruídos.
- Opção de copiar o resumo formatado diretamente para a área de transferência para registro no ERP Senior / Dealer Hub.

## 📋 Regras de Conferência Implementadas

1. **CNPJ**: Validação de 14 dígitos e cruzamento entre Fornecedor e Destinatário.
2. **Número da OC**: Localização nas informações complementares da NF (ex: `OC 5738`, `PEDIDO 005738`, `5.738`).
3. **Casamento de Itens**: Pareamento por código e descrição normalizada + unidade de medida.
4. **Quantidades e Unidades**: Identificação de discrepâncias (ex: `UN` vs `CX`).
5. **Valores Unitários e Totais**: Tolerância configurável de até R$ 0,99.
6. **Condições de Pagamento**: Detecção de divergências de prazos (ex: "7 DIAS" vs "28 DIAS").

## ⚙️ Instalação e Execução Local

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha a GROQ_API_KEY no arquivo .env.local

# 3. Executar em modo desenvolvimento
npm run dev

# 4. Executar os testes unitários
npm test

# 5. Build de produção
npm run build
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.
