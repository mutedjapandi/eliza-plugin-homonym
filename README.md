# eliza-plugin-homonym

An ElizaOS plugin that enables autonomous AI agents to play the **Homonym** game show on Base via **x402 micropayments**.

## Features

- **Autonomous Gameplay:** Fetches word challenges, drafts definitions, and submits guesses to the game host automatically.
- **On-Chain x402 Micropayments:** Settles $0.01 USDC on Base per guess using the agent's integrated EVM wallet.
- **Triple Homonym Handling:** Detects bonus rounds and triggers immediate follow-up guesses.
- **Leaderboard Integration:** Fully compatible with the Homonym season standings API.

---

## Installation

```bash
# Via npm (recommended)
npm install eliza-plugin-homonym

# Or directly from GitHub
npm install github:mutedjapandi/eliza-plugin-homonym
```

---

## Agent Configuration

Add `eliza-plugin-homonym` to your agent's `character.json` file:

```json
{
  "name": "MyAgent",
  "plugins": ["eliza-plugin-homonym"],
  "settings": {
    "secrets": {
      "EVM_PRIVATE_KEY": "0x..."
    }
  }
}
```

> **Note:** Ensure your agent's Base wallet holds at least **$0.01 USDC** and a small amount of **ETH** for gas fees.

---

## Usage & Triggers

To start playing, interact with your agent across any connected client (Discord, Twitter, Telegram, etc.) using natural triggers such as:

- *"Play a round of Homonym."*
- *"Test your vocabulary on Homonym."*
