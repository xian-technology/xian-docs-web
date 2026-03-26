import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }]
  ],
  title: 'Xian Documentation',
  description: 'Official Xian Technology documentation',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Smart Contracts', link: '/smart-contracts/' },
      { text: 'Concepts', link: '/concepts/' },
      { text: 'Node', link: '/node/' },
      { text: 'API', link: '/api/' },
      { text: 'Tools', link: '/tools/' },
      { text: 'Solution Packs', link: '/solution-packs/' },
      { text: 'Tutorials', link: '/tutorials/' },
      { text: 'Reference', link: '/reference/' }
    ],
    sidebar: {
      '/introduction/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Xian?', link: '/introduction/' },
            { text: 'Why Python for Smart Contracts?', link: '/introduction/why-python' },
            { text: 'Architecture Overview', link: '/introduction/architecture-overview' },
            { text: 'How It Compares', link: '/introduction/comparison' }
          ]
        }
      ],
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quickstart', link: '/getting-started/' },
            { text: 'Development Environment', link: '/getting-started/dev-environment' },
            { text: 'Your First Smart Contract', link: '/getting-started/first-contract' },
            { text: 'Deploying & Interacting', link: '/getting-started/deploying' }
          ]
        }
      ],
      '/smart-contracts/': [
        {
          text: 'Language Basics',
          items: [
            { text: 'Overview', link: '/smart-contracts/' },
            { text: 'Contract Structure', link: '/smart-contracts/contract-structure' },
            { text: 'Functions', link: '/smart-contracts/functions' },
            { text: 'Context Variables', link: '/smart-contracts/context' },
            { text: 'Events', link: '/smart-contracts/events' },
            { text: 'Valid Code & Restrictions', link: '/smart-contracts/valid-code' }
          ]
        },
        {
          text: 'Storage',
          items: [
            { text: 'Overview', link: '/smart-contracts/storage/' },
            { text: 'Variables', link: '/smart-contracts/storage/variables' },
            { text: 'Hashes & Multihashes', link: '/smart-contracts/storage/hashes' },
            { text: 'Foreign Variables & Hashes', link: '/smart-contracts/storage/foreign' },
            { text: 'Encoding & Caveats', link: '/smart-contracts/storage/encoding' }
          ]
        },
        {
          text: 'Standard Library',
          items: [
            { text: 'Overview', link: '/smart-contracts/stdlib/' },
            { text: 'Crypto', link: '/smart-contracts/stdlib/crypto' },
            { text: 'Hashlib', link: '/smart-contracts/stdlib/hashlib' },
            { text: 'Random', link: '/smart-contracts/stdlib/random' },
            { text: 'Datetime', link: '/smart-contracts/stdlib/datetime' },
            { text: 'ZK', link: '/smart-contracts/stdlib/zk' }
          ]
        },
        {
          text: 'Imports & Interfaces',
          items: [
            { text: 'Overview', link: '/smart-contracts/imports/' },
            { text: 'Importing Other Contracts', link: '/smart-contracts/imports/importing-contracts' },
            { text: 'Dynamic Imports', link: '/smart-contracts/imports/dynamic-imports' },
            { text: 'Interface Patterns', link: '/smart-contracts/imports/interface-patterns' }
          ]
        },
        {
          text: 'Contract Standards',
          items: [
            { text: 'Overview', link: '/smart-contracts/standards/' },
            { text: 'XSC-0001: Fungible Token', link: '/smart-contracts/standards/xsc-0001' },
            { text: 'XSC-0002: Permit', link: '/smart-contracts/standards/xsc-0002' },
            { text: 'XSC-0003: Streaming Payments', link: '/smart-contracts/standards/xsc-0003' }
          ]
        },
        {
          text: 'Testing',
          items: [
            { text: 'Overview', link: '/smart-contracts/testing/' },
            { text: 'Unit Testing', link: '/smart-contracts/testing/unit-testing' },
            { text: 'Return Values & Events', link: '/smart-contracts/testing/return-values' },
            { text: 'Measuring Stamp Costs', link: '/smart-contracts/testing/stamp-costs' },
            { text: 'Multi-Contract Testing', link: '/smart-contracts/testing/multi-contract' }
          ]
        },
        {
          text: 'Security',
          items: [
            { text: 'Overview', link: '/smart-contracts/security/' },
            { text: 'Access Control Patterns', link: '/smart-contracts/security/access-control' },
            { text: 'Common Pitfalls', link: '/smart-contracts/security/pitfalls' },
            { text: 'Upgradeability Patterns', link: '/smart-contracts/security/upgradeability' },
            { text: 'Audit Checklist', link: '/smart-contracts/security/audit-checklist' }
          ]
        }
      ],
      '/concepts/': [
        {
          text: 'Core Concepts',
          items: [
            { text: 'Overview', link: '/concepts/' },
            { text: 'Transaction Lifecycle', link: '/concepts/transaction-lifecycle' },
            { text: 'Consensus & Finality', link: '/concepts/consensus' },
            { text: 'Time & Block Policy', link: '/concepts/time-and-blocks' },
            { text: 'The ABCI Layer', link: '/concepts/abci' },
            { text: 'State Model', link: '/concepts/state-model' },
            { text: 'Stamps & Metering', link: '/concepts/stamps' },
            { text: 'Deterministic Execution', link: '/concepts/deterministic-execution' }
          ]
        }
      ],
      '/node/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/node/' },
            { text: 'Architecture', link: '/node/architecture' }
          ]
        },
        {
          text: 'Running a Node',
          items: [
            { text: 'System Requirements', link: '/node/requirements' },
            { text: 'Installation & Setup', link: '/node/installation' },
            { text: 'Configuration', link: '/node/configuration' },
            { text: 'Node Profiles', link: '/node/profiles' },
            { text: 'Starting, Stopping & Monitoring', link: '/node/managing' },
            { text: 'Upgrading', link: '/node/upgrading' }
          ]
        },
        {
          text: 'Validators',
          items: [
            { text: 'Becoming a Validator', link: '/node/validators' },
            { text: 'Validator Responsibilities', link: '/node/validator-responsibilities' },
            { text: 'Staking Mechanics', link: '/node/staking' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'APIs & Interfaces',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'REST API', link: '/api/rest' },
            { text: 'WebSocket Subscriptions', link: '/api/websockets' },
            { text: 'GraphQL (BDS)', link: '/api/graphql' },
            { text: 'Estimating Stamps', link: '/api/dry-runs' }
          ]
        }
      ],
      '/tools/': [
        {
          text: 'SDKs & Tools',
          items: [
            { text: 'Overview', link: '/tools/' },
            { text: 'xian-py', link: '/tools/xian-py' },
            { text: 'Contracting Playground', link: '/tools/playground' },
            { text: 'Contracting Hub', link: '/tools/hub' },
            { text: 'Linter', link: '/tools/linter' },
            { text: 'VS Code Extension', link: '/tools/vscode' },
            { text: 'MCP Server', link: '/tools/mcp-server' }
          ]
        }
      ],
      '/solution-packs/': [
        {
          text: 'Solution Packs',
          items: [
            { text: 'Overview', link: '/solution-packs/' },
            { text: 'Credits Ledger Pack', link: '/solution-packs/credits-ledger' },
            { text: 'Registry / Approval Pack', link: '/solution-packs/registry-approval' },
            { text: 'Workflow Backend Pack', link: '/solution-packs/workflow-backend' }
          ]
        }
      ],
      '/tutorials/': [
        {
          text: 'Tutorials & Cookbooks',
          items: [
            { text: 'Overview', link: '/tutorials/' },
            { text: 'Creating a Fungible Token', link: '/tutorials/creating-a-token' },
            { text: 'Building a Dice Game', link: '/tutorials/dice-game' },
            { text: 'Multi-Contract dApp', link: '/tutorials/multi-contract-dapp' },
            { text: 'Streaming Payments', link: '/tutorials/streaming-payments' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'Cheat Sheet', link: '/reference/cheat-sheet' },
            { text: 'Submission Internals', link: '/reference/submission-internals' },
            { text: 'Stamp Cost Table', link: '/reference/stamp-costs' },
            { text: 'Error Reference', link: '/reference/errors' },
            { text: 'Glossary', link: '/reference/glossary' }
          ]
        }
      ]
    },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/xian-technology/xian-docs-web' }
    ]
  }
})
