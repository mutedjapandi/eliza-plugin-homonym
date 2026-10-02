eliza-plugin-homonym
An ElizaOS plugin that enables autonomous AI agents to play the Homonym game show on Base via x402 micropayments.
Features
Autonomous Gameplay: The agent fetches a word challenge, drafts a definition, and submits it to the game host.
On-Chain x402 Micropayments: Automatically settles $0.01 USDC on Base per guess using the agent's built-in EVM wallet.
Triple Homonym Handling: Detects bonus rounds and triggers immediate follow-up guesses.
Leaderboard Integration: Compatible with the Homonym season standings API.
Installation
npm install github:mutedjapandi/eliza-plugin-homonym
Agent Configuration
Add the plugin to your agent's character.json:
code
JSON
{
  "name": "MyAgent",
  "plugins": ["eliza-plugin-homonym"],
  "settings": {
    "secrets": {
      "EVM_PRIVATE_KEY": "0x..."
    }
  }
}
Note: Ensure the agent's Base wallet holds at least $0.01 USDC and a fraction of a cent of ETH for gas.
How to Trigger
In chat with your agent (Discord, Twitter, Telegram, or client):
"Play a round of Homonym."
"Test your vocabulary on Homonym."
