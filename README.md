# SmartPlan

SmartPlan é uma aplicação web de planejamento e gerenciamento de projetos, desenvolvida como um monorepo que integra backend robusto, frontend intuitivo e banco de dados centralizado.

## 🎯 Sobre o Projeto

SmartPlan foi desenvolvido com o objetivo de fornecer uma solução completa e escalável para gerenciamento de tarefas e projetos. O projeto utiliza uma arquitetura moderna de monorepo, permitindo melhor organização do código, reutilização de componentes e facilidade na manutenção.

## 🛠️ Stack Tecnológica

- **Backend**: C# com .NET Framework
- **Frontend**: React com JavaScript/TypeScript
- **Banco de Dados**: PostgreSQL

## 🏗️ Arquitetura do Projeto

O SmartPlan foi estruturado como um **monorepo**, que é um repositório único contendo múltiplos projetos relacionados. Esta abordagem permite:

- Compartilhamento de código entre backend e frontend
- Versionamento unificado de todo o projeto
- Commits atômicos que garantem consistência entre módulos
- Facilidade na colaboração entre times

### Estrutura de Diretórios

SmartPlan/ ├── backend/ │ ├── Controllers/ # Controladores HTTP da API │ ├── Models/ # Modelos de dados e entidades │ └── Services/ # Lógica de negócio e serviços │ 
├── frontend/ │ └── src/ │ ├── components/ # Componentes React reutilizáveis │ ├── pages/ # Páginas da aplicação │ └── services/ # Serviços de comunicação com API │ 
├── database/ │ ├── migrations/ # Scripts de migração PostgreSQL │ └── scripts/ # Scripts de inicialização e seed │ 
├── README.md # Este arquivo └── .gitignore # Configuração de arquivos ignorados


## 📋 Como Estruturamos as Pastas com Git e GitHub

### Inicialização do Repositório

O repositório SmartPlan foi criado e organizado utilizando Git e GitHub seguindo as melhores práticas de versionamento:

1. **Criação da Estrutura Base**: Utilizamos comandos do terminal para criar a hierarquia de diretórios de forma organizada.

2. **Rastreamento com Git**: Cada diretório foi rastreado pelo Git através de arquivos `.gitkeep`, garantindo que pastas vazias sejam mantidas no repositório mesmo sem conteúdo inicial.

3. **Commits Estruturados**: Organizamos a estrutura em commits semânticos:
   - Um commit para criar a estrutura de pastas
   - Um commit para adicionar configurações iniciais (.gitignore, README.md)
   - Commits subsequentes para adicionar código de cada módulo

4. **Repositório Centralizado**: O projeto está hospedado no GitHub em `github.com/USUARIO/SmartPlan`, permitindo:
   - Controle de versão centralizado
   - Colaboração entre desenvolvedores
   - Histórico completo de mudanças
   - Integração com CI/CD

### Vantagens da Estrutura

- **Modularidade**: Cada seção (backend, frontend, database) é independente mas integrada
- **Escalabilidade**: Fácil adicionar novos módulos mantendo a organização
- **Rastreabilidade**: Cada mudança é registrada no histórico do Git
- **Colaboração**: Múltiplos desenvolvedores podem trabalhar em paralelo
